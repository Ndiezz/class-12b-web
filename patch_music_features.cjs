const fs = require('fs');
let code = fs.readFileSync('src/components/MusicPlayer.tsx', 'utf8');

code = `import { useState, useRef, useEffect } from "react";
import { Play, Pause, SkipForward, Music, Maximize2, Minimize2 } from "lucide-react";

// Playlist bawaan yang akan diputar otomatis (URL ini merujuk ke folder public/music/)
const PLAYLIST = [
  { title: "17", artist: "Tulus", url: "/music/tulus.mp3" },
  { title: "Kita Kesana", artist: "Hindia", url: "/music/hindia.mp3" },
  { title: "Graduation Song", artist: "Murphy Radio", url: "/music/murphy.mp3" }
];

export default function MusicPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const initialIndex = Math.floor(Math.random() * PLAYLIST.length);
    setCurrentIndex(initialIndex);
    
    const attemptAutoplay = async () => {
      if (audioRef.current) {
        audioRef.current.src = PLAYLIST[initialIndex].url;
        try {
          await audioRef.current.play();
          setIsPlaying(true);
          setHasStarted(true);
        } catch (err) {
          console.warn("Browser memblokir autoplay. Menunggu interaksi pengguna.");
        }
      }
    };
    
    attemptAutoplay();
  }, []);

  useEffect(() => {
    if (hasStarted && audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(e => console.warn(e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentIndex, hasStarted]);

  const togglePlay = () => {
    if (!hasStarted && audioRef.current) {
      audioRef.current.src = PLAYLIST[currentIndex].url;
      setHasStarted(true);
    }
    setIsPlaying(!isPlaying);
  };

  const nextSong = () => {
    setCurrentIndex((prev) => (prev + 1) % PLAYLIST.length);
    if (!hasStarted) setHasStarted(true);
    setIsPlaying(true);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      const duration = audioRef.current.duration;
      if (duration > 0) {
        setProgress((current / duration) * 100);
      }
    }
  };
  
  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (audioRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      const newTime = (percentage / 100) * audioRef.current.duration;
      audioRef.current.currentTime = newTime;
      setProgress(percentage);
    }
  };

  const currentSong = PLAYLIST[currentIndex];

  if (isMinimized) {
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
  }

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end w-72 max-w-[calc(100vw-2rem)]">
      <div className="bg-white/30 backdrop-blur-md border border-white/50 rounded-2xl p-3 flex flex-col gap-2 shadow-lg shadow-black/10 text-black w-full">
        
        {/* Atas: Info & Kontrol */}
        <div className="flex items-center gap-3 w-full">
          <div className="bg-white/50 p-2 rounded-xl shrink-0">
            <Music size={18} className="text-black/80" />
          </div>
          
          <div className="flex flex-col flex-1 overflow-hidden">
            <span className="text-xs font-black uppercase truncate">
              {currentSong.title}
            </span>
            <span className="text-[10px] font-bold opacity-70 truncate">
              {currentSong.artist}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button 
              onClick={togglePlay}
              className="bg-black/90 text-white p-2 rounded-full hover:scale-110 active:scale-95 transition-transform shadow-md"
            >
              {isPlaying ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" className="ml-0.5" />}
            </button>
            <button 
              onClick={nextSong}
              className="hover:text-neo-pink p-1.5 transition-colors bg-white/50 rounded-full hover:bg-white/80 shadow-sm hover:scale-105 active:scale-95"
            >
              <SkipForward size={12} />
            </button>
            <button 
              onClick={() => setIsMinimized(true)}
              className="p-1.5 opacity-60 hover:opacity-100 transition-opacity ml-1"
            >
              <Minimize2 size={14} />
            </button>
          </div>
        </div>

        {/* Bawah: Progress Bar */}
        <div 
          className="w-full h-1.5 bg-black/10 rounded-full overflow-hidden cursor-pointer mt-1"
          onClick={handleProgressBarClick}
        >
          <div 
            className="h-full bg-black/80 transition-all duration-100 ease-linear"
            style={{ width: \`\${progress}%\` }}
          />
        </div>

      </div>
      <audio 
        ref={audioRef}
        onEnded={nextSong}
        onTimeUpdate={handleTimeUpdate}
        src={currentSong.url}
      />
    </div>
  );
}
`;

fs.writeFileSync('src/components/MusicPlayer.tsx', code);
