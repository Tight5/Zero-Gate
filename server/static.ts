import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function serveStatic(app: express.Express) {
  const clientPath = path.resolve(__dirname, "../client");
  
  // Serve static files from client directory
  app.use(express.static(clientPath));
  
  // Catch-all handler for SPA routing
  app.get("*", (req, res) => {
    // Skip API routes
    if (req.path.startsWith("/api/")) {
      return res.status(404).json({ error: "API endpoint not found" });
    }
    
    // Serve index.html for all other routes
    res.sendFile(path.join(clientPath, "index.html"));
  });
}