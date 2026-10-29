import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import confetti from "canvas-confetti";
import toast from "react-hot-toast";
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, setDoc } from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import { useRole } from "@/src/hooks/useRole";
import { Message, Student } from "@/src/types";
import { Trash2, Send, Users, Music, X, Search, Pencil, Play, Pause, RotateCcw, Sliders } from "lucide-react";
import { motion } from "motion/react";

const COLORS: string[] = ["yellow", "cyan", "green", "pink", "orange", "purple", "blue", "lime", "red", "mahogany"];
const COLOR_CLASSES: Record<string, string> = {
  yellow: "bg-neo-yellow",
  cyan: "bg-neo-cyan",
  green: "bg-neo-green",
  pink: "bg-neo-pink",
  orange: "bg-neo-orange",
  purple: "bg-neo-purple",
  blue: "bg-neo-blue",
  lime: "bg-neo-lime",
  red: "bg-neo-red",
  mahogany: "bg-neo-mahogany",
};

interface AttachedSong {
  title: string;
  artist: string;
  coverUrl: string;
  previewUrl?: string;
  videoId?: string;
  duration?: number;
  startTime?: number;
}

const CLIP_DURATION = 30; // 30-second looping snippet like Instagram Music Notes

const formatSeconds = (sec: number) => {
  if (!sec || !isFinite(sec) || sec < 0) return "0:00";
  const mins = Math.floor(sec / 60);
  const secs = Math.floor(sec % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
};

const videoIdCache = new Map<string, string>();

async function resolveYouTubeVideoId(title: string, artist: string): Promise<string | null> {
  const cacheKey = `${title} - ${artist}`.toLowerCase();
  if (videoIdCache.has(cacheKey)) {
    return videoIdCache.get(cacheKey)!;
  }

  const query = `${title} ${artist}`;

  // 1. Try Vite server middleware endpoint first
  try {
    const base = import.meta.env.BASE_URL || "/";
    const apiPath = `${base.endsWith("/") ? base : base + "/"}api/yt-search?q=${encodeURIComponent(query)}`;
    const res = await fetch(apiPath);
    if (res.ok) {
      const data = await res.json();
      if (data?.videoId) {
        videoIdCache.set(cacheKey, data.videoId);
        return data.videoId;
      }
    }
  } catch {
    // Fall through to public Piped APIs
  }

  // 2. Fallback to public Piped API instances for static/production builds
  const pipedInstances = [
    "https://pipedapi.kavin.rocks",
    "https://pipedapi.tokhmi.xyz",
    "https://pipedapi.moomoo.me",
  ];

  for (const instance of pipedInstances) {
    try {
      const res = await fetch(
        `${instance}/search?q=${encodeURIComponent(query + " official audio")}&filter=music_songs`
      );
      if (res.ok) {
        const data = await res.json();
        const firstUrl: string | undefined = data?.items?.[0]?.url;
        if (firstUrl) {
          const match = firstUrl.match(/v=([a-zA-Z0-9_-]{11})/);
          if (match?.[1]) {
            videoIdCache.set(cacheKey, match[1]);
            return match[1];
          }
        }
      }
    } catch {
      // Try next instance
    }
  }

  return null;
}

export default function ConfessionBoard() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const { isAdmin } = useRole();
  const [selectedNote, setSelectedNote] = useState<Message | null>(null);

  // Shared YouTube IFrame Player for Note & Preview full-song playback
  const noteYtContainerRef = useRef<HTMLDivElement | null>(null);
  const noteYtPlayerRef = useRef<any>(null);
  const noteYtReadyRef = useRef(false);
  const activeModeRef = useRef<"none" | "preview" | "note">("none");
  const pendingActionRef = useRef<(() => void) | null>(null);

  // Audio playback state for opened Note modal
  const noteAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isNoteSongPlaying, setIsNoteSongPlaying] = useState(false);
  const [isLoadingNoteSong, setIsLoadingNoteSong] = useState(false);
  const [noteSongCurrentTime, setNoteSongCurrentTime] = useState(0);
  const [noteSongDuration, setNoteSongDuration] = useState(180);
  const [usingNoteYt, setUsingNoteYt] = useState(false);

  // Smooth progress interpolation refs
  const lastPolledTimeRef = useRef<{ mediaTime: number; perfTime: number }>({
    mediaTime: 0,
    perfTime: 0,
  });

  // Audio preview state inside "Attach Song" modal (for setting full-song start time)
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [isResolvingVideo, setIsResolvingVideo] = useState(false);
  const [previewDuration, setPreviewDuration] = useState(210);
  const [draftSong, setDraftSong] = useState<AttachedSong | null>(null);
  const draftSongRef = useRef<AttachedSong | null>(null);

  useEffect(() => {
    draftSongRef.current = draftSong;
  }, [draftSong]);

  // Initialize hidden YouTube Player for ConfessionBoard full-song playback
  useEffect(() => {
    let isMounted = true;

    const initYtPlayer = () => {
      if (!isMounted || !noteYtContainerRef.current || !window.YT?.Player) return;
      if (noteYtPlayerRef.current) return;

      noteYtPlayerRef.current = new window.YT.Player(noteYtContainerRef.current, {
        height: "1",
        width: "1",
        videoId: "",
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
        },
        events: {
          onReady: () => {
            if (!isMounted) return;
            noteYtReadyRef.current = true;
            if (pendingActionRef.current) {
              const fn = pendingActionRef.current;
              pendingActionRef.current = null;
              fn();
            }
          },
          onStateChange: (event: any) => {
            if (!isMounted) return;
            const YTState = window.YT?.PlayerState;
            if (!YTState) return;

            const mode = activeModeRef.current;
            if (mode === "note") {
              if (event.data === YTState.PLAYING) {
                setIsNoteSongPlaying(true);
                setIsLoadingNoteSong(false);
                const dur = event.target.getDuration?.() || 0;
                if (dur > 0) setNoteSongDuration(dur);
                const curr = event.target.getCurrentTime?.() || 0;
                lastPolledTimeRef.current = {
                  mediaTime: curr,
                  perfTime: performance.now(),
                };
              } else if (event.data === YTState.PAUSED) {
                setIsNoteSongPlaying(false);
              } else if (event.data === YTState.BUFFERING) {
                setIsLoadingNoteSong(true);
              } else if (event.data === YTState.ENDED) {
                const startSec = selectedNote?.song?.startTime ?? 0;
                event.target.seekTo?.(startSec, true);
                event.target.playVideo?.();
              }
            } else if (mode === "preview") {
              if (event.data === YTState.PLAYING) {
                setIsPreviewPlaying(true);
                const dur = event.target.getDuration?.() || 0;
                if (dur > 0) {
                  setPreviewDuration(dur);
                  setDraftSong((prev) => (prev ? { ...prev, duration: Math.round(dur) } : prev));
                }
              } else if (event.data === YTState.PAUSED || event.data === YTState.ENDED) {
                setIsPreviewPlaying(false);
              }
            }
          },
        },
      });
    };

    if (window.YT && window.YT.Player) {
      initYtPlayer();
    } else {
      const existingScript = document.querySelector(
        'script[src="https://www.youtube.com/iframe_api"]'
      );
      if (!existingScript) {
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        tag.async = true;
        document.head.appendChild(tag);
      }
      const prevCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof prevCallback === "function") prevCallback();
        initYtPlayer();
      };
    }

    return () => {
      isMounted = false;
      if (noteYtPlayerRef.current && typeof noteYtPlayerRef.current.destroy === "function") {
        try {
          noteYtPlayerRef.current.destroy();
        } catch {}
        noteYtPlayerRef.current = null;
        noteYtReadyRef.current = false;
      }
    };
  }, []);

  // Rate Limiting Logic
  const canPost = () => {
    const historyString = localStorage.getItem("confession_timestamps");
    if (!historyString) return true;
    try {
      const history = JSON.parse(historyString) as number[];
      const twelveHoursAgo = Date.now() - 12 * 60 * 60 * 1000;
      const recent = history.filter(t => t > twelveHoursAgo);
      return recent.length < 5;
    } catch {
      return true;
    }
  };

  const recordPost = () => {
    const historyString = localStorage.getItem("confession_timestamps");
    let history: number[] = [];
    try {
      if (historyString) history = JSON.parse(historyString);
    } catch {}
    const twelveHoursAgo = Date.now() - 12 * 60 * 60 * 1000;
    history = history.filter(t => t > twelveHoursAgo);
    history.push(Date.now());
    localStorage.setItem("confession_timestamps", JSON.stringify(history));
  };

  // Form State
  const [newMessage, setNewMessage] = useState({ 
    nickname: "", 
    content: "", 
    color: COLORS[Math.floor(Math.random() * COLORS.length)] 
  });
  
  // Modals & Optional Features
  const [showToModal, setShowToModal] = useState(false);
  const [showSongModal, setShowSongModal] = useState(false);
  const [showSpamModal, setShowSpamModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  const [editingMessage, setEditingMessage] = useState<{id: string, content: string, editReason: string} | null>(null);
  
  const [selectedTo, setSelectedTo] = useState<string | null>(null);
  const [selectedSong, setSelectedSong] = useState<AttachedSong | null>(null);

  useEffect(() => {
    if (showToModal || showSongModal || showSpamModal || showEditModal || selectedNote) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [showToModal, showSongModal, showSpamModal, showEditModal, selectedNote]);
  
  const [songSearch, setSongSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [songResults, setSongResults] = useState<any[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "messages"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(data.sort((a, b) => b.createdAt - a.createdAt));
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "students"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
      setStudents(data.sort((a, b) => a.name.localeCompare(b.name)));
    });
    return unsub;
  }, []);

  // Stop preview audio when closing the song attachment modal
  const stopPreviewAudio = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.src = "";
    }
    if (activeModeRef.current === "preview" && noteYtPlayerRef.current) {
      try {
        noteYtPlayerRef.current.pauseVideo?.();
      } catch {}
      activeModeRef.current = "none";
    }
    if (isPreviewPlaying) {
      setIsPreviewPlaying(false);
      window.dispatchEvent(new CustomEvent("note-audio-stop"));
    }
  };

  const closeSongModal = () => {
    stopPreviewAudio();
    setShowSongModal(false);
  };

  const openSongModal = () => {
    if (selectedSong) {
      setDraftSong({ ...selectedSong, startTime: selectedSong.startTime ?? 0 });
      setPreviewDuration(selectedSong.duration || 210);
    } else {
      setDraftSong(null);
    }
    setShowSongModal(true);
  };

  // Play or pause the selected song from startTime inside Attach Song modal (using full YouTube track)
  const togglePreviewPlay = async (songToPlay?: AttachedSong) => {
    const target = songToPlay || draftSongRef.current;
    if (!target) return;

    if (isPreviewPlaying && !songToPlay) {
      if (activeModeRef.current === "preview" && noteYtPlayerRef.current) {
        try {
          noteYtPlayerRef.current.pauseVideo?.();
        } catch {}
      }
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      setIsPreviewPlaying(false);
      window.dispatchEvent(new CustomEvent("note-audio-stop"));
      return;
    }

    window.dispatchEvent(new CustomEvent("note-audio-start"));
    const startSec = target.startTime ?? 0;

    let videoId = target.videoId;
    if (!videoId) {
      setIsResolvingVideo(true);
      videoId = (await resolveYouTubeVideoId(target.title, target.artist)) || undefined;
      setIsResolvingVideo(false);
      if (videoId) {
        setDraftSong((prev) =>
          prev && prev.title === target.title ? { ...prev, videoId } : prev
        );
      }
    }

    if (videoId && noteYtPlayerRef.current && noteYtReadyRef.current) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      activeModeRef.current = "preview";
      try {
        noteYtPlayerRef.current.unMute?.();
        noteYtPlayerRef.current.setVolume?.(90);
        noteYtPlayerRef.current.loadVideoById({
          videoId,
          startSeconds: startSec,
        });
        noteYtPlayerRef.current.playVideo?.();
        setIsPreviewPlaying(true);
        return;
      } catch {
        // Fall back to previewUrl if YouTube player fails
      }
    }

    // Fallback to iTunes previewUrl if YouTube videoId could not be resolved
    if (!target.previewUrl) {
      toast.error("Pratinjau audio tidak tersedia untuk lagu ini");
      return;
    }

    if (!previewAudioRef.current) {
      previewAudioRef.current = new Audio();
      previewAudioRef.current.addEventListener("ended", () => {
        setIsPreviewPlaying(false);
        window.dispatchEvent(new CustomEvent("note-audio-stop"));
      });
    }

    const audio = previewAudioRef.current;
    if (audio.src !== target.previewUrl) {
      audio.src = target.previewUrl;
    }
    audio.currentTime = Math.min(startSec, 25);
    audio.volume = 0.9;
    audio
      .play()
      .then(() => {
        setIsPreviewPlaying(true);
      })
      .catch(() => {
        setIsPreviewPlaying(false);
      });
  };

  // Auto-stop preview after 30 seconds in Attach Song modal (Instagram Note style)
  useEffect(() => {
    if (!isPreviewPlaying || activeModeRef.current !== "preview") return;
    const interval = setInterval(() => {
      const player = noteYtPlayerRef.current;
      const currentDraft = draftSongRef.current;
      if (player && typeof player.getCurrentTime === "function" && currentDraft) {
        const curr = player.getCurrentTime() || 0;
        const startSec = currentDraft.startTime ?? 0;
        if (curr >= startSec + CLIP_DURATION) {
          player.seekTo?.(startSec, true);
        }
      }
    }, 300);
    return () => clearInterval(interval);
  }, [isPreviewPlaying]);

  const handleDraftStartTimeChange = (newStart: number) => {
    if (!draftSong) return;
    const updated = { ...draftSong, startTime: newStart };
    setDraftSong(updated);

    if (activeModeRef.current === "preview" && noteYtPlayerRef.current && isPreviewPlaying) {
      try {
        noteYtPlayerRef.current.seekTo?.(newStart, true);
      } catch {}
    } else if (previewAudioRef.current && isPreviewPlaying) {
      previewAudioRef.current.currentTime = Math.min(newStart, 25);
    }
  };

  // Auto-play 30-second song clip from startTime when a Note with a song is opened
  useEffect(() => {
    if (!selectedNote || !selectedNote.song) {
      if (noteAudioRef.current) {
        noteAudioRef.current.pause();
        noteAudioRef.current.src = "";
      }
      if (activeModeRef.current === "note" && noteYtPlayerRef.current) {
        try {
          noteYtPlayerRef.current.pauseVideo?.();
        } catch {}
        activeModeRef.current = "none";
      }
      setIsNoteSongPlaying(false);
      setIsLoadingNoteSong(false);
      setNoteSongCurrentTime(0);
      setUsingNoteYt(false);
      return;
    }

    let cancelled = false;
    const song = selectedNote.song;
    const clipStart = song.startTime ?? 0;
    const initialFullDur = song.duration && song.duration > 30 ? song.duration : Math.max(180, clipStart + CLIP_DURATION);

    // Pause background web music immediately
    window.dispatchEvent(new CustomEvent("note-audio-start"));
    setIsLoadingNoteSong(true);
    setNoteSongDuration(initialFullDur);
    setNoteSongCurrentTime(clipStart);
    lastPolledTimeRef.current = {
      mediaTime: clipStart,
      perfTime: performance.now(),
    };

    const startNoteAudio = async () => {
      // 1. Resolve full song YouTube videoId (stored on note or resolved dynamically)
      let videoId = song.videoId;
      if (!videoId) {
        videoId = (await resolveYouTubeVideoId(song.title, song.artist)) || undefined;
      }

      if (cancelled) return;

      const playViaYouTube = (vid: string) => {
        if (cancelled || !noteYtPlayerRef.current) return;
        activeModeRef.current = "note";
        setUsingNoteYt(true);
        try {
          noteYtPlayerRef.current.unMute?.();
          noteYtPlayerRef.current.setVolume?.(90);
          noteYtPlayerRef.current.loadVideoById({
            videoId: vid,
            startSeconds: clipStart,
          });
          noteYtPlayerRef.current.playVideo?.();
        } catch {
          // Will fallback if error
        }
      };

      if (videoId) {
        if (noteYtReadyRef.current && noteYtPlayerRef.current) {
          playViaYouTube(videoId);
          return;
        } else {
          pendingActionRef.current = () => playViaYouTube(videoId!);
          return;
        }
      }

      // 2. Fallback to HTML5 audio previewUrl if YouTube is unavailable
      setUsingNoteYt(false);
      let audioUrl = song.previewUrl;
      if (!audioUrl) {
        try {
          const query = `${song.title} ${song.artist}`;
          const res = await fetch(
            `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=1`
          );
          const data = await res.json();
          audioUrl = data?.results?.[0]?.previewUrl;
        } catch (err) {
          console.error(err);
        }
      }

      if (cancelled) return;

      if (!audioUrl) {
        setIsLoadingNoteSong(false);
        return;
      }

      if (!noteAudioRef.current) {
        noteAudioRef.current = new Audio();
      }

      const audio = noteAudioRef.current;
      audio.pause();
      audio.src = audioUrl;
      audio.volume = 0.9;

      audio.onloadedmetadata = () => {
        if (cancelled) return;
        const dur = audio.duration && isFinite(audio.duration) ? audio.duration : 30;
        setNoteSongDuration(dur);
        const safeStart = Math.min(clipStart, Math.max(0, dur - 2));
        audio.currentTime = safeStart;
        setNoteSongCurrentTime(safeStart);
        lastPolledTimeRef.current = {
          mediaTime: safeStart,
          perfTime: performance.now(),
        };
        setIsLoadingNoteSong(false);
        audio
          .play()
          .then(() => {
            if (!cancelled) setIsNoteSongPlaying(true);
          })
          .catch(() => {
            if (!cancelled) setIsNoteSongPlaying(false);
          });
      };

      audio.onended = () => {
        if (!cancelled) {
          const safeStart = Math.min(clipStart, Math.max(0, (audio.duration || 30) - 2));
          audio.currentTime = safeStart;
          setNoteSongCurrentTime(safeStart);
          lastPolledTimeRef.current = {
            mediaTime: safeStart,
            perfTime: performance.now(),
          };
          audio.play().catch(() => setIsNoteSongPlaying(false));
        }
      };

      audio.onerror = () => {
        if (!cancelled) {
          setIsLoadingNoteSong(false);
          setIsNoteSongPlaying(false);
        }
      };

      audio.load();
    };

    startNoteAudio();

    return () => {
      cancelled = true;
      pendingActionRef.current = null;
      if (noteAudioRef.current) {
        noteAudioRef.current.pause();
        noteAudioRef.current.src = "";
      }
      if (activeModeRef.current === "note" && noteYtPlayerRef.current) {
        try {
          noteYtPlayerRef.current.pauseVideo?.();
        } catch {}
        activeModeRef.current = "none";
      }
      setIsNoteSongPlaying(false);
      setIsLoadingNoteSong(false);
      setUsingNoteYt(false);
      // Resume background web music when note modal closes
      window.dispatchEvent(new CustomEvent("note-audio-stop"));
    };
  }, [selectedNote]);

  // Smooth 50ms progress bar updater & 30-second Instagram Note loop enforcement
  useEffect(() => {
    if (!selectedNote?.song || !isNoteSongPlaying) return;

    const clipStart = selectedNote.song.startTime ?? 0;
    const clipEnd = Math.min(noteSongDuration, clipStart + CLIP_DURATION);

    const interval = setInterval(() => {
      if (usingNoteYt && noteYtPlayerRef.current && typeof noteYtPlayerRef.current.getCurrentTime === "function") {
        const rawCurr = noteYtPlayerRef.current.getCurrentTime() || 0;
        const rawDur = noteYtPlayerRef.current.getDuration?.() || 0;
        if (rawDur > 0 && Math.abs(rawDur - noteSongDuration) > 1) {
          setNoteSongDuration(rawDur);
        }

        // Loop back to clipStart when 30-second snippet finishes
        const effectiveEnd = rawDur > 0 ? Math.min(rawDur, clipStart + CLIP_DURATION) : clipEnd;
        if (rawCurr >= effectiveEnd) {
          noteYtPlayerRef.current.seekTo?.(clipStart, true);
          lastPolledTimeRef.current = {
            mediaTime: clipStart,
            perfTime: performance.now(),
          };
          setNoteSongCurrentTime(clipStart);
          return;
        }

        // Smooth interpolation between YouTube API time updates
        if (Math.abs(rawCurr - lastPolledTimeRef.current.mediaTime) > 0.02) {
          lastPolledTimeRef.current = {
            mediaTime: rawCurr,
            perfTime: performance.now(),
          };
          setNoteSongCurrentTime(rawCurr);
        } else {
          const elapsedSec = (performance.now() - lastPolledTimeRef.current.perfTime) / 1000;
          const interpolated = Math.min(effectiveEnd, lastPolledTimeRef.current.mediaTime + elapsedSec);
          setNoteSongCurrentTime(interpolated);
        }
      } else if (noteAudioRef.current) {
        const curr = noteAudioRef.current.currentTime;
        const dur = noteAudioRef.current.duration || 30;
        const safeStart = Math.min(clipStart, Math.max(0, dur - 2));
        const effectiveEnd = Math.min(dur, safeStart + CLIP_DURATION);
        if (curr >= effectiveEnd) {
          noteAudioRef.current.currentTime = safeStart;
          setNoteSongCurrentTime(safeStart);
        } else {
          setNoteSongCurrentTime(curr);
        }
      }
    }, 50);

    return () => clearInterval(interval);
  }, [selectedNote, isNoteSongPlaying, usingNoteYt, noteSongDuration]);

  const toggleNoteSongPlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (usingNoteYt && noteYtPlayerRef.current) {
      if (isNoteSongPlaying) {
        noteYtPlayerRef.current.pauseVideo?.();
        setIsNoteSongPlaying(false);
      } else {
        window.dispatchEvent(new CustomEvent("note-audio-start"));
        noteYtPlayerRef.current.playVideo?.();
        setIsNoteSongPlaying(true);
      }
      return;
    }

    const audio = noteAudioRef.current;
    if (!audio || !audio.src) return;

    if (isNoteSongPlaying) {
      audio.pause();
      setIsNoteSongPlaying(false);
    } else {
      window.dispatchEvent(new CustomEvent("note-audio-start"));
      audio
        .play()
        .then(() => setIsNoteSongPlaying(true))
        .catch(() => {});
    }
  };

  const replayNoteSongFromStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedNote?.song) return;
    const clipStart = selectedNote.song.startTime ?? 0;
    window.dispatchEvent(new CustomEvent("note-audio-start"));

    if (usingNoteYt && noteYtPlayerRef.current) {
      noteYtPlayerRef.current.seekTo?.(clipStart, true);
      noteYtPlayerRef.current.playVideo?.();
      lastPolledTimeRef.current = {
        mediaTime: clipStart,
        perfTime: performance.now(),
      };
      setNoteSongCurrentTime(clipStart);
      setIsNoteSongPlaying(true);
      return;
    }

    const audio = noteAudioRef.current;
    if (!audio || !audio.src) return;
    const safeStart = Math.min(clipStart, Math.max(0, (audio.duration || 30) - 2));
    audio.currentTime = safeStart;
    setNoteSongCurrentTime(safeStart);
    audio
      .play()
      .then(() => setIsNoteSongPlaying(true))
      .catch(() => {});
  };

  const handleNoteSongSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!selectedNote?.song) return;
    const clipStart = selectedNote.song.startTime ?? 0;
    const effectiveClipLen = Math.max(
      1,
      Math.min(CLIP_DURATION, noteSongDuration - clipStart)
    );
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = clipStart + ratio * effectiveClipLen;

    if (usingNoteYt && noteYtPlayerRef.current) {
      noteYtPlayerRef.current.seekTo?.(targetTime, true);
      lastPolledTimeRef.current = {
        mediaTime: targetTime,
        perfTime: performance.now(),
      };
      setNoteSongCurrentTime(targetTime);
      return;
    }

    const audio = noteAudioRef.current;
    if (!audio || !noteSongDuration) return;
    audio.currentTime = Math.min(targetTime, noteSongDuration);
    setNoteSongCurrentTime(Math.min(targetTime, noteSongDuration));
  };

  const searchSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!songSearch) return;
    setIsSearching(true);
    try {
      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(songSearch)}&entity=song&limit=5`);
      const data = await res.json();
      setSongResults(data.results || []);
    } catch (err) {
      console.error(err);
    }
    setIsSearching(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.content) return;
    
    if (!isAdmin && !canPost()) {
      setShowSpamModal(true);
      return;
    }

    try {
      const msgData: any = { 
        ...newMessage, 
        nickname: newMessage.nickname || "ANONYMOUS",
        createdAt: Date.now() 
      };
      
      if (selectedTo) msgData.to = selectedTo;
      if (selectedSong) msgData.song = selectedSong;

      await addDoc(collection(db, "messages"), msgData);
      
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FFE81E', '#FF57B6', '#00E5FF', '#00E676', '#B800FF']
      });
      
      if (!isAdmin) recordPost();
      
      toast.success("Pesan berhasil dikirim!", { id: 'app-toast', duration: 3000 });
      
      setNewMessage({ nickname: "", content: "", color: COLORS[Math.floor(Math.random() * COLORS.length)] });
      setSelectedTo(null);
      setSelectedSong(null);
      setDraftSong(null);
    } catch (err) {
      console.error(err);
      toast.error("Gagal mengirim pesan!", { id: 'app-toast', duration: 3000 });
    }
  };

  const handleDelete = async (id: string) => {
    const msgToDel = messages.find(m => m.id === id);
    if (!msgToDel) return;
    try {
      await deleteDoc(doc(db, "messages", id));
      toast((t) => (
        <div className="flex items-center gap-3">
          <span className="font-bold text-sm">Note deleted</span>
          <button onClick={() => {
            toast.dismiss(t.id);
            setDoc(doc(db, "messages", id), msgToDel);
            toast.success("Note restored!");
          }} className="bg-neo-cyan px-2 py-1 font-bold border-2 border-[#000] shadow-[2px_2px_0_0_#000] text-xs">
            UNDO
          </button>
        </div>
      ), { duration: 4000 });
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMessage) return;
    
    const originalMsg = messages.find(m => m.id === editingMessage.id);
    if (!originalMsg) return;
    
    try {
      await updateDoc(doc(db, "messages", editingMessage.id), {
        content: editingMessage.content,
        isEdited: true,
        editReason: editingMessage.editReason || "Censored by admin"
      });
      
      toast((t) => (
        <div className="flex items-center gap-3">
          <span className="font-bold text-sm">Note updated</span>
          <button onClick={() => {
            toast.dismiss(t.id);
            updateDoc(doc(db, "messages", originalMsg.id!), {
              content: originalMsg.content,
              isEdited: originalMsg.isEdited || false,
              editReason: originalMsg.editReason || null
            });
            toast.success("Edit undone!");
          }} className="bg-neo-cyan px-2 py-1 font-bold border-2 border-[#000] shadow-[2px_2px_0_0_#000] text-xs">
            UNDO
          </button>
        </div>
      ), { duration: 4000 });
      
      setShowEditModal(false);
      setEditingMessage(null);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <section id="board" className="w-full border-t-4 border-[#000] graph-paper-pink relative z-10">
    {/* Hidden YouTube Player Container for Full-Song Note & Preview Playback */}
    <div
      className="pointer-events-none fixed -bottom-10 -left-10 h-px w-px overflow-hidden opacity-0"
      aria-hidden="true"
    >
      <div ref={noteYtContainerRef} />
    </div>

    <div className="p-4 sm:p-8 max-w-7xl mx-auto">
      <div className="mb-6 sm:mb-8">
        <span className="bg-neo-green border-2 border-[#000] px-2.5 sm:px-3 py-0.5 sm:py-1 font-bold text-[10px] sm:text-xs uppercase tracking-widest text-[#000] shadow-[2px_2px_0_0_#000] sm:shadow-[3px_3px_0_0_#000]">CHAPTER 02</span>
        <h2 className="text-3xl sm:text-5xl md:text-7xl font-black uppercase mt-3 sm:mt-6 tracking-tight break-words">Confession Board</h2>
        <p className="mt-2 sm:mt-4 font-medium text-xs sm:text-base md:text-lg max-w-2xl text-gray-800 leading-relaxed">
          Bisa pakai nama asli, nama panggilan, atau anonim. Tulisanmu bisa dibaca semua orang, dan hanya bisa mengirim 5 note sehari ya.
        </p>
      </div>

      <div className="bg-[#fff] border-2 border-[#000] p-3 sm:p-6 mb-6 sm:mb-12 shadow-[4px_4px_0_0_#000] sm:shadow-[6px_6px_0_0_#000] max-w-4xl relative z-10">
        <form onSubmit={handleAdd} className="flex flex-col gap-3 sm:gap-4">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            <input 
              type="text" 
              className="input-brutal text-xs sm:text-sm sm:max-w-[220px]" 
              placeholder="Nickname (empty = anon)" 
              value={newMessage.nickname} 
              maxLength={30}
              onChange={e => setNewMessage({...newMessage, nickname: e.target.value.toUpperCase()})} 
            />
            <input 
              type="text" 
              className="input-brutal text-xs sm:text-sm flex-1" 
              placeholder="Your message to the whole class..." 
              value={newMessage.content} 
              maxLength={500}
              onChange={e => setNewMessage({...newMessage, content: e.target.value})} 
              required 
            />
          </div>

          {selectedSong && (
            <div className="flex items-center justify-between gap-2 bg-neo-pink/30 border-2 border-[#000] p-2 sm:p-2.5 shadow-[2px_2px_0_0_#000]">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <img src={selectedSong.coverUrl} alt="cover" className="w-9 h-9 border-2 border-[#000] shrink-0" />
                <div className="overflow-hidden">
                  <p className="font-black text-xs sm:text-sm truncate uppercase">{selectedSong.title}</p>
                  <p className="text-[10px] sm:text-xs font-bold text-gray-700 truncate">
                    {selectedSong.artist} · <span className="bg-neo-yellow px-1 border border-[#000] text-[#000]">Mulai {formatSeconds(selectedSong.startTime ?? 0)}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={openSongModal}
                  className="bg-neo-cyan border-2 border-[#000] px-2 py-1 text-[10px] sm:text-xs font-black uppercase shadow-[2px_2px_0_0_#000] hover:bg-cyan-300 flex items-center gap-1"
                >
                  <Sliders size={12} /> Atur Bagian
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSong(null)}
                  className="bg-neo-red text-[#fff] border-2 border-[#000] p-1 shadow-[2px_2px_0_0_#000] hover:bg-red-500"
                  title="Hapus Lagu"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          )}
          
          <div className="flex flex-wrap gap-2 sm:gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-1.5 sm:gap-2 items-center">
              <button type="submit" className="btn-brutal bg-neo-green hover:bg-green-400 text-xs sm:text-sm py-2 px-3 sm:py-2.5 sm:px-5">
                <Send size={14} className="sm:w-4 sm:h-4" /> Pin It
              </button>
              
              <button type="button" onClick={() => setShowToModal(true)} className={`btn-brutal text-xs sm:text-sm py-2 px-2.5 sm:py-2.5 sm:px-5 ${selectedTo ? 'bg-neo-cyan' : 'bg-[#fff] hover:bg-gray-100'}`}>
                <Users size={14} className="sm:w-4 sm:h-4" /> {selectedTo ? `To: ${selectedTo}` : 'To'}
              </button>
              
              <button type="button" onClick={openSongModal} className={`btn-brutal text-xs sm:text-sm py-2 px-2.5 sm:py-2.5 sm:px-5 ${selectedSong ? 'bg-neo-pink' : 'bg-[#fff] hover:bg-gray-100'}`}>
                <Music size={14} className="sm:w-4 sm:h-4" /> {selectedSong ? 'Song Added' : 'Song'}
              </button>
            </div>
            
            <div className="flex gap-1 items-center overflow-x-auto py-1">
              {COLORS.map(c => (
                <button 
                  key={c}
                  type="button"
                  onClick={() => setNewMessage({...newMessage, color: c})}
                  className={`w-5 h-5 sm:w-6 sm:h-6 border-2 border-[#000] shrink-0 ${COLOR_CLASSES[c]} ${newMessage.color === c ? 'scale-125 shadow-[1px_1px_0_0_#000]' : 'opacity-70 hover:opacity-100'} transition-all rounded-full cursor-pointer`}
                />
              ))}
            </div>
          </div>
        </form>
      </div>

      {/* Modals for To and Song */}
      {showToModal && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 bg-[#000]/50 z-50 flex items-center justify-center p-4">
          <div className="bg-[#fff] border-4 border-[#000] p-4 sm:p-6 w-full max-w-md shadow-[6px_6px_0_0_#000] max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-xl sm:text-2xl uppercase">Send To...</h3>
              <button onClick={() => setShowToModal(false)} className="p-1 hover:bg-gray-200 border-2 border-[#000] rounded-full"><X size={18} /></button>
            </div>
            <div className="overflow-y-auto flex-1 border-2 border-[#000] p-2 space-y-1 sm:space-y-2 text-xs sm:text-sm">
              <button 
                onClick={() => { setSelectedTo(null); setShowToModal(false); }}
                className="w-full text-left p-2 hover:bg-neo-cyan font-bold uppercase border-b-2 border-dashed border-gray-300"
              >
                (Everyone)
              </button>
              {students.map(s => (
                <button 
                  key={s.id}
                  onClick={() => { setSelectedTo(s.name); setShowToModal(false); }}
                  className="w-full text-left p-2 hover:bg-neo-cyan font-bold border-b-2 border-dashed border-gray-300 truncate"
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      , document.body)}

      {showSongModal && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 bg-[#000]/50 z-50 flex items-center justify-center p-4">
          <div className="bg-[#fff] border-4 border-[#000] p-4 sm:p-6 w-full max-w-md shadow-[6px_6px_0_0_#000] max-h-[88vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-xl sm:text-2xl uppercase">Attach Song</h3>
              <button onClick={closeSongModal} className="p-1 hover:bg-gray-200 border-2 border-[#000] rounded-full"><X size={18} /></button>
            </div>
            
            <form onSubmit={searchSong} className="flex gap-2 mb-3">
              <input 
                type="text" 
                className="input-brutal flex-1 text-xs sm:text-sm" 
                placeholder="Cari judul lagu atau penyanyi..." 
                value={songSearch}
                onChange={e => setSongSearch(e.target.value)}
              />
              <button type="submit" className="btn-brutal bg-neo-cyan px-3" disabled={isSearching}>
                <Search size={18} />
              </button>
            </form>

            {/* Full-Song Start Time Configurator (Instagram Note Style) when a song is selected */}
            {draftSong && (() => {
              const fullSongMax = Math.max(
                30,
                Math.floor((draftSong.duration || previewDuration || 210) - 5)
              );
              const currentStart = draftSong.startTime ?? 0;
              const clipEndPreview = Math.min(
                draftSong.duration || previewDuration || 210,
                currentStart + CLIP_DURATION
              );

              return (
                <div className="mb-3 p-3 bg-neo-yellow border-2 border-[#000] shadow-[3px_3px_0_0_#000] flex flex-col gap-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <img src={draftSong.coverUrl} alt="cover" className="w-11 h-11 border-2 border-[#000] shrink-0" />
                      <div className="overflow-hidden">
                        <span className="inline-block bg-[#000] text-[#fff] text-[9px] font-black uppercase px-1.5 py-0.5 mb-0.5">
                          Lagu Terpilih
                        </span>
                        <p className="font-black text-xs sm:text-sm truncate uppercase">{draftSong.title}</p>
                        <p className="text-[10px] sm:text-xs font-bold text-gray-800 truncate">{draftSong.artist}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => togglePreviewPlay()}
                      disabled={isResolvingVideo}
                      className="btn-brutal bg-neo-pink text-[#000] px-2.5 py-1.5 text-xs shrink-0 flex items-center gap-1"
                    >
                      {isPreviewPlaying ? <Pause size={14} /> : <Play size={14} />}
                      {isResolvingVideo ? "Memuat..." : isPreviewPlaying ? "Stop" : "Putar"}
                    </button>
                  </div>

                  <div className="bg-[#fff] border-2 border-[#000] p-2.5 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs font-black uppercase">
                      <span className="flex items-center gap-1">
                        <Sliders size={13} /> MULAI BAGIAN LAGU
                      </span>
                      <span className="bg-neo-cyan px-2 py-0.5 border border-[#000]">
                        {formatSeconds(currentStart)} - {formatSeconds(clipEndPreview)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={fullSongMax}
                      step={1}
                      value={Math.min(currentStart, fullSongMax)}
                      onChange={(e) => handleDraftStartTimeChange(Number(e.target.value))}
                      className="w-full accent-black cursor-pointer h-2 bg-gray-200 border border-[#000]"
                    />
                    <div className="flex justify-between text-[10px] font-bold text-gray-600">
                      <span>0:00</span>
                      <span>Pilih bagian lagu (klip 30 detik)</span>
                      <span>{formatSeconds(draftSong.duration || previewDuration || 210)}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSong(draftSong);
                        closeSongModal();
                      }}
                      className="btn-brutal bg-neo-green hover:bg-green-400 flex-1 text-xs py-2"
                    >
                      SIMPAN LAGU
                    </button>
                  </div>
                </div>
              );
            })()}
            
            <div className="overflow-y-auto flex-1 space-y-2 sm:space-y-2.5 pr-1">
              {songResults.map(song => {
                const isSelected = draftSong?.title === song.trackName && draftSong?.artist === song.artistName;
                const fullTrackDurationSec = song.trackTimeMillis
                  ? Math.round(song.trackTimeMillis / 1000)
                  : 210;
                return (
                  <div 
                    key={song.trackId}
                    className={`flex items-center justify-between gap-2 sm:gap-3 p-2 border-2 border-[#000] cursor-pointer transition-colors ${
                      isSelected ? 'bg-neo-pink shadow-[2px_2px_0_0_#000]' : 'hover:bg-neo-cyan/40 bg-[#fff]'
                    }`}
                    onClick={async () => {
                      const picked: AttachedSong = {
                        title: song.trackName,
                        artist: song.artistName,
                        coverUrl: song.artworkUrl100,
                        previewUrl: song.previewUrl,
                        duration: fullTrackDurationSec,
                        startTime: 0,
                      };
                      setPreviewDuration(fullTrackDurationSec);
                      setDraftSong(picked);
                      togglePreviewPlay(picked);
                    }}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <img src={song.artworkUrl100} alt="cover" className="w-10 h-10 border-2 border-[#000] shrink-0" />
                      <div className="overflow-hidden">
                        <p className="font-bold text-xs sm:text-sm truncate">{song.trackName}</p>
                        <p className="text-[10px] sm:text-xs truncate text-gray-700">
                          {song.artistName} · {formatSeconds(fullTrackDurationSec)}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-black uppercase bg-neo-yellow border border-[#000] px-2 py-1 shrink-0">
                      Pilih Lagu
                    </span>
                  </div>
                );
              })}
              {songResults.length === 0 && !isSearching && songSearch && (
                <p className="text-center font-bold text-xs opacity-50 p-4">Lagu tidak ditemukan.</p>
              )}
              {isSearching && (
                <p className="text-center font-bold text-xs p-4">Mencari lagu...</p>
              )}
            </div>
            
            {(selectedSong || draftSong) && (
              <button 
                onClick={() => {
                  setSelectedSong(null);
                  setDraftSong(null);
                  closeSongModal();
                }}
                className="mt-3 btn-brutal bg-red-400 text-[#fff] w-full text-xs py-2"
              >
                Hapus Lampiran Lagu
              </button>
            )}
          </div>
        </div>
      , document.body)}

      {showSpamModal && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 bg-[#000]/50 z-50 flex items-center justify-center p-4">
          <div className="bg-neo-red border-4 border-[#000] p-6 sm:p-8 w-full max-w-md shadow-[8px_8px_0_0_#000] text-center">
            <h3 className="font-black text-2xl sm:text-3xl uppercase mb-3 text-[#fff]">Hold Up! 🛑</h3>
            <p className="font-bold text-sm sm:text-lg mb-6 text-[#fff] leading-relaxed">
              Kamu sudah mengirim 5 note dalam 12 jam terakhir. Beri kesempatan yang lain ya!
            </p>
            <button 
              onClick={() => setShowSpamModal(false)}
              className="btn-brutal bg-[#fff] hover:bg-gray-100 w-full text-xs sm:text-sm"
            >
              Okay, I'll wait
            </button>
          </div>
        </div>
      , document.body)}

      {showEditModal && editingMessage && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 bg-[#000]/50 z-50 flex items-center justify-center p-4">
          <div className="bg-[#fff] border-4 border-[#000] p-4 sm:p-6 w-full max-w-md shadow-[6px_6px_0_0_#000] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-xl sm:text-2xl uppercase">Edit Note</h3>
              <button onClick={() => setShowEditModal(false)} className="p-1 hover:bg-gray-200 border-2 border-[#000] rounded-full"><X size={18} /></button>
            </div>
            <form onSubmit={handleEditSubmit} className="flex flex-col gap-3 sm:gap-4">
              <div>
                <label className="font-bold text-xs sm:text-sm uppercase block mb-1">Censored Content</label>
                <textarea 
                  className="input-brutal w-full resize-none h-24 text-xs sm:text-sm" 
                  value={editingMessage.content}
                  onChange={e => setEditingMessage({...editingMessage, content: e.target.value})}
                  required 
                />
              </div>
              <div>
                <label className="font-bold text-xs sm:text-sm uppercase block mb-1">Reason for Edit</label>
                <input 
                  type="text" 
                  className="input-brutal w-full text-xs sm:text-sm" 
                  placeholder="e.g. Toxic language removed" 
                  value={editingMessage.editReason}
                  onChange={e => setEditingMessage({...editingMessage, editReason: e.target.value})}
                  required 
                />
              </div>
              <button type="submit" className="btn-brutal bg-neo-yellow hover:bg-yellow-400 text-xs sm:text-sm">
                Save Changes
              </button>
            </form>
          </div>
        </div>
      , document.body)}

      {/* Masonry Layout: 3 columns on mobile, up to 6 on desktop */}
      <div className="columns-3 sm:columns-3 md:columns-4 lg:columns-6 gap-2 sm:gap-4">
        {messages.map((msg) => {
          const date = new Date(msg.createdAt);
          const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const dateString = date.toLocaleDateString([], { day: '2-digit', month: 'short' }).toUpperCase();
          const bgClass = COLOR_CLASSES[msg.color] || "bg-neo-yellow";
          
          return (
            <div 
              key={msg.id} 
              onClick={() => setSelectedNote(msg)}
              className={`p-2 sm:p-3 mb-2 sm:mb-4 relative group border sm:border-2 border-[#000] shadow-[2px_2px_0_0_#000] flex flex-col break-inside-avoid cursor-pointer hover:-translate-y-1 hover:shadow-[3px_3px_0_0_#000] transition-all ${bgClass}`}
            >
              {isAdmin && (
                <div className="absolute top-1 right-1 sm:top-2 sm:right-2 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-10">
                  <button onClick={(e) => {
                    e.stopPropagation();
                    setEditingMessage({ id: msg.id!, content: msg.content, editReason: msg.editReason || "" });
                    setShowEditModal(true);
                  }} className="text-[#000] hover:text-blue-500 bg-[#fff] border border-[#000] rounded-full p-0.5 sm:p-1 shadow-[1px_1px_0_0_#000]">
                    <Pencil size={11} className="sm:w-3.5 sm:h-3.5" />
                  </button>
                  <button onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(msg.id!);
                  }} className="text-[#000] hover:text-red-500 bg-[#fff] border border-[#000] rounded-full p-0.5 sm:p-1 shadow-[1px_1px_0_0_#000]">
                    <Trash2 size={11} className="sm:w-3.5 sm:h-3.5" />
                  </button>
                </div>
              )}
              
              {msg.to && (
                <div className="font-bold text-[7px] sm:text-[10px] uppercase tracking-wide border-b border-[#000]/20 pb-0.5 mb-1 sm:mb-2 truncate">
                  To: {msg.to}
                </div>
              )}
              
              <p className="font-medium text-[9px] sm:text-xs mb-1.5 sm:mb-2 leading-tight sm:leading-relaxed whitespace-pre-wrap break-words">
                {msg.content}
              </p>
              
              {msg.isEdited && (
                <div className="mb-1 sm:mb-2 inline-block bg-[#000] text-[#fff] text-[6px] sm:text-[8px] font-bold uppercase px-1 py-0.2 shadow-[1px_1px_0_0_rgba(0,0,0,0.5)] self-start max-w-full truncate">
                  EDITED: {msg.editReason}
                </div>
              )}
              
              {msg.song && (
                <div className="flex items-center justify-between gap-1 bg-[#fff]/70 border border-[#000] p-1 mb-1.5 sm:mb-2">
                  <div className="flex items-center gap-1 overflow-hidden min-w-0">
                    <img src={msg.song.coverUrl} alt="Album Art" className="w-4 h-4 sm:w-6 sm:h-6 border border-[#000] shrink-0" />
                    <div className="overflow-hidden min-w-0">
                      <p className="font-bold text-[7px] sm:text-[9px] truncate uppercase leading-none">{msg.song.title}</p>
                      <p className="text-[6px] sm:text-[8px] truncate font-body leading-none text-gray-700">{msg.song.artist}</p>
                    </div>
                  </div>
                  <div className="w-3.5 h-3.5 sm:w-5 sm:h-5 bg-neo-pink border border-[#000] flex items-center justify-center shrink-0">
                    <Play size={8} className="fill-current text-[#000] ml-0.5 sm:w-2.5 sm:h-2.5" />
                  </div>
                </div>
              )}
              
              <div className="font-bold uppercase text-[7px] sm:text-[9px] flex justify-between items-end mt-auto pt-1 sm:pt-1.5 border-t border-[#000]/20">
                <span className="truncate mr-1 max-w-[55%]">— {msg.nickname}</span>
                <span className="text-[6px] sm:text-[8px] opacity-75 text-right font-body tracking-tight shrink-0">{timeString}<br/>{dateString}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Regular Note Detail Modal with Automatic 30s Clip Song Player */}
      {selectedNote && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 bg-[#000]/75 z-[100] flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setSelectedNote(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-md p-6 sm:p-8 border-4 border-[#000] shadow-[8px_8px_0_0_#000] relative flex flex-col ${COLOR_CLASSES[selectedNote.color] || "bg-neo-yellow"}`}
          >
            <button
              onClick={() => setSelectedNote(null)}
              className="absolute top-3 right-3 bg-[#fff] text-[#000] font-bold p-1.5 border-2 border-[#000] hover:bg-neo-pink transition-colors shadow-[2px_2px_0_0_#000]"
              aria-label="Close note"
            >
              <X size={18} />
            </button>

            {selectedNote.to && (
              <div className="font-black text-xs sm:text-sm uppercase tracking-wide border-b-2 border-[#000]/30 pb-2 mb-4 pr-10 break-words">
                To: {selectedNote.to}
              </div>
            )}

            <p className={`font-bold text-base sm:text-lg text-[#000] leading-relaxed whitespace-pre-wrap break-words mb-6 ${!selectedNote.to ? 'pr-8' : ''}`}>
              {selectedNote.content}
            </p>

            {selectedNote.isEdited && (
              <div className="mb-4 inline-block bg-[#000] text-[#fff] text-[10px] sm:text-xs font-bold uppercase px-2 py-1 shadow-[2px_2px_0_0_rgba(0,0,0,0.4)] self-start">
                EDITED: {selectedNote.editReason}
              </div>
            )}

            {selectedNote.song && (() => {
              const clipStart = selectedNote.song.startTime ?? 0;
              const effectiveClipLen = Math.max(
                1,
                Math.min(CLIP_DURATION, noteSongDuration - clipStart)
              );
              const elapsedInClip = Math.max(
                0,
                Math.min(effectiveClipLen, noteSongCurrentTime - clipStart)
              );
              const clipProgressPercent = Math.min(
                100,
                Math.max(0, (elapsedInClip / effectiveClipLen) * 100)
              );

              return (
                <div className="bg-[#fff] border-2 border-[#000] p-3 mb-5 shadow-[4px_4px_0_0_#000] flex flex-col gap-2.5">
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-3 overflow-hidden min-w-0">
                      <div className="relative shrink-0">
                        <img
                          src={selectedNote.song.coverUrl}
                          alt="Album Art"
                          className={`w-12 h-12 sm:w-14 sm:h-14 border-2 border-[#000] object-cover ${
                            isNoteSongPlaying ? "animate-pulse" : ""
                          }`}
                        />
                      </div>
                      <div className="overflow-hidden min-w-0">
                        {isLoadingNoteSong && (
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-[9px] font-bold uppercase text-gray-500">
                              Memuat...
                            </span>
                          </div>
                        )}
                        <p className="font-black text-xs sm:text-sm truncate uppercase">{selectedNote.song.title}</p>
                        <p className="text-xs truncate font-body text-gray-800">{selectedNote.song.artist}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={replayNoteSongFromStart}
                        className="w-8 h-8 bg-neo-cyan border-2 border-[#000] shadow-[2px_2px_0_0_#000] flex items-center justify-center hover:bg-cyan-300 transition-colors"
                        title="Ulangi Bagian Lagu"
                      >
                        <RotateCcw size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={toggleNoteSongPlay}
                        className="w-9 h-9 bg-neo-green border-2 border-[#000] shadow-[2px_2px_0_0_#000] flex items-center justify-center hover:bg-green-400 transition-colors"
                        title={isNoteSongPlaying ? "Jeda" : "Putar Lagu"}
                      >
                        {isNoteSongPlaying ? (
                          <Pause size={16} className="fill-current" />
                        ) : (
                          <Play size={16} className="fill-current ml-0.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Smooth Sliding Progress Bar with Blinking/Pulse Animation */}
                  <div className="flex flex-col gap-1">
                    <div
                      onClick={handleNoteSongSeek}
                      className="w-full h-2.5 bg-gray-200 border border-[#000] relative cursor-pointer overflow-hidden"
                    >
                      <div
                        className={`h-full bg-neo-pink transition-[width] duration-75 ease-linear ${
                          isNoteSongPlaying ? "animate-pulse" : ""
                        }`}
                        style={{
                          width: `${clipProgressPercent}%`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-bold text-gray-700">
                      <span>{formatSeconds(noteSongCurrentTime)}</span>
                      <span>{formatSeconds(clipStart + effectiveClipLen)}</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="font-bold uppercase text-xs sm:text-sm flex justify-between items-end mt-auto pt-3 border-t-2 border-[#000]/30">
              <span className="truncate mr-2 max-w-[60%] font-black">— {selectedNote.nickname}</span>
              <span className="text-[10px] sm:text-xs opacity-80 text-right font-body shrink-0">
                {new Date(selectedNote.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {new Date(selectedNote.createdAt).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
              </span>
            </div>
          </motion.div>
        </div>
      , document.body)}

      
      {messages.length === 0 && (
        <div className="text-center p-8 sm:p-12 border-2 border-[#000] border-dashed font-bold text-sm sm:text-xl bg-[#fff] shadow-[4px_4px_0_0_#000] mt-6">
          No confessions yet. Be the first!
        </div>
      )}
    </div>
    </section>
  );
}
