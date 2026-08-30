const fs = require('fs');
let code = fs.readFileSync('src/index.css', 'utf8');

const darkRegex = /@layer base \{\s*\.dark \{[\s\S]*?\}\s*\}/;
code = code.replace(darkRegex, '');

// Also revert var(--color-black, #000) to #000 just to be safe
code = code.replace(/var\(--color-black, #111\)/g, '#111');
code = code.replace(/var\(--color-black, #000\)/g, '#000');

fs.writeFileSync('src/index.css', code);
