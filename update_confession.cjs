const fs = require('fs');
let code = fs.readFileSync('src/components/ConfessionBoard.tsx', 'utf8');

if (!code.includes('createPortal')) {
  code = code.replace('import { useEffect, useState } from "react";', 'import { useEffect, useState } from "react";\nimport { createPortal } from "react-dom";');
}

const addPortal = (modalStateStr) => {
  const target = `{${modalStateStr} && (`
  if (code.includes(target) && !code.includes(`{${modalStateStr} && typeof document !== "undefined" && createPortal(`)) {
     // We need to find the matching closing tag. It's tricky with regex, so we just replace the start and end.
     // Let's do a simpler approach:
     code = code.replace(`{${modalStateStr} && (`, `{${modalStateStr} && typeof document !== "undefined" && createPortal(`);
     // But wait, finding the exact closing tag is hard.
     // Let's use a simpler regex or manual replacement.
  }
}

// Instead of string replacement for JSX which is brittle, I'll use simple sed or manual edit.
