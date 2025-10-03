import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

async function monitorClientBuild() {
  console.log('🔍 Monitoring client build process...');

  try {
    // Check client dependencies
    console.log('\n📦 Checking PDF-related dependencies...');
    const clientPackageJson = JSON.parse(await fs.readFile('client/package.json', 'utf8'));
    const pdfDeps = Object.entries(clientPackageJson.dependencies)
      .filter(([key]) => key.toLowerCase().includes('pdf'));
    
    console.log('PDF Dependencies found:');
    pdfDeps.forEach(([key, version]) => {
      console.log(`- ${key}: ${version}`);
    });

    // Run client build
    console.log('\n🏗️ Running client build...');
    const { stdout, stderr } = await execAsync('cd client && npm run build');
    
    if (stderr) {
      console.error('⚠️ Build warnings:', stderr);
    }

    // Check build output
    const distPath = path.join('client', 'dist');
    const distFiles = await fs.readdir(distPath);
    
    console.log('\n📁 Build output files:');
    distFiles.forEach(file => {
      console.log(`- ${file}`);
    });

    // Verify PDF-related chunks
    const pdfChunks = distFiles.filter(file => file.toLowerCase().includes('pdf'));
    console.log('\n📑 PDF-related chunks:');
    pdfChunks.forEach(chunk => {
      console.log(`- ${chunk}`);
    });

    console.log('\n✅ Client build completed successfully!');
    return true;
  } catch (error) {
    console.error('\n❌ Client build failed:', error);
    return false;
  }
}

monitorClientBuild()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });