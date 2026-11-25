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
  Repeat,
  Repeat1,
} from 'lucide-react';
import {
  resolveSongStream,
  preloadSongStream,
  playResolvedStream,
  detachAudioStream,
  unlockAudioOnGesture,
} from '@/src/lib/audioStream';

interface Track {
  title: string;
  artist: string;
  id: string;
  targetDuration: number;
}

const PLAYLIST: Track[] = [
  {
    title: 'Kita Ke Sana',
    artist: 'Hindia',
    id: 'hindia-kita-ke-sana',
    targetDuration: 283,
  },
  {
    title: 'Tujuh Belas',
    artist: 'Tulus',
    id: 'tulus-17',
    targetDuration: 255,
  },
  {
    title: 'Graduation Song',
    artist: 'Murphy Radio',
    id: 'murphy-radio-graduation-song',
    targetDuration: 336,
  },
];

export const MusicPlayer: React.FC = () => {
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [loopMode, setLoopMode] = useState<'all' | 'one'>('all');
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.85);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(PLAYLIST[0].targetDuration);
  const [waitingForInteraction, setWaitingForInteraction] = useState(true);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const volumePopoverRef = useRef<HTMLDivElement | null>(null);
  const volumeTrackRef = useRef<HTMLDivElement | null>(null);
  const previousVolumeRef = useRef(0.85);
  const cleanupStreamRef = useRef<(() => void) | null>(null);
  const loadedTrackIndexRef = useRef<number | null>(null);
  const userPausedRef = useRef(false);
  const hasStartedOnceRef = useRef(false);
  const currentTrackIndexRef = useRef(currentTrackIndex);
  const loopModeRef = useRef<'all' | 'one'>(loopMode);
  const isPlayingRef = useRef(isPlaying);
  const isMutedRef = useRef(isMuted);
  const volumeRef = useRef(volume);
  const pausedByNoteRef = useRef(false);
  const noteAudioActiveRef = useRef(false);
  const lastEndedAtRef = useRef(0);

  useEffect(() => {
    currentTrackIndexRef.current = currentTrackIndex;
  }, [currentTrackIndex]);

  useEffect(() => {
    loopModeRef.current = loopMode;
  }, [loopMode]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  // Close vertical volume slider when clicking outside
  useEffect(() => {
    if (!showVolumeSlider) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (
        volumePopoverRef.current &&
        !volumePopoverRef.current.contains(e.target as Node)
      ) {
        setShowVolumeSlider(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showVolumeSlider]);

  const currentTrack = PLAYLIST[currentTrackIndex];

  // Preload all playlist tracks on mount for instant ad-free switching
  useEffect(() => {
    PLAYLIST.forEach((track) => {
      preloadSongStream(track.title, track.artist, undefined, track.targetDuration);
    });
  }, []);

  const loadAndPlayTrack = useCallback(async (index: number, autoPlay: boolean) => {
    const track = PLAYLIST[index];
    const audio = audioRef.current;
    if (!audio || !track) return;

    if (cleanupStreamRef.current) {
      cleanupStreamRef.current();
      cleanupStreamRef.current = null;
    }

    currentTrackIndexRef.current = index;
    loadedTrackIndexRef.current = index;
    setDuration(track.targetDuration);

    const stream = await resolveSongStream(
      track.title,
      track.artist,
      undefined,
      track.targetDuration
    );

    if (!stream || currentTrackIndexRef.current !== index) return;

    const shouldAutoPlay =
      autoPlay && !userPausedRef.current && !noteAudioActiveRef.current;

    cleanupStreamRef.current = playResolvedStream({
      audio,
      stream,
      startTime: 0,
      volume: volumeRef.current,
      muted: isMutedRef.current,
      autoPlay: shouldAutoPlay,
      onReady: (dur) => {
        if (dur > 0) setDuration(dur);
      },
      onPlayStateChange: (playing) => {
        setIsPlaying(playing);
        if (playing) {
          setWaitingForInteraction(false);
          hasStartedOnceRef.current = true;
        } else if (!userPausedRef.current && !noteAudioActiveRef.current) {
          setWaitingForInteraction(true);
        }
      },
    });
  }, []);

  const attemptPlay = useCallback(() => {
    if (userPausedRef.current) return;
    if (noteAudioActiveRef.current) {
      pausedByNoteRef.current = true;
      setWaitingForInteraction(false);
      hasStartedOnceRef.current = true;
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;

    if (loadedTrackIndexRef.current !== currentTrackIndexRef.current || !audio.src) {
      unlockAudioOnGesture(audio);
      void loadAndPlayTrack(currentTrackIndexRef.current, true);
      return;
    }

    audio.volume = volumeRef.current;
    audio.muted = isMutedRef.current;
    audio
      .play()
      .then(() => {
        setIsPlaying(true);
        setWaitingForInteraction(false);
        hasStartedOnceRef.current = true;
      })
      .catch(() => {
        setWaitingForInteraction(true);
      });
  }, [loadAndPlayTrack]);

  // Initial load on mount
  useEffect(() => {
    void loadAndPlayTrack(0, true);
    return () => {
      if (cleanupStreamRef.current) {
        cleanupStreamRef.current();
        cleanupStreamRef.current = null;
      }
      detachAudioStream(audioRef.current);
    };
  }, [loadAndPlayTrack]);

  // Listen for note/roster audio start/stop events to auto-pause and auto-resume background music
  useEffect(() => {
    const handleNoteAudioStart = () => {
      noteAudioActiveRef.current = true;
      if (isPlayingRef.current || !userPausedRef.current) {
        pausedByNoteRef.current = true;
        setWaitingForInteraction(false);
        hasStartedOnceRef.current = true;
      }
      audioRef.current?.pause();
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

  // Unlock and play on user touch/click/key anywhere on the screen (including mobile auto-next recovery)
  useEffect(() => {
    if (!waitingForInteraction || isPlaying) return;

    const handleInteraction = () => {
      if (!userPausedRef.current && !noteAudioActiveRef.current && !isPlayingRef.current) {
        attemptPlay();
      }
    };

    window.addEventListener('click', handleInteraction, { passive: true });
    window.addEventListener('touchstart', handleInteraction, { passive: true });
    window.addEventListener('touchend', handleInteraction, { passive: true });
    window.addEventListener('pointerdown', handleInteraction, { passive: true });
    window.addEventListener('keydown', handleInteraction, { passive: true });

    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('touchend', handleInteraction);
      window.removeEventListener('pointerdown', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
  }, [waitingForInteraction, isPlaying, attemptPlay]);

  const switchTrack = useCallback(
    (nextIndex: number) => {
      userPausedRef.current = false;
      hasStartedOnceRef.current = true;
      setWaitingForInteraction(false);
      currentTrackIndexRef.current = nextIndex;
      setCurrentTrackIndex(nextIndex);
      setProgress(0);
      setCurrentTime(0);

      if (audioRef.current) {
        unlockAudioOnGesture(audioRef.current);
      }
      void loadAndPlayTrack(nextIndex, true);
    },
    [loadAndPlayTrack]
  );

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      userPausedRef.current = true;
      audio.pause();
      setIsPlaying(false);
    } else {
      userPausedRef.current = false;
      hasStartedOnceRef.current = true;
      setWaitingForInteraction(false);
      if (loadedTrackIndexRef.current !== currentTrackIndexRef.current || !audio.src) {
        unlockAudioOnGesture(audio);
        void loadAndPlayTrack(currentTrackIndexRef.current, true);
      } else {
        audio
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => {});
      }
    }
  };

  const nextTrack = useCallback(
    (e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      const nextIndex = (currentTrackIndexRef.current + 1) % PLAYLIST.length;
      switchTrack(nextIndex);
    },
    [switchTrack]
  );

  const prevTrack = useCallback(
    (e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      const prevIndex =
        (currentTrackIndexRef.current - 1 + PLAYLIST.length) % PLAYLIST.length;
      switchTrack(prevIndex);
    },
    [switchTrack]
  );

  const handleTrackEnded = useCallback(() => {
    const now = Date.now();
    if (now - lastEndedAtRef.current < 800) return;
    lastEndedAtRef.current = now;

    if (loopModeRef.current === 'one') {
      const audio = audioRef.current;
      if (audio && audio.src) {
        try {
          audio.currentTime = 0;
          setCurrentTime(0);
          setProgress(0);
          void audio.play().then(() => setIsPlaying(true));
          return;
        } catch {
          // Fall through to reload current track
        }
      }
      switchTrack(currentTrackIndexRef.current);
    } else {
      // Auto-advance to the next song and loop back to first song after the end of playlist
      const nextIndex = (currentTrackIndexRef.current + 1) % PLAYLIST.length;
      switchTrack(nextIndex);
    }
  }, [switchTrack]);

  const applyVolumeLevel = useCallback((nextVolume: number) => {
    const clamped = Math.max(0, Math.min(1, nextVolume));
    setVolume(clamped);
    volumeRef.current = clamped;

    if (clamped > 0) {
      previousVolumeRef.current = clamped;
      setIsMuted(false);
      isMutedRef.current = false;
    } else {
      setIsMuted(true);
      isMutedRef.current = true;
    }

    if (audioRef.current) {
      audioRef.current.volume = clamped;
      audioRef.current.muted = clamped === 0;
    }
  }, []);

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMuted || volume === 0) {
      const restored = previousVolumeRef.current > 0.05 ? previousVolumeRef.current : 0.85;
      applyVolumeLevel(restored);
    } else {
      previousVolumeRef.current = volume;
      setIsMuted(true);
      isMutedRef.current = true;
      if (audioRef.current) {
        audioRef.current.muted = true;
      }
    }
  };

  const updateVolumeFromClientY = useCallback(
    (clientY: number) => {
      const trackEl = volumeTrackRef.current;
      if (!trackEl) return;
      const rect = trackEl.getBoundingClientRect();
      // Top of vertical bar = 1.0 (100%), Bottom = 0.0 (0%)
      const ratio = 1 - (clientY - rect.top) / rect.height;
      applyVolumeLevel(ratio);
    },
    [applyVolumeLevel]
  );

  const handleVolumePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    updateVolumeFromClientY(e.clientY);
  };

  const handleVolumePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    e.stopPropagation();
    updateVolumeFromClientY(e.clientY);
  };

  const handleVolumePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio || duration <= 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = ratio * duration;

    try {
      audio.currentTime = targetTime;
      setCurrentTime(targetTime);
      setProgress(ratio * 100);
    } catch {
      // Ignore seek error before metadata ready
    }
  };

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const curr = audio.currentTime || 0;
    const dur =
      audio.duration && isFinite(audio.duration) && audio.duration > 0
        ? audio.duration
        : duration;
    setCurrentTime(curr);
    if (dur > 0) {
      setDuration(dur);
      setProgress(Math.min(100, (curr / dur) * 100));
      if (
        audio.ended ||
        (dur > 10 &&
          curr >= dur - 0.25 &&
          audio.paused &&
          !userPausedRef.current &&
          !noteAudioActiveRef.current &&
          hasStartedOnceRef.current)
      ) {
        handleTrackEnded();
      }
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const effectiveVolume = isMuted ? 0 : volume;
  const volumePercent = Math.round(effectiveVolume * 100);

  return (
    <div className="fixed bottom-3 right-3 sm:bottom-6 sm:right-6 z-[100]">
      {/* Direct Ad-Free HTML5 Audio Element */}
      <audio
        ref={audioRef}
        playsInline
        preload="auto"
        onTimeUpdate={handleTimeUpdate}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={handleTrackEnded}
      />

      {isMinimized ? (
        <button
          onClick={() => setIsMinimized(false)}
          className="w-12 h-12 rounded-full bg-black/85 backdrop-blur-xl border border-white/15 flex items-center justify-center text-white shadow-2xl hover:scale-105 transition-transform group relative"
          title={`${currentTrack.title} - ${currentTrack.artist}`}
        >
          <Disc3
            className={`w-5 h-5 ${
              isPlaying ? 'text-emerald-400 animate-spin' : 'text-zinc-400'
            }`}
            style={{ animationDuration: '4s' }}
          />
          {isPlaying && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-ping" />
          )}
          {isPlaying && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full" />
          )}
        </button>
      ) : (
        <div className="bg-black/90 backdrop-blur-xl border border-white/15 rounded-2xl p-3 sm:p-3.5 shadow-2xl flex flex-col gap-2.5 w-[calc(100vw-24px)] max-w-[300px] sm:w-72 transition-all relative">
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-2 overflow-hidden min-w-0">
              <div
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/10 ${
                  isPlaying ? 'text-emerald-400' : 'text-zinc-400'
                }`}
              >
                <Disc3
                  className={`w-4 h-4 sm:w-5 sm:h-5 ${isPlaying ? 'animate-spin' : ''}`}
                  style={{ animationDuration: '4s' }}
                />
              </div>
              <div className="truncate min-w-0">
                <p className="text-xs font-semibold text-white truncate">
                  {currentTrack.title}
                </p>
                <p className="text-[11px] text-zinc-400 truncate">
                  {currentTrack.artist}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
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
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLoopMode((prev) => (prev === 'all' ? 'one' : 'all'));
                }}
                className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 flex items-center justify-center transition-colors"
                title={
                  loopMode === 'all'
                    ? 'Loop Playlist Aktif (Otomatis Next) — Ketuk untuk Loop 1 Lagu'
                    : 'Loop 1 Lagu Aktif — Ketuk untuk Loop Playlist'
                }
              >
                {loopMode === 'all' ? (
                  <Repeat className="w-3.5 h-3.5" />
                ) : (
                  <Repeat1 className="w-3.5 h-3.5" />
                )}
              </button>
              <button
                onClick={() => setShowPlaylist((prev) => !prev)}
                className={`w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors ${
                  showPlaylist
                    ? 'text-emerald-400 bg-white/10'
                    : 'text-zinc-400 hover:text-white'
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
              <div className="flex items-center gap-1.5">
                {waitingForInteraction && !isPlaying ? (
                  <span className="text-emerald-400 animate-pulse">
                    Ketuk layar untuk memutar
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLoopMode((prev) => (prev === 'all' ? 'one' : 'all'));
                    }}
                    className="text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/15 hover:bg-emerald-500/25 font-medium"
                  >
                    {loopMode === 'all' ? (
                      <>
                        <Repeat className="w-3 h-3" />
                        <span>Loop Playlist</span>
                      </>
                    ) : (
                      <>
                        <Repeat1 className="w-3 h-3" />
                        <span>Loop 1 Lagu</span>
                      </>
                    )}
                  </button>
                )}

                {/* Vertical Volume Slider Trigger & Popover */}
                <div
                  ref={volumePopoverRef}
                  className="relative flex items-center"
                  onMouseEnter={() => setShowVolumeSlider(true)}
                  onMouseLeave={() => setShowVolumeSlider(false)}
                >
                  {showVolumeSlider && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute bottom-full left-1/2 -translate-x-1/2 pb-2 z-30"
                    >
                      <div className="bg-zinc-900/95 backdrop-blur-xl border border-white/15 rounded-xl px-2.5 py-3 shadow-2xl flex flex-col items-center gap-2 w-10">
                        <span className="text-[9px] font-semibold text-zinc-300 tabular-nums select-none">
                          {volumePercent}%
                        </span>

                        {/* Vertical Slider Track */}
                        <div
                          ref={volumeTrackRef}
                          onPointerDown={handleVolumePointerDown}
                          onPointerMove={handleVolumePointerMove}
                          onPointerUp={handleVolumePointerUp}
                          onPointerCancel={handleVolumePointerUp}
                          className="h-24 w-4 flex items-center justify-center cursor-pointer touch-none select-none py-0.5"
                          title={`Volume: ${volumePercent}%`}
                        >
                          <div className="relative h-full w-1.5 bg-white/15 rounded-full overflow-visible">
                            <div
                              className="absolute bottom-0 left-0 right-0 bg-emerald-400 rounded-full transition-[height] duration-75"
                              style={{ height: `${volumePercent}%` }}
                            />
                            <div
                              className="absolute left-1/2 -translate-x-1/2 translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 border-emerald-500 shadow transition-[bottom] duration-75"
                              style={{ bottom: `${volumePercent}%` }}
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={toggleMute}
                          className="text-zinc-400 hover:text-white transition-colors pt-0.5"
                          title={effectiveVolume === 0 ? 'Bunyikan' : 'Bisukan'}
                        >
                          {effectiveVolume === 0 ? (
                            <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowVolumeSlider((prev) => !prev);
                    }}
                    className={`hover:text-white transition-colors flex items-center gap-1 px-1 py-0.5 rounded ${
                      showVolumeSlider ? 'text-emerald-400 bg-white/10' : ''
                    }`}
                    title={`Atur Volume (${volumePercent}%)`}
                  >
                    {effectiveVolume === 0 ? (
                      <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <span>{formatTime(duration)}</span>
              </div>
            </div>
          </div>

          {/* Tracklist Selector with Mobile Loop Playlist Toggle */}
          {showPlaylist && (
            <div className="pt-2 border-t border-white/10 flex flex-col gap-1.5">
              <div className="flex items-center justify-between px-1 pb-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                  Daftar Lagu
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLoopMode((prev) => (prev === 'all' ? 'one' : 'all'));
                  }}
                  className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/15 hover:bg-emerald-500/25 px-2 py-0.5 rounded-md transition-colors"
                >
                  {loopMode === 'all' ? (
                    <>
                      <Repeat className="w-3 h-3" />
                      <span>Loop Playlist (Auto Next)</span>
                    </>
                  ) : (
                    <>
                      <Repeat1 className="w-3 h-3" />
                      <span>Loop 1 Lagu</span>
                    </>
                  )}
                </button>
              </div>
              {PLAYLIST.map((track, idx) => {
                const active = idx === currentTrackIndex;
                return (
                  <button
                    key={track.id}
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
                      <span className="text-[10px] text-emerald-400 ml-2 shrink-0">
                        Diputar
                      </span>
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
