const fs = require('fs');
const path = require('path');

const srcPublic = path.join(__dirname, '../public');
const destPublic = path.join(__dirname, '../.next/standalone/public');

const srcStatic = path.join(__dirname, '../.next/static');
const destStatic = path.join(__dirname, '../.next/standalone/.next/static');

const standaloneDir = path.join(__dirname, '../.next/standalone');

if (!fs.existsSync(standaloneDir)) {
  console.error('Error: .next/standalone does not exist. Please run next build first.');
  process.exit(1);
}

try {
  console.log('Copying public assets to standalone...');
  if (fs.existsSync(srcPublic)) {
    fs.cpSync(srcPublic, destPublic, { recursive: true, force: true });
    console.log('Successfully copied public assets.');
  } else {
    console.log('Warning: public directory not found.');
  }

  console.log('Copying static assets to standalone...');
  if (fs.existsSync(srcStatic)) {
    fs.cpSync(srcStatic, destStatic, { recursive: true, force: true });
    console.log('Successfully copied static assets.');
  } else {
    console.log('Warning: .next/static directory not found.');
  }

  // Remove .env file from standalone directory to prevent electron-builder from failing on default exclude rules
  const standaloneEnv = path.join(standaloneDir, '.env');
  if (fs.existsSync(standaloneEnv)) {
    console.log('Removing build-time .env file from standalone...');
    fs.unlinkSync(standaloneEnv);
  }

  // Recursively remove all .map files to keep the production bundle lightweight
  console.log('Cleaning up unwanted source maps (.map files) from standalone...');
  function removeSourceMaps(dir) {
    if (!fs.existsSync(dir)) return;
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        removeSourceMaps(fullPath);
      } else if (item.endsWith('.map')) {
        try {
          fs.unlinkSync(fullPath);
        } catch (err) {
          console.error(`Failed to delete source map ${fullPath}: ${err.message}`);
        }
      }
    }
  }
  removeSourceMaps(standaloneDir);

  console.log('Next.js standalone assets copied successfully!');
} catch (err) {
  console.error('Error copying Next.js standalone assets:', err);
  process.exit(1);
}
