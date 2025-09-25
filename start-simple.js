
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

console.log('🆘 EMERGENCY DHA SERVICES STARTING...');
console.log('👑 Queen Raeesa Ultra AI Platform');
console.log('🇿🇦 Department of Home Affairs Digital Services');

// Basic middleware
app.use(express.json());
app.use(express.static(join(__dirname, 'client/dist')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'Emergency Mode Active',
    service: 'DHA Digital Services',
    queen: 'Raeesa Ultra AI Ready',
    timestamp: new Date().toISOString()
  });
});

// Basic API endpoints
app.get('/api/status', (req, res) => {
  res.json({
    status: 'EMERGENCY DEPLOYMENT ACTIVE',
    message: 'Queen Raeesa DHA Services Online',
    services: ['AI Assistant', 'Document Generation', 'Security'],
    deployment: 'Emergency Mode - Stable',
    timestamp: new Date().toISOString()
  });
});

// Catch-all for SPA
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(join(__dirname, 'client/dist/index.html'));
  } else {
    res.status(404).json({ error: 'API endpoint not found' });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('🚀 EMERGENCY SERVER ACTIVE');
  console.log('🌐 DHA Platform Available');
  console.log(`📡 Server running on port ${PORT}`);
  console.log('✅ Emergency deployment successful');
  console.log('');
  console.log('👑 Queen Raeesa Ultra AI Services Ready');
  console.log('🇿🇦 Department of Home Affairs - Emergency Mode');
});
