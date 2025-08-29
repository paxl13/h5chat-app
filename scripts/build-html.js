const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
const prodHtmlPath = path.join(__dirname, '..', 'public', 'index.prod.html');

// Read the original HTML
let html = fs.readFileSync(htmlPath, 'utf8');

// Remove Tailwind CDN script and config
html = html.replace(
  /<script src="https:\/\/cdn\.tailwindcss\.com"><\/script>[\s\S]*?<\/script>/g,
  '',
);

// Add link to compiled CSS
html = html.replace(
  '</title>',
  '</title>\n    <link rel="stylesheet" href="/css/output.css">',
);

// Clean up extra whitespace
html = html.replace(/^\s*\n/gm, '');

// Write production HTML
fs.writeFileSync(prodHtmlPath, html);

console.log('Production HTML created at public/index.prod.html');