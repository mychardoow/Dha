import express from "express";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Basic middleware
app.use(express.json());
app.use(express.static(join(__dirname, "../dist")));

// Health check
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    database: "Not configured - running in-memory mode"
  });
});

// Basic auth endpoint (in-memory)
const users = new Map();
users.set("admin", { username: "admin", password: "admin123", role: "admin" });
users.set("user", { username: "user", password: "password123", role: "user" });

app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  const user = users.get(username);
  
  if (user && user.password === password) {
    res.json({ 
      success: true, 
      user: { username: user.username, role: user.role },
      message: "Login successful (in-memory mode)"
    });
  } else {
    res.status(401).json({ 
      success: false, 
      message: "Invalid credentials" 
    });
  }
});

// Serve the frontend for all non-API routes
app.get("*", (req, res) => {
  res.sendFile(join(__dirname, "../dist/index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║           DHA Digital Services Platform                    ║
║                 SIMPLE MODE (No Database)                  ║
╠════════════════════════════════════════════════════════════╣
║  Server Status: ✅ RUNNING                                 ║
║  Port: ${PORT}                                                ║
║  Mode: In-Memory (No Database)                            ║
║  URL: http://localhost:${PORT}                                ║
╠════════════════════════════════════════════════════════════╣
║  Default Credentials:                                      ║
║  • Admin: admin / admin123                                ║
║  • User: user / password123                               ║
╠════════════════════════════════════════════════════════════╣
║  Note: Running in simplified mode without database.        ║
║  Data will not persist between restarts.                   ║
╚════════════════════════════════════════════════════════════╝
  `);
});