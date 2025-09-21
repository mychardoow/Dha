import { Octokit } from '@octokit/rest'

let connectionSettings;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
// Always call this function again to get a fresh client.
export async function getUncachableGitHubClient() {
  const accessToken = await getAccessToken();
  return new Octokit({ auth: accessToken });
}

// Create GitHub repository for DHA system
async function createGitHubRepo() {
  try {
    const octokit = await getUncachableGitHubClient();
    
    // Get authenticated user
    const { data: user } = await octokit.rest.users.getAuthenticated();
    console.log(`Authenticated as: ${user.login}`);
    
    // Create repository
    const repoName = 'dha-digital-services';
    const { data: repo } = await octokit.rest.repos.createForAuthenticatedUser({
      name: repoName,
      description: 'Military-grade AI system for South African Department of Home Affairs (DHA) with comprehensive document generation capabilities',
      private: false,
      auto_init: false
    });
    
    console.log(`✅ Repository created successfully: ${repo.html_url}`);
    console.log(`📁 Clone URL: ${repo.clone_url}`);
    
    return {
      url: repo.html_url,
      cloneUrl: repo.clone_url,
      name: repoName,
      owner: user.login
    };
    
  } catch (error) {
    if (error.status === 422) {
      console.log('Repository already exists, proceeding with existing repo...');
      const octokit = await getUncachableGitHubClient();
      const { data: user } = await octokit.rest.users.getAuthenticated();
      return {
        url: `https://github.com/${user.login}/dha-digital-services`,
        cloneUrl: `https://github.com/${user.login}/dha-digital-services.git`,
        name: 'dha-digital-services',
        owner: user.login
      };
    }
    throw error;
  }
}

// Run the setup
createGitHubRepo().then(repo => {
  console.log('\n🚀 Next steps:');
  console.log('1. Initialize git repository');
  console.log('2. Add all files and commit');
  console.log('3. Push to GitHub');
  console.log(`4. Deploy to Railway using: ${repo.url}`);
}).catch(console.error);