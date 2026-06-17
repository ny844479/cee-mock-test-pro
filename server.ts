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

      // Remove the data URI prefix if present
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

      const prompt = `
Analyze this payment receipt screenshot and extract key fields for verification.

Context for Verification:
- Expected Payment Method: "${paymentMethod || 'eSewa'}"
- Expected Receiver Wallet/Merchant: "${paymentNumber || '9822531607'}" (Standard recipient owner: Nikhil Kumar Yadav / Nikhil Yadav)
- Expected Amount to verify: Rs. ${expectedAmount || 'unknown'}

Please inspect the receipt image carefully to locate:
1. The Transaction ID, Ref ID, or Transaction Code (often a mix of letters and numbers or numeric string).
2. The total paid amount or transferred amount.
3. The recipient/receiver name, wallet number, merchant name, or receiver information.

Extract this information and return it strictly in JSON format.
If you cannot find a certain field, set it to an empty string.
Do not include any Markdown styling (like \`\`\`json) or extra text. Return ONLY raw JSON.

{
  "transactionId": "...", // The transaction code/ID/Ref ID
  "amount": "...", // The number only (e.g. "100" from "Rs. 100")
  "receiverInfo": "..." // The name, phone number, or merchant label of the person receiving the money
}
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          prompt,
          {
            inlineData: {
              data: base64Data,
              mimeType: "image/jpeg",
            },
          },
        ],
        config: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      });

      let jsonStr = response.text || "{}";
      const result = JSON.parse(jsonStr);
      res.json(result);
    } catch (error: any) {
      console.error("Gemini API error:", error);
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
