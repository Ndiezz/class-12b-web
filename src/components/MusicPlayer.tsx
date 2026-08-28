import { useState, useRef, useEffect } from "react";
import { Play, Pause, SkipForward, Music } from "lucide-react";

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
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    // Memilih lagu secara acak saat pertama kali dimuat
    const initialIndex = Math.floor(Math.random() * PLAYLIST.length);
    setCurrentIndex(initialIndex);
    
    // Mencoba memutar otomatis (beberapa browser memblokir ini hingga ada interaksi pengguna)
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

  const currentSong = PLAYLIST[currentIndex];

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end">
      {/* UI Pemutar Musik: Kaca Tembus Pandang, Ujung Tumpul */}
      <div className="bg-white/30 backdrop-blur-md border border-white/50 rounded-2xl p-3 flex items-center gap-3 shadow-lg shadow-black/10 text-black">
        
        {/* Ikon Musik */}
        <div className="bg-white/50 p-2 rounded-xl">
          <Music size={18} className="text-black/80" />
        </div>
        
        {/* Info Lagu */}
        <div className="flex flex-col min-w-[100px] max-w-[130px]">
          <span className="text-xs font-black uppercase overflow-hidden whitespace-nowrap text-ellipsis">
            {currentSong.title}
          </span>
          <span className="text-[10px] font-bold opacity-70 overflow-hidden whitespace-nowrap text-ellipsis">
            {currentSong.artist}
          </span>
        </div>

        {/* Kontrol Putar */}
        <div className="flex items-center gap-2 ml-1">
          <button 
            onClick={togglePlay}
            className="bg-black/90 text-white p-2.5 rounded-full hover:scale-110 active:scale-95 transition-transform shadow-md"
          >
            {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
          </button>
          <button 
            onClick={nextSong}
            className="hover:text-neo-pink p-2 transition-colors bg-white/50 rounded-full hover:bg-white/80 shadow-sm hover:scale-105 active:scale-95"
          >
            <SkipForward size={14} />
          </button>
        </div>
      </div>
      <audio 
        ref={audioRef}
        onEnded={nextSong}
        src={currentSong.url}
      />
    </div>
  );
}
