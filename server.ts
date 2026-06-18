import express from "express";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Middleware
app.use(express.json({ limit: "20mb" }));

// File upload setup
const upload = multer({ dest: "uploads/" });

// -------------------------
// GEMINI SETUP
// -------------------------
if (!process.env.GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY is missing in environment variables");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// -------------------------
// PAYMENT VERIFICATION API
// -------------------------
app.post("/api/analyze-receipt", upload.single("image"), async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "No image uploaded" });
    }

    const { paymentMethod, paymentNumber, expectedAmount } = req.body;

    // Read image as base64
    const imageBase64 = fs.readFileSync(file.path, {
      encoding: "base64",
    });

    // Clean up the uploaded temporary file from disk immediately
    try {
      fs.unlinkSync(file.path);
    } catch (err) {
      console.error("Failed to delete temp file:", err);
    }

    // Gemini model
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
    });

    const prompt = `
You are a payment verification system.

Extract the following from this payment receipt image:

1. transactionId (transaction/reference ID)
2. amount (numeric value only)
3. receiverInfo (name, phone, or wallet ID)

Context:
- Expected Payment Method: ${paymentMethod || "eSewa"}
- Expected Receiver Number: ${paymentNumber || "9822531607"}
- Expected Amount: ${expectedAmount || "unknown"}

Return ONLY valid JSON:
{
  "transactionId": "",
  "amount": "",
  "receiverInfo": ""
}
`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: imageBase64,
          mimeType: file.mimetype,
        },
      },
    ]);

    const text = result.response.text();

    // Clean response (important)
    const cleaned = text.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (err) {
      console.error("JSON Parse Error:", cleaned);
      return res.status(500).json({
        error: "Failed to parse Gemini response",
        raw: cleaned,
      });
    }

    // Optional Verification Check
    const isValid =
      parsed.amount === expectedAmount &&
      parsed.receiverInfo?.includes(paymentNumber);

    res.json({
      success: true,
      data: parsed,
      verified: isValid,
    });
  } catch (error: any) {
    console.error("Server Error:", error.message);
    res.status(500).json({
      error: error.message || "Something went wrong",
    });
  }
});

// -------------------------
// VITE + STATIC BUILD SERVING
// -------------------------
const distPath = path.join(process.cwd(), "dist");
const hasDist = fs.existsSync(path.join(distPath, "index.html"));

async function startServer() {
  if (process.env.NODE_ENV !== "production" && !hasDist) {
    console.log("Running in DEV mode with Vite...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });

    app.use(vite.middlewares);
  } else {
    console.log("Running in PROD mode...");
    app.use(express.static(distPath));

    app.get("*", (_, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
