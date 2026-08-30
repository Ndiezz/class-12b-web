const fs = require('fs');
let code = fs.readFileSync('src/index.css', 'utf8');

code = code.replace(/box-shadow: 3px 3px 0 0 #000;/g, 'box-shadow: 3px 3px 0 0 var(--color-black, #000);');
code = code.replace(/box-shadow: 4px 4px 0 0 #000;/g, 'box-shadow: 4px 4px 0 0 var(--color-black, #000);');
code = code.replace(/box-shadow: 2px 2px 0 0 #000;/g, 'box-shadow: 2px 2px 0 0 var(--color-black, #000);');
code = code.replace(/box-shadow: 0 0 0 0 #000;/g, 'box-shadow: 0 0 0 0 var(--color-black, #000);');

fs.writeFileSync('src/index.css', code);
