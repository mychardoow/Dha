// Web3Auth Integration using your provided credentials
export class Web3AuthService {
  private clientId: string;
  private clientSecret: string;
  private jwksEndpoint: string;
  private environment: string;

  constructor() {
    // Your Web3Auth credentials
    this.clientId = 'BAzvRcvBQ8GiEUIgiANRXLIScYITkL1EHrvYQdo0gAZ4e0ElOI5UWb6sVsmM1G4NbFZdd00rOIlzmZ8i4UEis3w';
    this.clientSecret = 'faaaab4981e6205bcfea3f4e5456527308b3ad039a628c16ffe2a5632f80316c';
    this.jwksEndpoint = 'https://api-auth.web3auth.io/.well-known/jwks.json';
    this.environment = 'sapphire_devnet';
  }

  async authenticateUser(idToken: string): Promise<any> {
    try {
      const response = await fetch('https://api-auth.web3auth.io/api/v2/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`
        },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          code: idToken,
          client_id: this.clientId
        })
      });

      if (!response.ok) {
        throw new Error('Web3Auth authentication failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Web3Auth Error:', error);
      throw error;
    }
  }

  async getUserInfo(accessToken: string): Promise<any> {
    try {
      const response = await fetch('https://api-auth.web3auth.io/api/v2/oauth/userinfo', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get user info');
      }

      return await response.json();
    } catch (error) {
      console.error('Web3Auth User Info Error:', error);
      throw error;
    }
  }

  getConfig() {
    return {
      clientId: this.clientId,
      environment: this.environment,
      jwksEndpoint: this.jwksEndpoint,
      platforms: ['Web Application', 'iOS']
    };
  }
}

export const web3AuthService = new Web3AuthService();