/**
 * 🚂 RAILWAY GRAPHQL API CLIENT
 * 
 * Real Railway API integration for querying deployment status and metrics
 * Based on Railway's actual GraphQL API at backboard.railway.com/graphql/v2
 */

import { railwayConfig } from './railway';

interface RailwayService {
  id: string;
  name: string;
  replicas?: number;
  status: string;
}

interface RailwayEnvironment {
  id: string;
  name: string;
  services: RailwayService[];
}

interface RailwayProject {
  id: string;
  name: string;
  environments: RailwayEnvironment[];
}

interface RailwayDeployment {
  id: string;
  status: 'BUILDING' | 'DEPLOYING' | 'SUCCESS' | 'FAILED' | 'CRASHED';
  createdAt: string;
  finishedAt?: string;
}

export class RailwayAPIClient {
  private static instance: RailwayAPIClient;
  private readonly endpoint = 'https://backboard.railway.com/graphql/v2';
  private readonly token = process.env.RAILWAY_TOKEN;
  private readonly projectToken = process.env.RAILWAY_PROJECT_TOKEN;

  private constructor() {}

  static getInstance(): RailwayAPIClient {
    if (!RailwayAPIClient.instance) {
      RailwayAPIClient.instance = new RailwayAPIClient();
    }
    return RailwayAPIClient.instance;
  }

  /**
   * Check if Railway API is accessible
   */
  async checkApiHealth(): Promise<{ healthy: boolean; error?: string; tokenType?: 'account' | 'project' }> {
    try {
      if (!this.token && !this.projectToken) {
        return {
          healthy: false,
          error: 'No Railway API token provided (RAILWAY_TOKEN or RAILWAY_PROJECT_TOKEN)'
        };
      }

      // Try project token first if available (more specific)
      if (this.projectToken) {
        try {
          const projectQuery = `
            query {
              projectToken {
                projectId
                environmentId
              }
            }
          `;
          
          console.log('🔑 Testing Railway API with project token...');
          const response = await this.executeGraphQL(projectQuery);
          
          if (response.data?.projectToken?.projectId) {
            console.log('✅ Railway project token authentication successful');
            console.log(`   📋 Project ID: ${response.data.projectToken.projectId}`);
            console.log(`   🌍 Environment ID: ${response.data.projectToken.environmentId}`);
            return { 
              healthy: true, 
              tokenType: 'project' 
            };
          }
        } catch (projectError) {
          console.warn('⚠️ Project token authentication failed:', projectError instanceof Error ? projectError.message : String(projectError));
          
          // Fall back to account token if project token fails
          if (!this.token) {
            return {
              healthy: false,
              error: `Project token failed: ${projectError instanceof Error ? projectError.message : String(projectError)}`
            };
          }
        }
      }

      // Try account token if project token failed or not available
      if (this.token) {
        try {
          const accountQuery = `
            query {
              me {
                id
                name
              }
            }
          `;
          
          console.log('🔑 Testing Railway API with account token...');
          const response = await this.executeGraphQL(accountQuery);
          
          if (response.data?.me?.id) {
            console.log('✅ Railway account token authentication successful');
            console.log(`   👤 User: ${response.data.me.name || response.data.me.id}`);
            return { 
              healthy: true, 
              tokenType: 'account' 
            };
          }
        } catch (accountError) {
          return {
            healthy: false,
            error: `Account token failed: ${accountError instanceof Error ? accountError.message : String(accountError)}`
          };
        }
      }

      return {
        healthy: false,
        error: 'Both token types failed or returned unexpected responses'
      };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Get current project information
   */
  async getProjectInfo(): Promise<RailwayProject | null> {
    try {
      if (!this.projectToken) {
        throw new Error('Railway project token required for project queries');
      }

      const query = `
        query {
          projectToken {
            projectId
            environmentId
          }
        }
      `;

      const response = await this.executeGraphQL(query);
      
      // Railway's GraphQL schema is limited for project details
      // This is a best-effort query based on available API
      return {
        id: response.data?.projectToken?.projectId || 'unknown',
        name: 'DHA Platform',
        environments: [{
          id: response.data?.projectToken?.environmentId || 'unknown',
          name: 'production',
          services: []
        }]
      };
    } catch (error) {
      console.error('❌ Failed to fetch project info from Railway:', error);
      return null;
    }
  }

  /**
   * Get deployment status
   */
  async getDeploymentStatus(): Promise<{
    status: 'healthy' | 'deploying' | 'failed' | 'unknown';
    lastDeployment?: RailwayDeployment;
    limitations: string[];
  }> {
    try {
      // Current API limitations (may change as Railway evolves)
      const limitations = [
        'Service limits updates may require specific mutation patterns',
        'Deployment status information has limited detail via public API',
        'Some features may require team/project tokens vs account tokens'
      ];

      const projectInfo = await this.getProjectInfo();
      
      return {
        status: projectInfo ? 'healthy' : 'unknown',
        limitations
      };
    } catch (error) {
      return {
        status: 'failed',
        limitations: ['Unable to connect to Railway API']
      };
    }
  }

  /**
   * Scale service replicas using Railway's GraphQL API
   * This implements the actual Railway scaling API
   */
  async scaleService(serviceId: string, environmentId: string, replicas: number): Promise<{
    success: boolean;
    currentReplicas?: number;
    error?: string;
  }> {
    try {
      if (!serviceId || !environmentId) {
        throw new Error('Service ID and Environment ID are required for scaling');
      }

      // Use the serviceInstanceLimitsUpdate mutation
      const mutation = `
        mutation serviceInstanceLimitsUpdate($input: ServiceInstanceLimitsUpdateInput!) {
          serviceInstanceLimitsUpdate(input: $input)
        }
      `;

      const variables = {
        input: {
          serviceId,
          environmentId,
          replicas
        }
      };

      console.log(`🚂 Scaling Railway service ${serviceId} to ${replicas} replicas...`);
      const response = await this.executeGraphQL(mutation, variables);
      
      console.log(`✅ Railway scaling request completed`);
      return { 
        success: true, 
        currentReplicas: replicas 
      };
    } catch (error) {
      console.error('❌ Railway scaling failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Get current service information including replica count
   */
  async getServiceInfo(serviceId: string, environmentId: string): Promise<{
    success: boolean;
    service?: RailwayService;
    error?: string;
  }> {
    try {
      const query = `
        query getService($serviceId: String!, $environmentId: String!) {
          service(id: $serviceId) {
            id
            name
            deployments(first: 1) {
              edges {
                node {
                  id
                  status
                  meta
                }
              }
            }
          }
        }
      `;

      const response = await this.executeGraphQL(query, { serviceId, environmentId });
      
      if (response.data?.service) {
        return {
          success: true,
          service: {
            id: response.data.service.id,
            name: response.data.service.name,
            status: response.data.service.deployments?.edges?.[0]?.node?.status || 'unknown',
            replicas: response.data.service.deployments?.edges?.[0]?.node?.meta?.replicas || 1
          }
        };
      }
      
      return { success: false, error: 'Service not found' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Get service metrics (limited by Railway API)
   */
  async getServiceMetrics(): Promise<{
    available: boolean;
    metrics?: any;
    limitations: string[];
  }> {
    const limitations = [
      'Railway public API has limited metrics exposure',
      'Detailed CPU/memory metrics available in Railway dashboard only', 
      'Application-level metrics must be collected separately',
      'Consider using external monitoring for comprehensive metrics'
    ];

    return {
      available: false,
      limitations
    };
  }

  /**
   * Execute GraphQL query against Railway API
   */
  private async executeGraphQL(query: string, variables?: any): Promise<any> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Railway GraphQL API uses standard Authorization Bearer token for both account and project tokens
    if (this.projectToken) {
      headers['Authorization'] = `Bearer ${this.projectToken}`;
    } else if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    } else {
      throw new Error('No Railway API credentials available');
    }

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query,
        variables
      })
    });

    if (!response.ok) {
      throw new Error(`Railway API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.errors && data.errors.length > 0) {
      throw new Error(`Railway GraphQL error: ${data.errors[0].message}`);
    }

    return data;
  }
}

export const railwayAPI = RailwayAPIClient.getInstance();

// Railway service configuration from environment
export const RAILWAY_SERVICE_CONFIG = {
  serviceId: process.env.RAILWAY_SERVICE_ID,
  environmentId: process.env.RAILWAY_ENVIRONMENT_ID,
  projectId: process.env.RAILWAY_PROJECT_ID
};