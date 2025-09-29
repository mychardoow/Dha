const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  console.log(`🚀 DHA Digital Services Platform running on ${HOST}:${PORT}`);
  console.log(`🌐 Access URL: https://${process.env.REPL_SLUG || 'your-repl'}.${process.env.REPL_OWNER || 'username'}.repl.co`);