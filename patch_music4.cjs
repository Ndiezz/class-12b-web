const fs = require('fs');
let code = fs.readFileSync('src/components/MusicPlayer.tsx', 'utf8');

code = code.replace(
  /\/music\/Tulus - 17\.mp3/g,
  '/music/tulus.mp3'
);

code = code.replace(
  /\/music\/Hindia - Kita kesana\.mp3/g,
  '/music/hindia.mp3'
);

code = code.replace(
  /\/music\/Graduation song - Murphy radio\.mp3/g,
  '/music/murphy.mp3'
);

fs.writeFileSync('src/components/MusicPlayer.tsx', code);
