const fs = require('fs');
let code = fs.readFileSync('src/index.css', 'utf8');

// I'll strip all the manual class overrides and just keep the CSS variables!
const manualClassOverridesRegex = /\\.dark \\.bg-white \\{[\\s\\S]*?\\}\\s*/;
code = code.replace(manualClassOverridesRegex, '');

// Actually, I'll just rewrite the whole bottom of index.css by splitting at @layer base { .dark {
const splitStr = "@layer base {\n  .dark {\n";
if (code.includes(splitStr)) {
  const top = code.split(splitStr)[0];
  const newDark = `@layer base {
  .dark {
    --color-neo-bg: #111;
    --color-white: #111;
    --color-black: #FDFBF7;
    --color-gray-50: #1a1a1a;
    --color-gray-100: #222;
    --color-gray-200: #333;
    --color-gray-400: #999;
    --color-gray-500: #aaa;
  }
}
`;
  code = top + newDark;
  fs.writeFileSync('src/index.css', code);
}
