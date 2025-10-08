#!/usr/bin/env tsx

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import ultraQueenAIRoutes from './routes/ultra-queen-ai.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);

console.log('🚀 ULTRA QUEEN AI SERVER STARTING...');
console.log('👑 Queen Raeesa Ultra AI Platform');

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../client/dist')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'operational',
    service: 'Ultra Queen AI',
    timestamp: new Date().toISOString()
  });
});

// Mount Ultra Queen AI routes
app.use('/api/ultra-queen-ai', ultraQueenAIRoutes);

// Basic auth for testing
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'admin123') {
    res.json({
      success: true,
      token: 'ultra-admin-token',
      user: { id: 'admin-001', username: 'admin', role: 'admin' }
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running at http://0.0.0.0:${PORT}`);
  console.log(`🎯 Ultra Queen AI at http://0.0.0.0:${PORT}/ultra-queen-ai`);
  console.log('\n📊 API KEYS STATUS:');
  console.log(`  OpenAI: ${process.env.OPENAI_API_KEY ? '✅ Configured' : '❌ Missing'}`);
  console.log(`  Mistral: ${process.env.MISTRAL_API_KEY ? '✅ Configured' : '❌ Missing'}`);
  console.log(`  Anthropic: ${process.env.ANTHROPIC_API_KEY ? '✅ Configured' : '❌ Missing'}`);
  console.log(`  Perplexity: ${process.env.PERPLEXITY_API_KEY ? '✅ Configured' : '❌ Missing'}`);
});