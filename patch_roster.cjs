const fs = require('fs');
let code = fs.readFileSync('src/components/Roster.tsx', 'utf8');

if (!code.includes('createPortal')) {
  code = code.replace('import { useState, useEffect, useMemo } from "react";', 'import { useState, useEffect, useMemo } from "react";\nimport { createPortal } from "react-dom";');
}

const scrollLockEffect = `
  useEffect(() => {
    if (selectedStudent || showSongModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [selectedStudent, showSongModal]);
`;
if (!code.includes('document.body.style.overflow')) {
  code = code.replace('const filteredStudents', scrollLockEffect + '\n  const filteredStudents');
}

code = code.replace('{showSongModal && (', '{showSongModal && typeof document !== "undefined" && createPortal(');
code = code.replace('{selectedStudent && (', '{selectedStudent && typeof document !== "undefined" && createPortal(');
code = code.replace(/      \)}/g, '      ), document.body)}');

fs.writeFileSync('src/components/Roster.tsx', code);
