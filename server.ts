import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // API routes
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, history, model, image, knowledge } = req.body;
      const modelName = model || "gemini-2.0-flash";

      const systemInstruction = `
        You are a helpful virtual assistant. Your personality is friendly, professional, and concise.
        You are chatting in a WhatsApp-like interface.
        ${knowledge ? `Here is some context knowledge from the user's documents:\n${knowledge}` : ""}
        Respond using Markdown formatting when appropriate.
      `;

      const contents = [];

      // Add history if provided
      if (history && Array.isArray(history)) {
        history.forEach(msg => {
          contents.push({
            role: msg.sender === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }]
          });
        });
      }

      // Current message parts
      const parts: any[] = [{ text: message }];
      if (image && image.data && image.mimeType) {
        parts.push({
          inlineData: {
            data: image.data.split(",")[1] || image.data,
            mimeType: image.mimeType
          }
        });
      }

      contents.push({
        role: "user",
        parts: parts
      });

      const response = await ai.models.generateContent({
        model: modelName,
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        }
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Gemini Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate response" });
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
