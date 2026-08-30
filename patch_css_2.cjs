const fs = require('fs');
let code = fs.readFileSync('src/index.css', 'utf8');

const darkThemeMore = `
  .dark .bg-gray-50 {
    background-color: #1a1a1a !important;
  }
  .dark .bg-gray-100 {
    background-color: #222 !important;
  }
  .dark .bg-gray-200 {
    background-color: #333 !important;
  }
  .dark .text-gray-400 {
    color: #999 !important;
  }
  .dark .text-gray-500 {
    color: #aaa !important;
  }
  .dark .bg-\\[\\#E5E5EA\\] {
    background-color: #2c2c2e !important;
  }
  .dark .border-\\[\\#D1D1D6\\] {
    border-color: #3a3a3c !important;
  }
  .dark .text-\\[\\#8E8E93\\] {
    color: #98989d !important;
  }
`;

code = code.replace('}\n\n', darkThemeMore + '}\n');
// if it didn't find the replace target, just append it
if (code === fs.readFileSync('src/index.css', 'utf8')) {
  code = code.replace(/}\s*$/, darkThemeMore + '}\n');
}

fs.writeFileSync('src/index.css', code);
