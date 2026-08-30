const fs = require('fs');
let code = fs.readFileSync('src/components/ConfessionBoard.tsx', 'utf8');

// I will replace all instances of:
// </div>\n        </div>\n      , document.body)}
// Wait, NGL Modal is the last one before "No confessions yet".

const nglIndex = code.indexOf('{/* NGL Style IG Story Modal */}');
if (nglIndex !== -1) {
  let nglPart = code.substring(nglIndex);
  nglPart = nglPart.replace('</div>\n        </div>\n      , document.body)}', '</motion.div>\n        </div>\n      , document.body)}');
  code = code.substring(0, nglIndex) + nglPart;
}

fs.writeFileSync('src/components/ConfessionBoard.tsx', code);
