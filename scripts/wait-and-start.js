// Waits for both the main process compilation and vite dev server,
// then starts Electron.
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const mainEntry = path.join(__dirname, '..', 'dist', 'main', 'main', 'index.js');
const maxWait = 30000;
const start = Date.now();

console.log('Waiting for build...');

function check() {
  if (fs.existsSync(mainEntry)) {
    console.log('Starting Electron...');
    const proc = spawn('npx', ['electron', '.'], {
      stdio: 'inherit',
      shell: true,
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, NODE_ENV: 'development' },
    });
    proc.on('close', (code) => process.exit(code));
    return;
  }
  if (Date.now() - start > maxWait) {
    console.error('Timeout waiting for main process build');
    process.exit(1);
  }
  setTimeout(check, 500);
}

check();
