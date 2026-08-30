const fs = require('fs');
let code = fs.readFileSync('src/components/Polls.tsx', 'utf8');

code = code.replace(
  'className={`absolute top-0 left-0 h-full ${colorClass} progress-energy z-0 border-r-2 sm:border-r-4 border-black opacity-50`}',
  'className={`absolute top-0 left-0 h-full ${colorClass} progress-energy z-0 border-r-2 sm:border-r-4 border-black`}'
);

fs.writeFileSync('src/components/Polls.tsx', code);
