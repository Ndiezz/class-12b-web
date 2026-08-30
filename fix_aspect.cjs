const fs = require('fs');
let code = fs.readFileSync('src/components/ConfessionBoard.tsx', 'utf8');

code = code.replace(
  'className="w-full aspect-[9/16] sm:aspect-auto sm:min-h-[500px] flex items-center justify-center p-6 bg-gradient-to-br',
  'className="w-full min-h-[500px] flex items-center justify-center p-6 bg-gradient-to-br'
);

fs.writeFileSync('src/components/ConfessionBoard.tsx', code);
