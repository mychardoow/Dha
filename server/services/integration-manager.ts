import { apiKeyManager } from './api-key-manager';
import { EventEmitter } from 'events';

interface IntegrationStatus {
    name: string;
    status: 'active' | 'inactive' | 'error';
    lastCheck: Date;
    error?: string;
}

class IntegrationManager extends EventEmitter {
    private static instance: IntegrationManager;
    private integrationStatus: Map<string, IntegrationStatus> = new Map();
    private readonly REQUIRED_INTEGRATIONS = [
        'openai',
        'anthropic',
        'google',
        'abis',
        'saps',
        'dha',
        'npr',
        'icao'
    ];

    private constructor() {
        super();
        this.initializeIntegrations();
    }

    static getInstance(): IntegrationManager {
        if (!IntegrationManager.instance) {
            IntegrationManager.instance = new IntegrationManager();
        }
        return IntegrationManager.instance;
    }

    private async initializeIntegrations() {
        for (const integration of this.REQUIRED_INTEGRATIONS) {
            await this.checkIntegration(integration);
        }
        
        // Set up periodic checks
        setInterval(() => this.checkAllIntegrations(), 5 * 60 * 1000); // Every 5 minutes
    }

    public async checkIntegration(integration: string): Promise<IntegrationStatus> {
        try {
            const key = await apiKeyManager.getValidKey(integration);
            if (!key) {
                throw new Error('No valid API key found');
            }

            const status = await this.testIntegration(integration, key);
            this.integrationStatus.set(integration, {
                name: integration,
                status: status ? 'active' : 'inactive',
                lastCheck: new Date()
            });

            return this.integrationStatus.get(integration)!;
        } catch (error: any) {
            const status: IntegrationStatus = {
                name: integration,
                status: 'error',
                lastCheck: new Date(),
                error: error.message
            };
            this.integrationStatus.set(integration, status);
            return status;
        }
    }

    private async testIntegration(integration: string, key: string): Promise<boolean> {
        const endpoints: { [key: string]: string } = {
            'openai': 'https://api.openai.com/v1/models',
            'anthropic': 'https://api.anthropic.com/v1/models',
            'google': 'https://generativelanguage.googleapis.com/v1/models',
            'abis': process.env.ABIS_ENDPOINT || 'https://abis.dha.gov.za/api/validate',
            'saps': process.env.SAPS_ENDPOINT || 'https://saps.gov.za/api/verify',
            'dha': process.env.DHA_ENDPOINT || 'https://dha.gov.za/api/status',
            'npr': process.env.NPR_ENDPOINT || 'https://npr.gov.za/api/verify',
            'icao': process.env.ICAO_ENDPOINT || 'https://icao.int/api/validate'
        };

        try {
            const response = await fetch(endpoints[integration], {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${key}`,
                    'Content-Type': 'application/json'
                }
            });

            return response.ok;
        } catch {
            return false;
        }
    }

    public async checkAllIntegrations(): Promise<Map<string, IntegrationStatus>> {
        const checks = this.REQUIRED_INTEGRATIONS.map(integration => 
            this.checkIntegration(integration)
        );
        await Promise.all(checks);
        return this.integrationStatus;
    }

    public getIntegrationStatus(integration: string): IntegrationStatus | undefined {
        return this.integrationStatus.get(integration);
    }

    public getAllIntegrationStatus(): Map<string, IntegrationStatus> {
        return new Map(this.integrationStatus);
    }

    public isAllIntegrationsActive(): boolean {
        return Array.from(this.integrationStatus.values())
            .every(status => status.status === 'active');
    }
}

export const integrationManager = IntegrationManager.getInstance();