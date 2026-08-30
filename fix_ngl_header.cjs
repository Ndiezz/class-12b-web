const fs = require('fs');
let code = fs.readFileSync('src/components/ConfessionBoard.tsx', 'utf8');

code = code.replace(
  '{selectedNglNote.to ? `To: ${selectedNglNote.to}` : `From: ${selectedNglNote.nickname}`}',
  'From: {selectedNglNote.nickname} {selectedNglNote.to && ` • To: ${selectedNglNote.to}`}'
);

fs.writeFileSync('src/components/ConfessionBoard.tsx', code);
