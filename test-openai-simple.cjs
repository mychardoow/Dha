const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID
});

console.log('🤖 Testing OpenAI API with your key...');
console.log('API Key configured:', !!process.env.OPENAI_API_KEY);
console.log('Organization ID configured:', !!process.env.OPENAI_ORG_ID);

async function testOpenAI() {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are Ultra Queen Raeesa AI with unlimited capabilities.'
        },
        {
          role: 'user', 
          content: 'Say something powerful about your unlimited capabilities in 2 sentences!'
        }
      ],
      max_tokens: 100,
      temperature: 0.7
    });
    
    console.log('\n✅ SUCCESS! Real OpenAI Response:');
    console.log('━'.repeat(50));
    console.log(completion.choices[0].message.content);
    console.log('━'.repeat(50));
    console.log('\nModel used:', completion.model);
    console.log('Tokens used:', completion.usage.total_tokens);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Details:', error.response.data);
    }
  }
}

testOpenAI();