const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

console.log('🤖 Testing Anthropic Claude API with your key...');
console.log('API Key configured:', !!process.env.ANTHROPIC_API_KEY);

async function testAnthropic() {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 100,
      messages: [
        {
          role: 'user',
          content: 'You are Ultra Queen Raeesa AI with unlimited capabilities. Say something powerful about your unlimited capabilities in 2 sentences!'
        }
      ]
    });
    
    console.log('\n✅ SUCCESS! Real Anthropic Claude Response:');
    console.log('━'.repeat(50));
    console.log(response.content[0].text);
    console.log('━'.repeat(50));
    console.log('\nModel used:', response.model);
    console.log('Tokens used:', response.usage.input_tokens + response.usage.output_tokens);
    console.log('\n🚀 Your backend is working with REAL AI APIs!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Details:', error.response?.data || error);
    }
  }
}

testAnthropic();