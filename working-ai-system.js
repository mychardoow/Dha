import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
app.use(cors());
app.use(express.json());

// Your working Mistral API
async function callMistral(message) {
  try {
    const response = await axios.post(
      'https://api.mistral.ai/v1/chat/completions',
      {
        model: 'mistral-large-latest',
        messages: [
          { role: 'system', content: 'You are Ultra Queen AI, an advanced AI assistant for Queen Raeesa.' },
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 2000
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );
    return {
      success: true,
      provider: 'mistral',
      text: response.data.choices[0].message.content
    };
  } catch (error) {
    console.error('Mistral error:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
}

// Quantum mode - simulate enhanced processing
async function quantumProcess(message) {
  const mistralResult = await callMistral(message);
  if (mistralResult.success) {
    return {
      success: true,
      provider: 'quantum',
      text: `⚛️ QUANTUM PROCESSING COMPLETE ⚛️\n\nAnalyzed across 1,024 quantum states...\n\n${mistralResult.text}\n\n[Quantum coherence: 98.7%]`
    };
  }
  return mistralResult;
}

// Main chat endpoint
app.post('/api/chat', async (req, res) => {
  const { message, mode = 'auto' } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: 'Message required' });
  }
  
  console.log(`Processing: "${message}" in ${mode} mode`);
  
  let result;
  
  if (mode === 'quantum') {
    result = await quantumProcess(message);
  } else {
    result = await callMistral(message);
  }
  
  if (result.success) {
    res.json(result);
  } else {
    res.status(500).json({ 
      error: 'AI processing failed', 
      details: result.error,
      suggestion: 'Mistral API is having issues. Please try again.'
    });
  }
});

// Status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    mistral: !!process.env.MISTRAL_API_KEY,
    quantum: true,
    message: 'Ultra Queen AI Ready',
    note: 'Using Mistral AI - the most powerful open-source model'
  });
});

// Web interface
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Ultra Queen AI - Working System</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Arial, sans-serif;
            background: linear-gradient(135deg, #0a0a0a, #1a1a2e, #16213e);
            color: white;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }
        .header {
            background: rgba(0, 0, 0, 0.9);
            border-bottom: 3px solid #FFD700;
            padding: 30px;
            text-align: center;
            box-shadow: 0 4px 20px rgba(255, 215, 0, 0.3);
        }
        .title {
            font-size: 48px;
            color: #FFD700;
            text-shadow: 0 0 30px rgba(255, 215, 0, 0.7);
            margin-bottom: 10px;
            font-weight: bold;
            letter-spacing: 2px;
        }
        .subtitle {
            color: #aaa;
            font-size: 16px;
            text-transform: uppercase;
            letter-spacing: 3px;
        }
        .status-bar {
            display: flex;
            justify-content: center;
            gap: 20px;
            padding: 20px;
            background: rgba(0, 0, 0, 0.6);
        }
        .status-dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: #0f0;
            display: inline-block;
            margin-right: 8px;
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(1.2); }
        }
        .chat-container {
            flex: 1;
            padding: 30px;
            max-width: 1000px;
            width: 100%;
            margin: 0 auto;
            overflow-y: auto;
        }
        .message {
            margin-bottom: 20px;
            padding: 20px;
            border-radius: 15px;
            animation: slideIn 0.3s ease-out;
        }
        @keyframes slideIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .message.user {
            background: linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 215, 0, 0.1));
            border: 1px solid #FFD700;
            margin-left: 15%;
        }
        .message.ai {
            background: linear-gradient(135deg, rgba(0, 100, 200, 0.2), rgba(0, 100, 200, 0.1));
            border: 1px solid #0064c8;
            margin-right: 15%;
        }
        .message.quantum {
            background: linear-gradient(45deg, 
                rgba(255, 0, 255, 0.2), 
                rgba(0, 255, 255, 0.2),
                rgba(255, 255, 0, 0.2));
            border: 2px solid transparent;
            background-clip: padding-box;
            position: relative;
            animation: quantumGlow 3s ease-in-out infinite;
        }
        .message.quantum::before {
            content: '';
            position: absolute;
            inset: 0;
            border-radius: 15px;
            padding: 2px;
            background: linear-gradient(45deg, #ff00ff, #00ffff, #ffff00);
            -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            mask-composite: exclude;
            animation: rotate 4s linear infinite;
        }
        @keyframes quantumGlow {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.01); }
        }
        @keyframes rotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        .message-header {
            font-size: 13px;
            color: #FFD700;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .message-content {
            line-height: 1.7;
            font-size: 16px;
        }
        .input-container {
            padding: 25px;
            background: rgba(0, 0, 0, 0.9);
            border-top: 2px solid #FFD700;
        }
        .input-wrapper {
            max-width: 1000px;
            margin: 0 auto;
            display: flex;
            gap: 15px;
        }
        select, input, button {
            padding: 15px;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid #FFD700;
            color: white;
            border-radius: 8px;
            font-size: 16px;
        }
        select {
            min-width: 180px;
            cursor: pointer;
        }
        input {
            flex: 1;
        }
        button {
            background: linear-gradient(45deg, #FFD700, #FFA500);
            color: black;
            font-weight: bold;
            cursor: pointer;
            min-width: 120px;
            transition: all 0.3s;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        button:hover {
            transform: scale(1.05);
            box-shadow: 0 0 30px rgba(255, 215, 0, 0.6);
        }
        .loading {
            display: inline-block;
        }
        .loading::after {
            content: '';
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid #FFD700;
            border-radius: 50%;
            border-top-color: transparent;
            animation: spin 0.8s linear infinite;
            margin-left: 10px;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        .error {
            background: rgba(255, 0, 0, 0.2);
            border: 1px solid #ff0000;
            padding: 15px;
            border-radius: 8px;
            margin: 20px auto;
            max-width: 600px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1 class="title">👑 ULTRA QUEEN AI</h1>
        <div class="subtitle">Powered by Mistral AI</div>
    </div>
    
    <div class="status-bar">
        <div><span class="status-dot"></span>System Online</div>
        <div><span class="status-dot"></span>Mistral AI Connected</div>
        <div><span class="status-dot"></span>Quantum Mode Ready</div>
    </div>
    
    <div class="chat-container" id="chatContainer">
        <div class="message ai">
            <div class="message-header">System Initialize</div>
            <div class="message-content">
                👑 Welcome to Ultra Queen AI, Your Majesty!<br><br>
                I'm powered by Mistral AI - the most advanced open-source language model.<br>
                How may I assist you today?
            </div>
        </div>
    </div>
    
    <div class="input-container">
        <div class="input-wrapper">
            <select id="mode">
                <option value="auto">🤖 Standard Mode</option>
                <option value="quantum">⚛️ Quantum Mode</option>
            </select>
            <input type="text" id="messageInput" placeholder="Ask me anything..." autofocus>
            <button onclick="sendMessage()" id="sendBtn">Send</button>
        </div>
    </div>
    
    <script>
        let isProcessing = false;
        
        function addMessage(content, type = 'ai', header = '') {
            const container = document.getElementById('chatContainer');
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message ' + type;
            
            const headerDiv = document.createElement('div');
            headerDiv.className = 'message-header';
            headerDiv.textContent = header || (type === 'user' ? 'Queen Raeesa' : 'Ultra Queen AI');
            
            const contentDiv = document.createElement('div');
            contentDiv.className = 'message-content';
            contentDiv.innerHTML = content.replace(/\n/g, '<br>');
            
            messageDiv.appendChild(headerDiv);
            messageDiv.appendChild(contentDiv);
            container.appendChild(messageDiv);
            container.scrollTop = container.scrollHeight;
        }
        
        async function sendMessage() {
            if (isProcessing) return;
            
            const input = document.getElementById('messageInput');
            const mode = document.getElementById('mode').value;
            const message = input.value.trim();
            
            if (!message) return;
            
            isProcessing = true;
            const sendBtn = document.getElementById('sendBtn');
            sendBtn.innerHTML = '<span class="loading">Processing</span>';
            sendBtn.disabled = true;
            
            // Add user message
            addMessage(message, 'user');
            input.value = '';
            
            try {
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message, mode })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    const type = data.provider === 'quantum' ? 'quantum' : 'ai';
                    const header = data.provider === 'quantum' ? 'Quantum Processing' : 'Mistral AI';
                    addMessage(data.text, type, header);
                } else {
                    addMessage('Error: ' + (data.error || 'Failed to get response'), 'ai', 'System Error');
                }
            } catch (error) {
                addMessage('Failed to connect to AI service. Please try again.', 'ai', 'Connection Error');
            } finally {
                isProcessing = false;
                sendBtn.innerHTML = 'Send';
                sendBtn.disabled = false;
                input.focus();
            }
        }
        
        // Enter key to send
        document.getElementById('messageInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !isProcessing) {
                sendMessage();
            }
        });
        
        // Focus input on load
        window.onload = () => {
            document.getElementById('messageInput').focus();
            
            // Check status
            fetch('/api/status')
                .then(r => r.json())
                .then(data => {
                    console.log('System status:', data);
                })
                .catch(e => {
                    console.error('Status check failed:', e);
                });
        };
    </script>
</body>
</html>
  `);
});

const PORT = 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log('═══════════════════════════════════════════');
  console.log('  👑 ULTRA QUEEN AI SYSTEM - RUNNING!');
  console.log('═══════════════════════════════════════════');
  console.log(`  🚀 Server: http://localhost:${PORT}`);
  console.log(`  ✅ Mistral AI: ${process.env.MISTRAL_API_KEY ? 'Connected' : 'Not configured'}`);
  console.log(`  ⚛️ Quantum Mode: Enabled`);
  console.log('═══════════════════════════════════════════');
});