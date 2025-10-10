
import type { AuthenticatedUser } from "../middleware/auth.js";

declare module 'ws';

// Module declarations for missing types
declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.json' {
  const content: any;
  export default content;
}

// Fix for chart/recharts types
declare module 'recharts' {
  export * from 'recharts';
}

// LocaleVB type declarations
declare namespace LocaleVB {
  export class Value<T = any> {
    constructor(value: T);
    get(): T;
  }
  
  export class Primitive<T = any> extends Value<T> {}
  
  export class Context {
    constructor(data?: any);
  }
  
  export class Function {
    constructor(name: string, fn: (...args: any[]) => any);
  }
}

// Utility function declarations
declare function UtilityFunction(this: any, isolate: any, ...args: any[]): any;

declare global {
  namespace Express {
    interface Request {
      user: AuthenticatedUser;
    }
  }
  
  // Global type augmentations
  interface Window {
    LocaleVB?: typeof LocaleVB;
  }
}

export {};
