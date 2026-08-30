const fs = require('fs');
let code = fs.readFileSync('src/index.css', 'utf8');

code = code.replace(/color: #111;/g, 'color: var(--color-black, #111);');

fs.writeFileSync('src/index.css', code);
