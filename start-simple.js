
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
    const indexPath = join(__dirname, 'client/dist/index.html');
    const fs = require('fs');
    
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      // Fallback HTML when build doesn't exist
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>DHA Emergency Portal</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
            .container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 30px; }
            .status { padding: 20px; background: #e8f5e8; border-left: 4px solid #4caf50; margin: 20px 0; }
            .api-test { padding: 20px; background: #f0f8ff; border-left: 4px solid #2196f3; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🇿🇦 Department of Home Affairs</h1>
              <h2>Emergency Portal Active</h2>
            </div>
            
            <div class="status">
              <h3>✅ System Status: ONLINE</h3>
              <p>Emergency DHA services are operational</p>
              <p>Server running on port 5000</p>
            </div>
            
            <div class="api-test">
              <h3>🔧 API Test</h3>
              <p>Health Check: <a href="/api/health" target="_blank">/api/health</a></p>
              <p>Status Check: <a href="/api/status" target="_blank">/api/status</a></p>
            </div>
            
            <script>
              // Test API connectivity
              fetch('/api/health')
                .then(r => r.json())
                .then(data => {
                  console.log('✅ API Health Check:', data);
                  document.body.insertAdjacentHTML('beforeend', 
                    '<div style="padding: 10px; background: #e8f5e8; margin: 10px 0; border-radius: 4px;">✅ API Connected: ' + data.status + '</div>'
                  );
                })
                .catch(err => {
                  console.error('❌ API Error:', err);
                  document.body.insertAdjacentHTML('beforeend', 
                    '<div style="padding: 10px; background: #ffe8e8; margin: 10px 0; border-radius: 4px;">❌ API Error: ' + err.message + '</div>'
                  );
                });
            </script>
          </div>
        </body>
        </html>
      `);
    }
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
