const OpenAI = require('openai');

console.log('🔧 Testing OpenAI with your configured secrets...\n');

// Test with different organization field names
const configs = [
  { name: 'With organization field', config: { apiKey: process.env.OPENAI_API_KEY, organization: process.env.OPENAI_ORG_ID }},
  { name: 'Without organization', config: { apiKey: process.env.OPENAI_API_KEY }},
  { name: 'With defaultHeaders', config: { 
    apiKey: process.env.OPENAI_API_KEY,
    defaultHeaders: { 'OpenAI-Organization': process.env.OPENAI_ORG_ID }
  }}
];

async function testConfig(name, config) {
  console.log(`Testing: ${name}`);
  try {
    const openai = new OpenAI(config);
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are Ultra Queen Raeesa AI with unlimited capabilities.'
        },
        {
          role: 'user', 
          content: 'Say "Hello, I am Ultra Queen Raeesa AI!" in exactly those words.'
        }
      ],
      max_tokens: 50,
      temperature: 0
    });
    
    console.log(`✅ SUCCESS with ${name}!`);
    console.log('Response:', completion.choices[0].message.content);
    console.log('Model:', completion.model);
    return true;
    
  } catch (error) {
    console.log(`❌ Failed: ${error.message}\n`);
    return false;
  }
}

async function runTests() {
  for (const { name, config } of configs) {
    const success = await testConfig(name, config);
    if (success) {
      console.log('\n🎉 OPENAI API IS WORKING!\n');
      break;
    }
  }
}

runTests();