// Type shims for JavaScript modules without declarations
declare module '*/middleware/universal-api-override.js' {
  export const universalAPIOverride: any;
  export default any;
}

declare module '*/storage.js' {
  export const storage: any;
}

declare module '*/routes.js' {
  export function registerRoutes(app: any): void;
}

declare module '*/vite.js' {
  export function setupVite(app: any, server: any): Promise<void>;
}

declare module '*/config/railway.js' {
  export function validateRailwayConfig(): void;
}

declare module '*/config/database-railway.js' {
  export function initializeDatabase(): Promise<any>;
}

declare module '*/routes/api-key-status.js' {
  const routes: any;
  export default routes;
}

declare module '*/routes/api-status.js' {
  const routes: any;
  export default routes;
}

declare module '*/services/universal-api-manager.js' {
  export const universalAPIManager: any;
}

// Process type augmentation
declare namespace NodeJS {
  interface Process {
    exit(code?: number): never;
    on(event: string, listener: Function): this;
    cwd(): string;
  }
}
