const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 5000;

// Serve static files from root directory
app.use(express.static(__dirname, {
  maxAge: '0',
  etag: true
}));

// Serve index.html for root route
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('DHA Document Generator not found');
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ DHA Document Generator server running on http://localhost:${PORT}`);
  console.log('📄 Open your browser and navigate to the URL above');
});