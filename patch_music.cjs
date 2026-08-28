const fs = require('fs');
let code = fs.readFileSync('src/components/MusicPlayer.tsx', 'utf8');

if (!code.includes('handleFileUpload')) {
  code = code.replace(
    'const [hasStarted, setHasStarted] = useState(false);',
    `const [hasStarted, setHasStarted] = useState(false);
  const [playlist, setPlaylist] = useState(PLAYLIST);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      const newSong = { title: file.name.replace(/\.[^/.]+$/, ""), artist: "Local File", url };
      setPlaylist([...playlist, newSong]);
      setCurrentIndex(playlist.length);
      setIsPlaying(true);
      if (!hasStarted) setHasStarted(true);
    }
  };`
  );

  code = code.replace(
    'const currentSong = PLAYLIST[currentIndex];',
    'const currentSong = playlist[currentIndex] || playlist[0];'
  );

  code = code.replace(
    /PLAYLIST\.length/g,
    'playlist.length'
  );

  code = code.replace(
    /PLAYLIST\.map/g,
    'playlist.map'
  );

  code = code.replace(
    '</button>\n          </div>\n          \n          <div className="flex flex-col gap-2',
    `</button>\n          </div>\n          \n          <div className="flex flex-col gap-2`
  );

  code = code.replace(
    '          <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1">',
    `          <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1 mb-3">`
  );
  
  code = code.replace(
    /\{\s*playlist\.map\(\(song, idx\) => \(/g,
    `{playlist.map((song, idx) => (`
  );

  code = code.replace(
    '</button>\n            ))}\n          </div>',
    `</button>\n            ))}\n          </div>\n          <button onClick={() => fileInputRef.current?.click()} className="w-full text-xs font-bold bg-white border-2 border-black p-2 hover:bg-neo-pink hover:text-white transition-colors border-dashed">\n            + IMPOR LAGU (MP3)\n          </button>\n          <input type="file" accept="audio/*" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />`
  );

  fs.writeFileSync('src/components/MusicPlayer.tsx', code);
}
