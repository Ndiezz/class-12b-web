const fs = require('fs');
let code = fs.readFileSync('src/components/MusicPlayer.tsx', 'utf8');

code = code.replace(
  'audioRef.current.src = PLAYLIST[currentIndex].url;',
  'audioRef.current.src = playlist[currentIndex].url;'
);

code = code.replace(
  'audioRef.current.src = PLAYLIST[initialIndex].url;',
  'audioRef.current.src = playlist[initialIndex].url;'
);

fs.writeFileSync('src/components/MusicPlayer.tsx', code);
