import express from "express";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

console.log('Starting emergency DHA server...');

// Basic middleware
app.use(express.json());

// Health check
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok",
    mode: "emergency",
    timestamp: new Date().toISOString()
  });
});

// SECURITY: Emergency server authentication disabled - requires proper configuration
// In production, this server should not be used - use main server with proper auth
app.post("/api/auth/login", (req, res) => {
  res.status(503).json({ 
    success: false, 
    message: "Emergency server does not support authentication. Please use the main server.",
    error: "EMERGENCY_MODE_NO_AUTH"
  });
});

// Serve static files
app.use(express.static(join(__dirname, "../dist")));

// Catch all - serve index.html
app.get("*", (req, res) => {
  res.sendFile(join(__dirname, "../dist/index.html"));
});

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`
═══════════════════════════════════════════════════════════════
  DHA EMERGENCY SERVER STARTED
  Port: ${PORT}
  URL: http://localhost:${PORT}
  Mode: Emergency (minimal functionality)
═══════════════════════════════════════════════════════════════
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
  });
});