import express from 'express';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const app = express();
const port = 5001; // Using different port to avoid conflicts

// Import the documents routes the same way as main server
const documentRoutes = require('./server/routes/documents.js.cjs');

// Basic middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount routes
app.use('/api/documents', documentRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    routes: {
      documents: '/api/documents'
    }
  });
});

// Start server
app.listen(port, () => {
  console.log(`✅ Test server running on port ${port}`);
  console.log(`🏥 Health check: http://localhost:${port}/health`);
  console.log(`📄 Documents API: http://localhost:${port}/api/documents`);
});