import { transformSync } from 'esbuild';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { resolve as pathResolve, dirname } from 'path';

export async function resolve(specifier, context, nextResolve) {
  // Handle .js imports that are actually .ts files
  if (specifier.endsWith('.js')) {
    const tsSpecifier = specifier.replace(/\.js$/, '.ts');
    if (context.parentURL) {
      const parentPath = fileURLToPath(context.parentURL);
      const parentDir = dirname(parentPath);
      const tsPath = pathResolve(parentDir, tsSpecifier);
      if (existsSync(tsPath)) {
        return {
          url: new URL(tsPath, 'file://').href,
          shortCircuit: true,
        };
      }
    }
  }
  
  // Handle extensionless imports - try .ts extension
  if (!specifier.startsWith('node:') && !specifier.includes('node_modules')) {
    if (context.parentURL && !specifier.match(/\.(js|ts|json|mjs|cjs)$/)) {
      const parentPath = fileURLToPath(context.parentURL);
      const parentDir = dirname(parentPath);
      const tsPath = pathResolve(parentDir, specifier + '.ts');
      if (existsSync(tsPath)) {
        return {
          url: new URL(tsPath, 'file://').href,
          shortCircuit: true,
        };
      }
    }
  }

  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.endsWith('.ts') || url.endsWith('.tsx')) {
    const filePath = fileURLToPath(url);
    const source = readFileSync(filePath, 'utf8');
    const { code } = transformSync(source, {
      loader: url.endsWith('.tsx') ? 'tsx' : 'ts',
      format: 'esm',
      target: 'esnext',
    });
    return {
      format: 'module',
      source: code,
      shortCircuit: true,
    };
  }
  return nextLoad(url);
}
