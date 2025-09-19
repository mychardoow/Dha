import express from "express";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());

// Simple health endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    message: "Server is running in simplified mode for preview"
  });
});

// Simple document types endpoint
app.get("/api/documents/types", (req, res) => {
  res.json({
    success: true,
    documentTypes: [
      { id: "id_card", name: "Smart ID Card", category: "identity" },
      { id: "passport", name: "Passport", category: "travel" },
      { id: "birth_certificate", name: "Birth Certificate", category: "civic" }
    ]
  });
});

// Simple preview endpoint
app.post("/api/documents/generate", (req, res) => {
  const { documentType } = req.body;
  res.json({
    success: true,
    message: `Document generation for ${documentType} would happen here`,
    previewMode: true
  });
});

(async () => {
  const server = app;
  
  // Setup Vite for development
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  
  const port = parseInt(process.env.PORT || '5000', 10);
  
  app.listen(port, "0.0.0.0", () => {
    log(`🚀 Simplified server running on port ${port}`);
    log(`✅ Preview functionality available at http://localhost:${port}`);
  });
})();