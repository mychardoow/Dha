import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Serve static files
app.use(express.static(__dirname));

// Serve index.html on root
app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log('✅ DHA Documents Server is Running!');
    console.log(`📍 Server running at http://0.0.0.0:${PORT}`);
    console.log('🎯 Your 11 documents are ready to download!');
    console.log('📄 Just click the buttons to download PDFs');
});