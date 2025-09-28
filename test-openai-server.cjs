const express = require('express');
const OpenAI = require('openai');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Initialize OpenAI with your API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.get('/test', (req, res) => {
  res.json({ 
    status: 'Server running',
    openaiKey: process.env.OPENAI_API_KEY ? '✅ Configured' : '❌ Missing'
  });
});

app.post('/test-ai', async (req, res) => {
  try {
    const { prompt = "Say hello in one sentence!" } = req.body;
    
    console.log('🤖 Testing OpenAI with prompt:', prompt);
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 100,
      temperature: 0.7
    });
    
    const response = completion.choices[0].message.content;
    console.log('✅ OpenAI Response:', response);
    
    res.json({
      success: true,
      model: "gpt-4o-mini",
      response: response,
      usage: completion.usage
    });
  } catch (error) {
    console.error('❌ OpenAI Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.response?.data || 'No additional details'
    });
  }
});

const PORT = 5001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
🧪 TEST SERVER RUNNING
📍 Port: ${PORT}
🔗 Test endpoint: http://localhost:${PORT}/test
🤖 AI test: http://localhost:${PORT}/test-ai
🔑 OpenAI Key: ${process.env.OPENAI_API_KEY ? '✅ Found' : '❌ Missing'}
  `);
});