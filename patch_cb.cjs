const fs = require('fs');
let code = fs.readFileSync('src/components/ConfessionBoard.tsx', 'utf8');

if (!code.includes('createPortal')) {
  code = code.replace('import { useEffect, useState } from "react";', 'import { useEffect, useState } from "react";\nimport { createPortal } from "react-dom";');
}

// Add scroll lock effect
const scrollLockEffect = `
  useEffect(() => {
    if (showToModal || showSongModal || showSpamModal || showEditModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [showToModal, showSongModal, showSpamModal, showEditModal]);
`;
if (!code.includes('document.body.style.overflow')) {
  code = code.replace('const canPost = () => {', scrollLockEffect + '\n  const canPost = () => {');
}

function wrapWithPortal(str) {
  // Finds {condition && ( <div className="fixed..."> ... </div> )}
  // Replaces it with {condition && createPortal( <div className="fixed..."> ... </div>, document.body )}
  let startIdx = 0;
  while ((startIdx = code.indexOf(str, startIdx)) !== -1) {
    if (code.slice(startIdx, startIdx + 50).includes('createPortal')) {
      startIdx++;
      continue;
    }
    const fixedDivIdx = code.indexOf('<div className="fixed', startIdx);
    if (fixedDivIdx !== -1) {
      // replace condition && ( with condition && typeof document !== "undefined" && createPortal(
      code = code.substring(0, startIdx) + str.replace(' && (', ' && typeof document !== "undefined" && createPortal(') + code.substring(startIdx + str.length);
      
      // Now find the matching closing parenthesis.
      // This is at the end of the block.
      // Let's just find the `)}` that matches this block.
      // A safe heuristic is to find the next `      )}` or `    )}` with matching indentation.
      let endIdx = code.indexOf(')}', fixedDivIdx);
      if (endIdx !== -1) {
        // It could be nested, but for these simple modals, the first `)}` at the right indentation is usually it.
        // Actually, to be safe, I can just replace `)}` that closes the block.
      }
    }
    startIdx++;
  }
}

// A simpler string replacement since they all end with `      )}`
code = code.replace('{showToModal && (', '{showToModal && typeof document !== "undefined" && createPortal(');
code = code.replace('{showSongModal && (', '{showSongModal && typeof document !== "undefined" && createPortal(');
code = code.replace('{showSpamModal && (', '{showSpamModal && typeof document !== "undefined" && createPortal(');
code = code.replace('{showEditModal && editingMessage && (', '{showEditModal && editingMessage && typeof document !== "undefined" && createPortal(');

// Now we need to replace the closing `)}` with `), document.body)}`
// They are exactly at the end of the file before `    </section>`

// Let's just do a regex replace for the modals
// Because they are all sequential at the end:
//       {showToModal ...
//       )}
//       {showSongModal ...
//       )}
// etc.

code = code.replace(/      \)}/g, '      ), document.body)}');

// Fix any over-replaced parts if there are other `      )}`
// Actually `      )}` might appear elsewhere. Let's write the modified code and verify.

fs.writeFileSync('src/components/ConfessionBoard.tsx', code);
