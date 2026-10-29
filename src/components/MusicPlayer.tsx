import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Minimize2,
  ListMusic,
  Disc3,
} from 'lucide-react';
import { AudioEqualizer } from './AudioEqualizer';

interface Track {
  title: string;
  artist: string;
  videoId: string;
  searchQuery: string;
}

const PLAYLIST: Track[] = [
  {
    title: '17',
    artist: 'Tulus',
    videoId: 'zswUe4xU-c8',
    searchQuery: 'Tulus Tujuh Belas',
  },
  {
    title: 'Kita Ke Sana',
    artist: 'Hindia',
    videoId: 'DrulgpXAGCA',
    searchQuery: 'Hindia Kita Ke Sana',
  },
  {
    title: 'Graduation Song',
    artist: 'Murphy Radio',
    videoId: 'LM9Ron2I4h0',
    searchQuery: 'Murphy Radio Graduation Song',
  },
];

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

export const MusicPlayer: React.FC = () => {
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [usingFallbackAudio, setUsingFallbackAudio] = useState(false);
  const [waitingForInteraction, setWaitingForInteraction] = useState(true);

  const ytPlayerRef = useRef<any>(null);
  const ytContainerRef = useRef<HTMLDivElement | null>(null);
  const fallbackAudioRef = useRef<HTMLAudioElement | null>(null);
  const userPausedRef = useRef(false);
  const hasStartedOnceRef = useRef(false);
  const currentTrackIndexRef = useRef(currentTrackIndex);
  const isPlayingRef = useRef(isPlaying);
  const usingFallbackAudioRef = useRef(usingFallbackAudio);
  const pausedByNoteRef = useRef(false);
  const noteAudioActiveRef = useRef(false);

  useEffect(() => {
    currentTrackIndexRef.current = currentTrackIndex;
  }, [currentTrackIndex]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    usingFallbackAudioRef.current = usingFallbackAudio;
  }, [usingFallbackAudio]);

  const currentTrack = PLAYLIST[currentTrackIndex];

  const loadFallbackTrack = useCallback(async (index: number, autoPlay: boolean) => {
    const track = PLAYLIST[index];
    try {
      const res = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(track.searchQuery)}&entity=song&limit=1`
      );
      const data = await res.json();
      const previewUrl = data?.results?.[0]?.previewUrl;
      if (previewUrl && fallbackAudioRef.current) {
        fallbackAudioRef.current.src = previewUrl;
        fallbackAudioRef.current.volume = 0.8;
        if (autoPlay && !userPausedRef.current && !noteAudioActiveRef.current) {
          fallbackAudioRef.current
            .play()
            .then(() => {
              setIsPlaying(true);
              setWaitingForInteraction(false);
              hasStartedOnceRef.current = true;
            })
            .catch(() => {
              setWaitingForInteraction(true);
            });
        }
      }
    } catch {
      // Ignore network errors on fallback lookup
    }
  }, []);

  const attemptPlay = useCallback(() => {
    if (userPausedRef.current) return;
    if (noteAudioActiveRef.current) {
      pausedByNoteRef.current = true;
      setWaitingForInteraction(false);
      hasStartedOnceRef.current = true;
      return;
    }

    if (usingFallbackAudioRef.current) {
      if (fallbackAudioRef.current) {
        if (!fallbackAudioRef.current.src) {
          loadFallbackTrack(currentTrackIndexRef.current, true);
        } else {
          fallbackAudioRef.current
            .play()
            .then(() => {
              setIsPlaying(true);
              setWaitingForInteraction(false);
              hasStartedOnceRef.current = true;
            })
            .catch(() => {});
        }
      }
      return;
    }

    const player = ytPlayerRef.current;
    if (player && typeof player.playVideo === 'function') {
      try {
        player.unMute?.();
        player.setVolume?.(85);
        player.playVideo();
      } catch {
        // Ignore until ready
      }
    }
  }, [loadFallbackTrack]);

  // Listen for note audio start/stop events to auto-pause and auto-resume background music
  useEffect(() => {
    const handleNoteAudioStart = () => {
      noteAudioActiveRef.current = true;
      if (isPlayingRef.current || !userPausedRef.current) {
        pausedByNoteRef.current = true;
        setWaitingForInteraction(false);
        hasStartedOnceRef.current = true;
      }
      if (usingFallbackAudioRef.current) {
        fallbackAudioRef.current?.pause();
      } else {
        ytPlayerRef.current?.pauseVideo?.();
      }
      setIsPlaying(false);
    };

    const handleNoteAudioStop = () => {
      noteAudioActiveRef.current = false;
      if (pausedByNoteRef.current && !userPausedRef.current) {
        pausedByNoteRef.current = false;
        attemptPlay();
      }
    };

    window.addEventListener('note-audio-start', handleNoteAudioStart);
    window.addEventListener('note-audio-stop', handleNoteAudioStop);
    return () => {
      window.removeEventListener('note-audio-start', handleNoteAudioStart);
      window.removeEventListener('note-audio-stop', handleNoteAudioStop);
    };
  }, [attemptPlay]);

  // Initialize YouTube IFrame API
  useEffect(() => {
    let isMounted = true;

    const createPlayer = () => {
      if (!isMounted || !ytContainerRef.current || !window.YT?.Player) return;
      if (ytPlayerRef.current) return;

      ytPlayerRef.current = new window.YT.Player(ytContainerRef.current, {
        height: '1',
        width: '1',
        videoId: PLAYLIST[currentTrackIndexRef.current].videoId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
        },
        events: {
          onReady: (event: any) => {
            if (!isMounted) return;
            try {
              event.target.unMute();
              event.target.setVolume(85);
              event.target.playVideo();
            } catch {
              // Autoplay blocked until interaction
            }
          },
          onStateChange: (event: any) => {
            if (!isMounted) return;
            const YTState = window.YT?.PlayerState;
            if (!YTState) return;

            if (event.data === YTState.PLAYING) {
              setIsPlaying(true);
              setWaitingForInteraction(false);
              hasStartedOnceRef.current = true;
              const dur = event.target.getDuration?.() || 0;
              if (dur > 0) setDuration(dur);
            } else if (event.data === YTState.PAUSED) {
              setIsPlaying(false);
            } else if (event.data === YTState.ENDED) {
              const nextIndex = (currentTrackIndexRef.current + 1) % PLAYLIST.length;
              setCurrentTrackIndex(nextIndex);
              setProgress(0);
              setCurrentTime(0);
              event.target.loadVideoById(PLAYLIST[nextIndex].videoId);
              event.target.playVideo();
            } else if (event.data === YTState.UNSTARTED || event.data === YTState.CUED) {
              if (!userPausedRef.current && !hasStartedOnceRef.current) {
                setWaitingForInteraction(true);
              }
            }
          },
          onError: () => {
            if (!isMounted) return;
            setUsingFallbackAudio(true);
            loadFallbackTrack(currentTrackIndexRef.current, !userPausedRef.current);
          },
        },
      });
    };

    if (window.YT && window.YT.Player) {
      createPlayer();
    } else {
      const existingScript = document.querySelector(
        'script[src="https://www.youtube.com/iframe_api"]'
      );
      if (!existingScript) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        tag.async = true;
        tag.onerror = () => {
          if (isMounted) {
            setUsingFallbackAudio(true);
            loadFallbackTrack(currentTrackIndexRef.current, true);
          }
        };
        document.head.appendChild(tag);
      }

      const prevCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof prevCallback === 'function') prevCallback();
        createPlayer();
      };
    }

    return () => {
      isMounted = false;
      if (ytPlayerRef.current && typeof ytPlayerRef.current.destroy === 'function') {
        try {
          ytPlayerRef.current.destroy();
        } catch {
          // Ignore cleanup errors
        }
        ytPlayerRef.current = null;
      }
    };
  }, [loadFallbackTrack]);

  // Unlock and play on first user touch/click/key/scroll anywhere on the screen
  useEffect(() => {
    if (!waitingForInteraction || isPlaying) return;

    const handleFirstInteraction = () => {
      if (!userPausedRef.current && !hasStartedOnceRef.current) {
        attemptPlay();
      }
    };

    window.addEventListener('click', handleFirstInteraction, { passive: true });
    window.addEventListener('touchstart', handleFirstInteraction, { passive: true });
    window.addEventListener('pointerdown', handleFirstInteraction, { passive: true });
    window.addEventListener('keydown', handleFirstInteraction, { passive: true });
    window.addEventListener('scroll', handleFirstInteraction, { passive: true });

    return () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
      window.removeEventListener('pointerdown', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
      window.removeEventListener('scroll', handleFirstInteraction);
    };
  }, [waitingForInteraction, isPlaying, attemptPlay]);

  // Poll YouTube playback progress
  useEffect(() => {
    if (usingFallbackAudio || !isPlaying) return;

    const interval = setInterval(() => {
      const player = ytPlayerRef.current;
      if (player && typeof player.getCurrentTime === 'function') {
        const curr = player.getCurrentTime() || 0;
        const dur = player.getDuration() || 0;
        setCurrentTime(curr);
        if (dur > 0) {
          setDuration(dur);
          setProgress((curr / dur) * 100);
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [usingFallbackAudio, isPlaying]);

  const switchTrack = (nextIndex: number) => {
    userPausedRef.current = false;
    setCurrentTrackIndex(nextIndex);
    setProgress(0);
    setCurrentTime(0);

    if (usingFallbackAudio) {
      loadFallbackTrack(nextIndex, true);
    } else if (ytPlayerRef.current && typeof ytPlayerRef.current.loadVideoById === 'function') {
      ytPlayerRef.current.loadVideoById(PLAYLIST[nextIndex].videoId);
      ytPlayerRef.current.playVideo();
      setIsPlaying(true);
    }
  };

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isPlaying) {
      userPausedRef.current = true;
      if (usingFallbackAudio) {
        fallbackAudioRef.current?.pause();
      } else {
        ytPlayerRef.current?.pauseVideo?.();
      }
      setIsPlaying(false);
    } else {
      userPausedRef.current = false;
      hasStartedOnceRef.current = true;
      setWaitingForInteraction(false);
      if (usingFallbackAudio) {
        if (!fallbackAudioRef.current?.src) {
          loadFallbackTrack(currentTrackIndex, true);
        } else {
          fallbackAudioRef.current?.play().catch(() => {});
          setIsPlaying(true);
        }
      } else {
        ytPlayerRef.current?.unMute?.();
        ytPlayerRef.current?.playVideo?.();
        setIsPlaying(true);
      }
    }
  };

  const nextTrack = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const nextIndex = (currentTrackIndex + 1) % PLAYLIST.length;
    switchTrack(nextIndex);
  };

  const prevTrack = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const prevIndex = (currentTrackIndex - 1 + PLAYLIST.length) % PLAYLIST.length;
    switchTrack(prevIndex);
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);

    if (usingFallbackAudio && fallbackAudioRef.current) {
      fallbackAudioRef.current.muted = nextMuted;
    } else if (ytPlayerRef.current) {
      if (nextMuted) {
        ytPlayerRef.current.mute?.();
      } else {
        ytPlayerRef.current.unMute?.();
      }
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));

    if (usingFallbackAudio && fallbackAudioRef.current?.duration) {
      const targetTime = ratio * fallbackAudioRef.current.duration;
      fallbackAudioRef.current.currentTime = targetTime;
      setProgress(ratio * 100);
    } else if (ytPlayerRef.current && duration > 0) {
      const targetTime = ratio * duration;
      ytPlayerRef.current.seekTo?.(targetTime, true);
      setCurrentTime(targetTime);
      setProgress(ratio * 100);
    }
  };

  const handleFallbackTimeUpdate = () => {
    if (fallbackAudioRef.current) {
      const curr = fallbackAudioRef.current.currentTime;
      const dur = fallbackAudioRef.current.duration;
      setCurrentTime(curr);
      if (dur > 0) {
        setDuration(dur);
        setProgress((curr / dur) * 100);
      }
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      {/* Hidden YouTube player container */}
      <div
        className="pointer-events-none fixed -bottom-10 -right-10 h-px w-px overflow-hidden opacity-0"
        aria-hidden="true"
      >
        <div ref={ytContainerRef} />
      </div>

      {/* Fallback HTML5 Audio */}
      <audio
        ref={fallbackAudioRef}
        crossOrigin="anonymous"
        onTimeUpdate={handleFallbackTimeUpdate}
        onEnded={() => nextTrack()}
      />

      {isMinimized ? (
        <button
          onClick={() => setIsMinimized(false)}
          className="w-12 h-12 rounded-full bg-black/85 backdrop-blur-xl border border-white/15 flex items-center justify-center text-white shadow-2xl hover:scale-105 transition-transform group relative"
          title={`${currentTrack.title} - ${currentTrack.artist}`}
        >
          {isPlaying && !isMuted ? (
            <AudioEqualizer
              isPlaying={isPlaying}
              isMuted={isMuted}
              audioElement={usingFallbackAudio ? fallbackAudioRef.current : null}
              currentTime={currentTime}
              trackSeed={currentTrackIndex}
              variant="mini"
            />
          ) : (
            <Disc3
              className={`w-5 h-5 ${
                isPlaying ? 'text-emerald-400 animate-spin' : 'text-zinc-400'
              }`}
              style={{ animationDuration: '4s' }}
            />
          )}
          {isPlaying && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-ping" />
          )}
          {isPlaying && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full" />
          )}
        </button>
      ) : (
        <div className="bg-black/85 backdrop-blur-xl border border-white/15 rounded-2xl p-3.5 shadow-2xl flex flex-col gap-2.5 w-76 transition-all">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div
                className={`w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/10 ${
                  isPlaying ? 'text-emerald-400' : 'text-zinc-400'
                }`}
              >
                <Disc3
                  className={`w-5 h-5 ${isPlaying ? 'animate-spin' : ''}`}
                  style={{ animationDuration: '4s' }}
                />
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-white truncate">
                  {currentTrack.title}
                </p>
                <p className="text-[11px] text-zinc-400 truncate">
                  {currentTrack.artist}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={prevTrack}
                className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                title="Lagu Sebelumnya"
              >
                <SkipBack className="w-3.5 h-3.5 fill-current" />
              </button>
              <button
                onClick={togglePlay}
                className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform shadow"
                title={isPlaying ? 'Jeda' : 'Putar'}
              >
                {isPlaying ? (
                  <Pause className="w-3.5 h-3.5 fill-current" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                )}
              </button>
              <button
                onClick={nextTrack}
                className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                title="Lagu Selanjutnya"
              >
                <SkipForward className="w-3.5 h-3.5 fill-current" />
              </button>
              <button
                onClick={() => setShowPlaylist((prev) => !prev)}
                className={`w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors ${
                  showPlaylist ? 'text-emerald-400 bg-white/10' : 'text-zinc-400 hover:text-white'
                }`}
                title="Daftar Lagu"
              >
                <ListMusic className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsMinimized(true)}
                className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                title="Kecilkan"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Dynamic Amplitude-Reactive Visual Equalizer */}
          <AudioEqualizer
            isPlaying={isPlaying}
            isMuted={isMuted}
            audioElement={usingFallbackAudio ? fallbackAudioRef.current : null}
            currentTime={currentTime}
            trackSeed={currentTrackIndex}
          />

          {/* Interactive Progress Bar */}
          <div className="flex flex-col gap-1">
            <div
              onClick={handleSeek}
              className="w-full h-1.5 bg-white/15 rounded-full overflow-hidden cursor-pointer group py-0.5"
            >
              <div
                className="h-full bg-emerald-400 group-hover:bg-emerald-300 rounded-full transition-all duration-150"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-zinc-400">
              <span>{formatTime(currentTime)}</span>
              <div className="flex items-center gap-2">
                {waitingForInteraction && !isPlaying && (
                  <span className="text-emerald-400 animate-pulse">
                    Ketuk layar untuk memutar
                  </span>
                )}
                <button
                  onClick={toggleMute}
                  className="hover:text-white transition-colors"
                  title={isMuted ? 'Bunyikan' : 'Bisukan'}
                >
                  {isMuted ? (
                    <VolumeX className="w-3 h-3 text-rose-400" />
                  ) : (
                    <Volume2 className="w-3 h-3" />
                  )}
                </button>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          </div>

          {/* Tracklist Selector */}
          {showPlaylist && (
            <div className="pt-2 border-t border-white/10 flex flex-col gap-1">
              {PLAYLIST.map((track, idx) => {
                const active = idx === currentTrackIndex;
                return (
                  <button
                    key={track.videoId}
                    onClick={() => switchTrack(idx)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                      active
                        ? 'bg-emerald-500/20 text-emerald-300 font-medium'
                        : 'text-zinc-300 hover:bg-white/5'
                    }`}
                  >
                    <span className="truncate">
                      {idx + 1}. {track.title} — {track.artist}
                    </span>
                    {active && isPlaying && (
                      <div className="flex items-center gap-1.5 ml-2 shrink-0">
                        <AudioEqualizer
                          isPlaying={isPlaying}
                          isMuted={isMuted}
                          audioElement={usingFallbackAudio ? fallbackAudioRef.current : null}
                          currentTime={currentTime}
                          trackSeed={currentTrackIndex}
                          variant="mini"
                        />
                        <span className="text-[10px] text-emerald-400">
                          Diputar
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MusicPlayer;

