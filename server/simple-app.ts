import express from 'express';
import { registerRoutes } from './routes';
import path from 'path';
import { fileURLToPath } from 'url';
import './services/setup-services'; // Initialize all services

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS for development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Register all routes
registerRoutes(app);

// Serve static files from client dist
const clientDistPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

// Serve index.html for all non-API routes (SPA support)
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 DHA Digital Services Platform`);
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📄 All 23 document types ready`);
  console.log(`🤖 AI Assistant with 3 bot modes active`);
  console.log(`🔒 Preview mode: Auto-authenticated as admin`);
  console.log(`\nNavigate to http://localhost:${PORT} to start using the system!`);
});

// Error handling
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});