const fs = require('fs');
const path = require('path');

// This script generates a 404.html file for GitHub Pages
// For client-side routing with basePath, we need to handle routes properly
// GitHub Pages serves 404.html for missing routes, which should load the app

const basePath = '/mmv2';
const outDir = path.join(__dirname, '..', 'out');

// Check if out directory exists
if (!fs.existsSync(outDir)) {
  console.error('Error: out directory not found at', outDir);
  console.error('Please run "npm run build" first');
  process.exit(1);
}

// Find index.html - Next.js with basePath generates it in the basePath subdirectory
const basePathDir = path.join(outDir, basePath.substring(1)); // Remove leading /
const indexHtmlPath = fs.existsSync(basePathDir) 
  ? path.join(basePathDir, 'index.html')
  : path.join(outDir, 'index.html');

if (!fs.existsSync(indexHtmlPath)) {
  console.error('Error: index.html not found at', indexHtmlPath);
  if (fs.existsSync(outDir)) {
    console.error('Available files in out:', fs.readdirSync(outDir).slice(0, 10));
  }
  process.exit(1);
}

const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

// Also ensure test route exists - Next.js should generate it, but let's verify
const testHtmlPath = path.join(basePathDir, 'test', 'index.html');
const testHtmlPath2 = path.join(basePathDir, 'test.html');

if (!fs.existsSync(testHtmlPath) && !fs.existsSync(testHtmlPath2)) {
  console.warn('Warning: test route not found at', testHtmlPath, 'or', testHtmlPath2);
  console.warn('Next.js might not have generated the test route - this is OK, 404.html will handle it');
}

// For GitHub Pages with basePath:
// When accessing /mmv2/test?cfg=..., if the file doesn't exist, GitHub Pages serves 404.html
// We copy index.html to 404.html so the app loads directly and the client router handles navigation
// No redirect needed - just serve the app directly
const html404Path = path.join(outDir, '404.html');
fs.writeFileSync(html404Path, indexHtml, 'utf8');
console.log('Generated 404.html at', html404Path);

// Also copy index.html to 404.html in the basePath directory as a fallback
if (fs.existsSync(basePathDir)) {
  const basePath404Path = path.join(basePathDir, '404.html');
  fs.writeFileSync(basePath404Path, indexHtml, 'utf8');
  console.log('Generated 404.html at', basePath404Path);
}
