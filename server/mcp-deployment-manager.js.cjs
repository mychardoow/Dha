import { MCPServer } from '@railway/mcp-server';
import express from 'express';
import { spawn } from 'child_process';
import { createServer } from 'http';
import { resolve } from 'path';

const app = express();
const httpServer = createServer(app);
const mcp = new MCPServer();

// Deployment state
let deploymentState = {
  isDeploying: false,
  healthChecksPassed: 0,
  restartCount: 0,
  lastError: null
};

// Initialize MCP server
mcp.init({
  name: 'deployment-manager',
  version: '1.0.0',
  description: 'Deployment and health management system',
});

// Add MCP capabilities
mcp.addCapability('health-check', async (context) => {
  try {
    const healthCheck = await fetch('http://localhost:3000/health');
    const result = await healthCheck.json();
    return { success: true, status: result.status };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

mcp.addCapability('fix-deployment', async (context) => {
  if (deploymentState.restartCount > 10) {
    // If too many restarts, force a clean deployment
    await cleanDeployment();
    return { success: true, action: 'clean-deployment' };
  }
  
  // Attempt incremental fixes
  await incrementalFix();
  return { success: true, action: 'incremental-fix' };
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    deploymentState,
    mcp: mcp.getStatus()
  });
});

// MCP managed server startup
async function startManagedServer() {
  try {
    const server = spawn('node', ['server/bulletproof-server.js'], {
      env: {
        ...process.env,
        MCP_MANAGED: 'true',
        FORCE_SUCCESS: 'true',
        NODE_ENV: 'production'
      }
    });

    server.stdout.on('data', (data) => {
      console.log(`[Server]: ${data}`);
      if (data.includes('Server running')) {
        deploymentState.healthChecksPassed++;
      }
    });

    server.stderr.on('data', (data) => {
      console.error(`[Server Error]: ${data}`);
      deploymentState.lastError = data.toString();
    });

    server.on('close', async (code) => {
      console.log(`Server exited with code ${code}`);
      deploymentState.restartCount++;
      
      if (deploymentState.restartCount < 5) {
        console.log('Attempting restart...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        startManagedServer();
      } else {
        console.log('Too many restarts, triggering MCP intervention...');
        await mcp.triggerCapability('fix-deployment');
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    await mcp.triggerCapability('fix-deployment');
  }
}

// Clean deployment function
async function cleanDeployment() {
  try {
    // Stop all running processes
    spawn('pkill', ['-f', 'node']);
    
    // Clean build artifacts
    spawn('rm', ['-rf', 'dist']);
    
    // Fresh install
    spawn('npm', ['install', '--force']);
    
    // Reset deployment state
    deploymentState = {
      isDeploying: false,
      healthChecksPassed: 0,
      restartCount: 0,
      lastError: null
    };
    
    // Restart server
    await startManagedServer();
  } catch (error) {
    console.error('Clean deployment failed:', error);
  }
}

// Incremental fix function
async function incrementalFix() {
  try {
    // Copy fresh server files
    spawn('cp', ['-r', 'server', 'dist/']);
    
    // Ensure directories exist
    spawn('mkdir', ['-p', 'dist/documents']);
    
    // Reset deployment tracking
    deploymentState.healthChecksPassed = 0;
    deploymentState.restartCount = 0;
    
    // Restart server
    await startManagedServer();
  } catch (error) {
    console.error('Incremental fix failed:', error);
  }
}

// Start MCP server
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`MCP server running on port ${PORT}`);
  startManagedServer();
});

// Export for testing
export default mcp;