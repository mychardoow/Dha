import { config } from 'dotenv';
import { join } from 'path';

// Load test environment variables
config({ path: join(process.cwd(), '.env.test') });

// Import and start the server
import('./index.js').then(({ app, server }) => {
  console.log('🧪 Test server started');
});