import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';

const app = express();
app.use(cors());
app.use(express.json());

// Initialize AI clients with your actual API keys
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Status endpoint to check which APIs are available
app.get('/api/status', (req, res) => {
  res.json({
    openai: !!process.env.OPENAI_API_KEY,
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    perplexity: !!process.env.PERPLEXITY_API_KEY,
    mistral: !!process.env.MISTRAL_API_KEY,
    message: 'Ultra Queen AI Server Running'
  });
});

// Main chat endpoint that actually uses the AI APIs
app.post('/api/chat', async (req, res) => {
  const { message, provider = 'auto' } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: 'Message required' });
  }
  
  try {
    let response;
    
    // AUTO mode - try providers in order
    if (provider === 'auto' || provider === 'openai') {
      if (process.env.OPENAI_API_KEY) {
        try {
          const completion = await openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [
              { role: 'system', content: 'You are Ultra Queen AI, a powerful assistant for Queen Raeesa.' },
              { role: 'user', content: message }
            ],
            temperature: 0.7,
            max_tokens: 1000
          });
          response = {
            provider: 'openai',
            text: completion.choices[0].message.content
          };
        } catch (e) {
          console.log('OpenAI failed:', e.message);
        }
      }
    }
    
    if (!response && (provider === 'auto' || provider === 'anthropic')) {
      if (process.env.ANTHROPIC_API_KEY) {
        try {
          const completion = await anthropic.messages.create({
            model: 'claude-3-opus-20240229',
            max_tokens: 1000,
            messages: [
              { role: 'user', content: message }
            ]
          });
          response = {
            provider: 'anthropic',
            text: completion.content[0].text
          };
        } catch (e) {
          console.log('Anthropic failed:', e.message);
        }
      }
    }
    
    if (!response && (provider === 'auto' || provider === 'perplexity')) {
      if (process.env.PERPLEXITY_API_KEY) {
        try {
          const perplexityResponse = await axios.post(
            'https://api.perplexity.ai/chat/completions',
            {
              model: 'pplx-70b-online',
              messages: [
                { role: 'system', content: 'You are Ultra Queen AI assistant.' },
                { role: 'user', content: message }
              ]
            },
            {
              headers: {
                'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
                'Content-Type': 'application/json'
              }
            }
          );
          response = {
            provider: 'perplexity',
            text: perplexityResponse.data.choices[0].message.content
          };
        } catch (e) {
          console.log('Perplexity failed:', e.message);
        }
      }
    }
    
    if (!response && (provider === 'auto' || provider === 'mistral')) {
      if (process.env.MISTRAL_API_KEY) {
        try {
          const mistralResponse = await axios.post(
            'https://api.mistral.ai/v1/chat/completions',
            {
              model: 'mistral-large-latest',
              messages: [
                { role: 'user', content: message }
              ]
            },
            {
              headers: {
                'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
                'Content-Type': 'application/json'
              }
            }
          );
          response = {
            provider: 'mistral',
            text: mistralResponse.data.choices[0].message.content
          };
        } catch (e) {
          console.log('Mistral failed:', e.message);
        }
      }
    }
    
    // Quantum mode - combine responses from multiple providers
    if (provider === 'quantum') {
      const providers = [];
      
      // Try to get responses from all available providers
      const promises = [];
      
      if (process.env.OPENAI_API_KEY) {
        promises.push(
          openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [{ role: 'user', content: message }],
            max_tokens: 500
          }).then(r => ({ provider: 'OpenAI', text: r.choices[0].message.content }))
          .catch(() => null)
        );
      }
      
      if (process.env.ANTHROPIC_API_KEY) {
        promises.push(
          anthropic.messages.create({
            model: 'claude-3-opus-20240229',
            max_tokens: 500,
            messages: [{ role: 'user', content: message }]
          }).then(r => ({ provider: 'Claude', text: r.content[0].text }))
          .catch(() => null)
        );
      }
      
      const results = await Promise.all(promises);
      const validResults = results.filter(r => r !== null);
      
      if (validResults.length > 0) {
        const quantumResponse = `⚛️ QUANTUM MODE - Multiple AI Perspectives:\n\n` +
          validResults.map(r => `[${r.provider}]:\n${r.text}`).join('\n\n---\n\n');
        
        response = {
          provider: 'quantum',
          text: quantumResponse
        };
      }
    }
    
    if (response) {
      res.json(response);
    } else {
      res.status(503).json({
        error: 'No AI providers available. Please check your API keys.',
        availableKeys: {
          openai: !!process.env.OPENAI_API_KEY,
          anthropic: !!process.env.ANTHROPIC_API_KEY,
          perplexity: !!process.env.PERPLEXITY_API_KEY,
          mistral: !!process.env.MISTRAL_API_KEY
        }
      });
    }
    
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// Serve a simple HTML interface
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Ultra Queen AI</title>
    <style>
        body {
            background: linear-gradient(135deg, #0a0a0a, #1a1a2e);
            color: white;
            font-family: Arial;
            padding: 20px;
        }
        h1 { color: #FFD700; text-align: center; }
        .container {
            max-width: 800px;
            margin: 0 auto;
        }
        .status {
            background: rgba(255,255,255,0.1);
            padding: 10px;
            border-radius: 5px;
            margin: 20px 0;
        }
        input, select, button {
            width: 100%;
            padding: 10px;
            margin: 5px 0;
            background: rgba(255,255,255,0.1);
            border: 1px solid #FFD700;
            color: white;
            border-radius: 5px;
        }
        button {
            background: #FFD700;
            color: black;
            font-weight: bold;
            cursor: pointer;
        }
        #response {
            background: rgba(255,255,255,0.05);
            padding: 15px;
            border-radius: 5px;
            margin-top: 20px;
            min-height: 100px;
        }
        .loading { color: #FFD700; }
        option { background: #1a1a2e; }
    </style>
</head>
<body>
    <div class="container">
        <h1>👑 Ultra Queen AI System</h1>
        <div class="status" id="status">Checking API status...</div>
        
        <select id="provider">
            <option value="auto">🤖 Auto-Select</option>
            <option value="openai">🧠 OpenAI GPT-4</option>
            <option value="anthropic">🎭 Anthropic Claude</option>
            <option value="perplexity">🌐 Perplexity</option>
            <option value="mistral">🚀 Mistral</option>
            <option value="quantum">⚛️ Quantum Mode</option>
        </select>
        
        <input type="text" id="message" placeholder="Enter your message..." />
        <button onclick="sendMessage()">Send Message</button>
        
        <div id="response"></div>
    </div>
    
    <script>
        // Check status on load
        fetch('/api/status')
            .then(r => r.json())
            .then(data => {
                const apis = [];
                if (data.openai) apis.push('✅ OpenAI');
                if (data.anthropic) apis.push('✅ Anthropic');
                if (data.perplexity) apis.push('✅ Perplexity');
                if (data.mistral) apis.push('✅ Mistral');
                
                document.getElementById('status').innerHTML = 
                    'Available APIs: ' + (apis.length ? apis.join(', ') : '❌ No APIs configured');
            })
            .catch(e => {
                document.getElementById('status').innerHTML = '❌ Server not responding';
            });
        
        async function sendMessage() {
            const message = document.getElementById('message').value;
            const provider = document.getElementById('provider').value;
            const responseDiv = document.getElementById('response');
            
            if (!message) return;
            
            responseDiv.innerHTML = '<span class="loading">Processing...</span>';
            
            try {
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message, provider })
                });
                
                const data = await response.json();
                
                if (data.error) {
                    responseDiv.innerHTML = '❌ Error: ' + data.error;
                } else {
                    responseDiv.innerHTML = 
                        '<strong>[' + data.provider.toUpperCase() + ']</strong><br><br>' + 
                        data.text.replace(/\\n/g, '<br>');
                }
            } catch (e) {
                responseDiv.innerHTML = '❌ Failed to connect to server';
            }
        }
        
        // Enter to send
        document.getElementById('message').addEventListener('keypress', e => {
            if (e.key === 'Enter') sendMessage();
        });
    </script>
</body>
</html>
  `);
});

const PORT = 5000; // Replit requires port 5000 for web apps
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Ultra Queen AI Server running on port ${PORT}`);
  console.log(`Available APIs:`);
  console.log(`- OpenAI: ${process.env.OPENAI_API_KEY ? '✅' : '❌'}`);
  console.log(`- Anthropic: ${process.env.ANTHROPIC_API_KEY ? '✅' : '❌'}`);
  console.log(`- Perplexity: ${process.env.PERPLEXITY_API_KEY ? '✅' : '❌'}`);
  console.log(`- Mistral: ${process.env.MISTRAL_API_KEY ? '✅' : '❌'}`);
});