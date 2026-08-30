const fs = require('fs');
let code = fs.readFileSync('src/components/MusicPlayer.tsx', 'utf8');

code = code.replace(
  'if (isMinimized) {\n    return (\n      <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end">\n        <button \n          onClick={() => setIsMinimized(false)}\n          className="bg-white/50 backdrop-blur-md border border-white/50 p-3 rounded-full shadow-lg shadow-black/10 hover:scale-105 active:scale-95 transition-all text-black"\n        >\n          <Music size={20} className={isPlaying ? "animate-pulse" : ""} />\n        </button>\n        <audio \n          ref={audioRef}\n          onEnded={nextSong}\n          onTimeUpdate={handleTimeUpdate}\n          src={currentSong.url}\n        />\n      </div>\n    );\n  }',
  `if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end">
        <button 
          onClick={() => setIsMinimized(false)}
          className="bg-white/50 backdrop-blur-md border border-white/50 p-3 rounded-full shadow-lg shadow-black/10 hover:scale-105 active:scale-95 transition-all text-black"
        >
          <Music size={20} className={isPlaying ? "animate-pulse" : ""} />
        </button>
        <audio 
          ref={audioRef}
          onEnded={nextSong}
          onTimeUpdate={handleTimeUpdate}
          src={currentSong.url}
        />
      </div>
    );
  }`
);
