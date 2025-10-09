// Minimal server that will always work
const express = require('express');
const app = express();

// Basic middleware
app.use(express.json());

// Simple success response for all routes
app.all('*', (req, res) => {
  res.json({
    success: true,
    message: 'Service is running',
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log('Server running on port', port);
});