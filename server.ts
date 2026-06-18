import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "20mb" }));

  app.post("/api/analyze-receipt", async (req, res) => {
    try {
      const { imageBase64, paymentMethod, paymentNumber, expectedAmount } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: "No image provided" });
      }

      // Detect original mimeType from the Data URL prefix
      let mimeType = "image/jpeg"; // default fallback
      const mimeMatch = imageBase64.match(/^data:(image\/\w+);base64,/);
      if (mimeMatch) {
        mimeType = mimeMatch[1];
      }

      // Remove the data URI prefix if present
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

      const prompt = `
Analyze this payment receipt screenshot and extract key fields for verification.

Context for Verification:
- Expected Payment Method: "${paymentMethod || 'eSewa'}"
- Expected Receiver Wallet/Merchant: "${paymentNumber || '9822531607'}" (Standard recipient owner: Nikhil Kumar Yadav / Nikhil Yadav)
- Expected Amount to verify: Rs. ${expectedAmount || 'unknown'}

Please inspect the receipt image carefully to locate:
1. The Transaction ID, Ref ID, or Transaction Code (often a mix of letters and numbers or numeric string). If present, return it exactly.
2. The total paid amount or transferred amount (extract the numeric portion as cleanly as possible).
3. The recipient/receiver name, wallet number, merchant name, or receiver information.

Extract this information and return it strictly matching the requested JSON structure.
      `;

      let response;
      try {
        response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: [
            prompt,
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType,
              },
            },
          ],
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                transactionId: { 
                  type: "STRING",
                  description: "The transaction code, ID, Ref ID, or transaction sequence string found on the receipt."
                },
                amount: { 
                  type: "STRING", 
                  description: "The total paid amount or transfer amount as a clean numeric string (unformatted or formatted)."
                },
                receiverInfo: { 
                  type: "STRING",
                  description: "The name, nickname, phone, or merchant identifier showing who received the payment."
                }
              },
              required: ["transactionId", "amount", "receiverInfo"]
            },
            temperature: 0.1,
          },
        });
      } catch (primaryErr: any) {
        console.warn("Primary model gemini-3.5-flash failed or was overloaded. Falling back to gemini-2.5-flash. Error details:", primaryErr.message || primaryErr);
        response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [
            prompt,
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType,
              },
            },
          ],
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                transactionId: { 
                  type: "STRING",
                  description: "The transaction code, ID, Ref ID, or transaction sequence string found on the receipt."
                },
                amount: { 
                  type: "STRING", 
                  description: "The total paid amount or transfer amount as a clean numeric string (unformatted or formatted)."
                },
                receiverInfo: { 
                  type: "STRING",
                  description: "The name, nickname, phone, or merchant identifier showing who received the payment."
                }
              },
              required: ["transactionId", "amount", "receiverInfo"]
            },
            temperature: 0.1,
          },
        });
      }

      let jsonStr = response.text || "{}";
      
      // Clean up markdown block headers if any slip through in edge cases
      if (jsonStr.includes("```")) {
        jsonStr = jsonStr.replace(/```json/g, "").replace(/```/g, "").trim();
      }

      const result = JSON.parse(jsonStr);
      res.json(result);
    } catch (error: any) {
      console.warn("Gemini API error during receipt analysis:", error.message || error);
      res.status(500).json({ error: error.message || "Failed to analyze receipt" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
