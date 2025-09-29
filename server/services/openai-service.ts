import OpenAI from 'openai';

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: 'https://api.openai.com/v1'
});

export class OpenAIService {
  async generateResponse(prompt: string, systemPrompt?: string): Promise<string> {
    try {
      const messages: any[] = [];
      
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      messages.push({ role: 'user', content: prompt });

      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview', // Using latest available model
        messages,
        max_tokens: 4096,
        temperature: 0.7
      });

      return response.choices[0].message.content || '';
    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw new Error('Failed to generate AI response');
    }
  }

  async generateImage(prompt: string): Promise<string> {
    try {
      const response = await openai.images.generate({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size: '1024x1024',
        quality: 'hd',
        style: 'natural'
      });

      return response.data?.[0]?.url || '';
    } catch (error) {
      console.error('DALL-E Error:', error);
      throw new Error('Failed to generate image');
    }
  }

  async analyzeImage(base64Image: string): Promise<string> {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this image and provide detailed description'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 2048
      });

      return response.choices[0].message.content || '';
    } catch (error) {
      console.error('Vision API Error:', error);
      throw new Error('Failed to analyze image');
    }
  }

  async transcribeAudio(audioBuffer: Buffer): Promise<string> {
    try {
      // Convert Buffer to Blob for File constructor
      const blob = new Blob([audioBuffer as any], { type: 'audio/mp3' });
      const file = new File([blob], 'audio.mp3', { type: 'audio/mp3' });
      const transcription = await openai.audio.transcriptions.create({
        file,
        model: 'whisper-1'
      });
      return transcription.text;
    } catch (error) {
      console.error('Whisper Error:', error);
      throw new Error('Failed to transcribe audio');
    }
  }
}

export const openAIService = new OpenAIService();