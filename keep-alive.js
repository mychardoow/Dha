
// Simple keep-alive script - run this from another service or locally
const keepAlive = async () => {
  try {
    const response = await fetch('https://your-repl-name.your-username.repl.co/keep-alive');
    console.log('Keep-alive ping:', response.status);
  } catch (error) {
    console.error('Keep-alive failed:', error);
  }
};

// Ping every 5 minutes
setInterval(keepAlive, 5 * 60 * 1000);
