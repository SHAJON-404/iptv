const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const appDir = path.join(__dirname, '../app');
const apiDir = path.join(appDir, 'api');
const tempApiDir = path.join(__dirname, '../api_backup');

let apiMoved = false;

try {
  if (fs.existsSync(apiDir)) {
    console.log('Temporarily moving app/api to app/api_backup for static build...');
    fs.renameSync(apiDir, tempApiDir);
    apiMoved = true;
  }

  console.log('Running static next build...');
  execSync('npx cross-env NEXT_STANDALONE_EXPORT=true next build --webpack', { stdio: 'inherit' });
  console.log('Static next build succeeded!');
} catch (error) {
  console.error('Static next build failed:', error);
  process.exitCode = 1;
} finally {
  if (apiMoved) {
    console.log('Restoring app/api from app/api_backup...');
    try {
      if (fs.existsSync(tempApiDir)) {
        fs.renameSync(tempApiDir, apiDir);
      }
    } catch (restoreError) {
      console.error('Failed to restore app/api directory!', restoreError);
    }
  }
}
