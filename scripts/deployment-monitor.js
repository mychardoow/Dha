const fs = require('fs');
const path = require('path');

function logBuildStep(step, status, details = '') {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${step}: ${status}\n${details}\n`;
  
  fs.appendFileSync(path.join(__dirname, '../deployment.log'), logEntry);
  console.log(logEntry);
}

process.on('unhandledRejection', (error) => {
  logBuildStep('ERROR', 'Unhandled Rejection', error.stack);
});

module.exports = {
  logBuildStep
};