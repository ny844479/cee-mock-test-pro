import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import fs from "fs";

dotenv.config();

// Lazily initialize representation of GoogleGenAI or handle it cleanly.
let aiInstance: GoogleGenAI | null = null;
function getGenAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not defined on the server side.");
    }
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

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

      // Perform the vision generation call with robust multiple attempts & backoff to naturally absorb transient 503 spikes.
      const generateWithRetry = async (attempt: number = 1): Promise<any> => {
        const maxAttempts = 6;
        const modelsToTry = [
          "gemini-3.5-flash",
          "gemini-3.1-flash-lite",
          "gemini-flash-latest"
        ];
        const modelName = modelsToTry[(attempt - 1) % modelsToTry.length];
        
        try {
          const aiClient = getGenAI();
          return await aiClient.models.generateContent({
            model: modelName,
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
        } catch (err: any) {
          if (attempt < maxAttempts) {
            const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
            console.log(`[Status info] Gemini call via ${modelName} deferred. Retrying next attempt in ${delay.toFixed(0)}ms (Attempt ${attempt}/${maxAttempts}). Error text: ${err.message || err}`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return generateWithRetry(attempt + 1);
          }
          throw err;
        }
      };

      const response = await generateWithRetry(1);

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

  // Serve built SPA static files if dist/index.html exists (production fallback for environments like Render where NODE_ENV may not be defined)
  const distPath = path.join(process.cwd(), 'dist');
  const hasDist = fs.existsSync(path.join(distPath, 'index.html'));

  if (process.env.NODE_ENV !== "production" && !hasDist) {
    console.log("Starting in development mode with Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log(`Starting in production mode. Serving static files from ${distPath}`);
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
