const fs = require('fs');
let code = fs.readFileSync('src/components/MusicPlayer.tsx', 'utf8');

code = code.replace(
  'const PLAYLIST = [  { title: "17", artist: "Tulus", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },  { title: "Kita kesana", artist: "Hindia", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },  { title: "Graduation song", artist: "Murphy radio", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" }];',
  `const PLAYLIST = [
  { title: "17", artist: "Tulus", url: "/music/Tulus - 17.mp3" },
  { title: "Kita kesana", artist: "Hindia", url: "/music/Hindia - Kita kesana.mp3" },
  { title: "Graduation song", artist: "Murphy radio", url: "/music/Graduation song - Murphy radio.mp3" }
];`
);

fs.writeFileSync('src/components/MusicPlayer.tsx', code);
