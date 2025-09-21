// Emergency GitHub push for government deadline
import { getUncachableGitHubClient } from './server/github-setup.js';
import fs from 'fs';
import path from 'path';

const REPO_OWNER = 'finalboss787';
const REPO_NAME = 'dha-digital-services';

async function pushAllFiles() {
  console.log('🚨 EMERGENCY GOVERNMENT DEPLOYMENT - Pushing to GitHub...');
  
  try {
    const octokit = await getUncachableGitHubClient();
    console.log('✅ GitHub authenticated');

    // Get the current commit SHA
    let latestSha;
    try {
      const { data: ref } = await octokit.rest.git.getRef({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        ref: 'heads/main'
      });
      latestSha = ref.object.sha;
      console.log(`✅ Latest commit SHA: ${latestSha}`);
    } catch (error) {
      console.log('No main branch yet, will create it');
    }

    // Create a new blob for key files
    const files = [
      { path: 'package.json', content: fs.readFileSync('package.json', 'utf8') },
      { path: 'server/index.ts', content: fs.readFileSync('server/index.ts', 'utf8') },
      { path: 'server/routes.ts', content: fs.readFileSync('server/routes.ts', 'utf8') },
      { path: 'Dockerfile', content: fs.readFileSync('Dockerfile', 'utf8') },
      { path: 'railway.json', content: fs.readFileSync('railway.json', 'utf8') },
      { path: '.env.example', content: fs.readFileSync('.env.example', 'utf8') }
    ];

    console.log(`📁 Uploading ${files.length} critical files...`);
    
    // Create blobs for each file
    const blobs = await Promise.all(files.map(async (file) => {
      const { data: blob } = await octokit.rest.git.createBlob({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        content: Buffer.from(file.content).toString('base64'),
        encoding: 'base64'
      });
      return { path: file.path, sha: blob.sha };
    }));

    console.log('✅ All blobs created');

    // Create tree
    const { data: tree } = await octokit.rest.git.createTree({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      tree: blobs.map(blob => ({
        path: blob.path,
        mode: '100644',
        type: 'blob',
        sha: blob.sha
      })),
      base_tree: latestSha
    });

    console.log('✅ Tree created');

    // Create commit
    const { data: commit } = await octokit.rest.git.createCommit({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      message: '🚨 EMERGENCY GOVERNMENT DEPLOYMENT - Critical fixes for DHA Digital Services',
      tree: tree.sha,
      parents: latestSha ? [latestSha] : []
    });

    console.log('✅ Commit created');

    // Update reference
    await octokit.rest.git.updateRef({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      ref: 'heads/main',
      sha: commit.sha
    });

    console.log('🚀 SUCCESS! Code pushed to GitHub');
    console.log(`📁 Repository: https://github.com/${REPO_OWNER}/${REPO_NAME}`);
    console.log('🎯 READY FOR RAILWAY DEPLOYMENT!');
    
  } catch (error) {
    console.error('❌ GitHub push failed:', error);
    throw error;
  }
}

pushAllFiles().catch(console.error);