// Initialize GitHub repo with README for government deployment
import { getUncachableGitHubClient } from './server/github-setup.js';

const REPO_OWNER = 'finalboss787';
const REPO_NAME = 'dha-digital-services';

async function initializeRepo() {
  console.log('🚨 INITIALIZING GITHUB REPO FOR GOVERNMENT DEADLINE...');
  
  try {
    const octokit = await getUncachableGitHubClient();
    
    // Create initial README
    const readmeContent = `# DHA Digital Services Platform

Military-grade AI system for South African Department of Home Affairs with comprehensive document generation capabilities.

## Features
- 32+ Document Types (All 23 official DHA types)
- PDF Generation with Security Features
- AI Assistant (OpenAI GPT-5)
- Real-time Monitoring
- Military-grade Security
- WebSocket Integration

## Deployment
Ready for Railway deployment with all configurations included.

## Environment
Production-ready with PostgreSQL, Express, React, and Node.js.
`;

    await octokit.rest.repos.createOrUpdateFileContents({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: 'README.md',
      message: 'Initial commit - DHA Digital Services Platform for Government',
      content: Buffer.from(readmeContent).toString('base64'),
    });

    console.log('✅ Repository initialized with README');

    // Now add package.json
    const packageJson = JSON.parse(require('fs').readFileSync('package.json', 'utf8'));
    await octokit.rest.repos.createOrUpdateFileContents({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: 'package.json',
      message: 'Add package.json for deployment',
      content: Buffer.from(JSON.stringify(packageJson, null, 2)).toString('base64'),
    });

    console.log('✅ package.json added');

    // Add critical deployment files
    const deploymentFiles = [
      { path: 'Dockerfile', file: 'Dockerfile' },
      { path: 'railway.json', file: 'railway.json' },
      { path: '.env.example', file: '.env.example' }
    ];

    for (const deployFile of deploymentFiles) {
      const content = require('fs').readFileSync(deployFile.file, 'utf8');
      await octokit.rest.repos.createOrUpdateFileContents({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        path: deployFile.path,
        message: `Add ${deployFile.path} for deployment`,
        content: Buffer.from(content).toString('base64'),
      });
      console.log(`✅ ${deployFile.path} added`);
    }

    console.log('🚀 REPOSITORY READY FOR RAILWAY DEPLOYMENT!');
    console.log(`📁 Repository: https://github.com/${REPO_OWNER}/${REPO_NAME}`);
    
  } catch (error) {
    console.error('❌ Failed to initialize repository:', error);
    throw error;
  }
}

initializeRepo().catch(console.error);