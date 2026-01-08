const fs = require('fs');
const path = require('path');

// This script generates a 404.html file for GitHub Pages
// For client-side routing, GitHub Pages serves 404.html for missing routes
// We copy index.html to 404.html so the app loads and the client router handles navigation

const outDir = path.join(__dirname, '..', 'out');

// Check if out directory exists
if (!fs.existsSync(outDir)) {
  console.error('Error: out directory not found at', outDir);
  console.error('Please run "npm run build" first');
  process.exit(1);
}

// Find index.html - Next.js generates it at the root of out directory
const indexHtmlPath = path.join(outDir, 'index.html');

if (!fs.existsSync(indexHtmlPath)) {
  console.error('Error: index.html not found at', indexHtmlPath);
  if (fs.existsSync(outDir)) {
    console.error('Available files in out:', fs.readdirSync(outDir).slice(0, 10));
  }
  process.exit(1);
}

const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

// For GitHub Pages with custom domain:
// When accessing a route that doesn't exist, GitHub Pages serves 404.html
// We copy index.html to 404.html so the app loads directly and the client router handles navigation
const html404Path = path.join(outDir, '404.html');
fs.writeFileSync(html404Path, indexHtml, 'utf8');
console.log('Generated 404.html at', html404Path);
