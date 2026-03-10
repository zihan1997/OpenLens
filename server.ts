import express from "express";
import { createServer as createViteServer } from "vite";
import fetch from "node-fetch";
import { Ollama } from "ollama";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Ollama Cloud / SDK Endpoint
  app.post("/api/translate/ollama-cloud", async (req, res) => {
    const { text, model, systemPrompt, host } = req.body;
    
    const ollama = new Ollama({
      host: host || "https://ollama.com",
      headers: {
        Authorization: "Bearer " + process.env.OLLAMA_API_KEY,
      },
    });

    try {
      const response = await ollama.chat({
        model: model || "minimax",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Text: ${text}` }
        ],
        stream: false, // For simplicity in this endpoint, but could be streamed
      });

      res.json({ content: response.message.content });
    } catch (error: any) {
      console.error("Ollama Cloud error:", error);
      res.status(500).json({ error: error.message || "Ollama Cloud request failed" });
    }
  });

  // Ollama Cloud Streaming Endpoint
  app.post("/api/translate/ollama-cloud/stream", async (req, res) => {
    const { text, model, systemPrompt, host } = req.body;
    
    const ollama = new Ollama({
      host: host || "https://ollama.com",
      headers: {
        Authorization: "Bearer " + process.env.OLLAMA_API_KEY,
      },
    });

    try {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Transfer-Encoding', 'chunked');

      const response = await ollama.chat({
        model: model || "minimax",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Text: ${text}` }
        ],
        stream: true,
      });

      for await (const part of response) {
        res.write(part.message.content);
      }
      res.end();
    } catch (error: any) {
      console.error("Ollama Cloud Streaming error:", error);
      res.status(500).end(error.message || "Ollama Cloud streaming failed");
    }
  });

  // Health check for proxy (used by frontend to check cloud host reachability)
  app.get("/api/proxy/health", (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: "URL is required" });
    
    fetch(url as string)
      .then(r => res.status(r.status).json({ status: r.statusText }))
      .catch(e => res.status(500).json({ error: e.message }));
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile("dist/index.html", { root: "." });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
