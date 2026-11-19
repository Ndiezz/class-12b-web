import { useEffect, useState, useRef } from "react";
import toast from "react-hot-toast";
import { createPortal } from "react-dom";
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, setDoc } from "firebase/firestore";
import { useRole } from "@/src/hooks/useRole";
import { db } from "@/src/lib/firebase";
import { Student } from "@/src/types";
import { NeoCard } from "./ui/NeoCard";
import { NeoButton } from "./ui/NeoButton";
import { Trash2, Music, X, Search, Instagram, Edit2, Play, Pause, RotateCcw, Sliders } from "lucide-react";

const COLORS = ["white", "yellow", "cyan", "green", "pink", "orange", "purple", "blue", "lime", "red", "mahogany"] as const;
const COLOR_CLASSES: Record<string, string> = {
  white: "bg-white",
  yellow: "bg-neo-cyan",
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

import {
  resolveSongStream,
  preloadSongStream,
  playResolvedStream,
  detachAudioStream,
  unlockAudioOnGesture,
} from "@/src/lib/audioStream";

const parseImageUrl = (url: string) => {
  if (!url) return "";
  const match1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  const match2 = url.match(/id=([a-zA-Z0-9_-]+)/);
  const id = match1 ? match1[1] : (match2 ? match2[1] : null);
  if (id) {
    return `https://lh3.googleusercontent.com/d/${id}`;
  }
  return url;
};

export default function Roster() {
  const [students, setStudents] = useState<Student[]>([]);
  const { isAdmin } = useRole();
  const [newStudent, setNewStudent] = useState({ name: "", initials: "", role: "", funFact: "", birthday: "", color: "white", imageUrl: "", instagram: "", tiktok: "", quote: "", favSubject: "" });
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  
  // Song functionality
  const [showSongModal, setShowSongModal] = useState(false);
  const [selectedSong, setSelectedSong] = useState<AttachedSong | null>(null);
  const [songSearch, setSongSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [songResults, setSongResults] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Direct HTML5 Audio playback state for opened Student Profile modal
  const studentAudioRef = useRef<HTMLAudioElement | null>(null);
  const studentStreamCleanupRef = useRef<(() => void) | null>(null);
  const [isStudentSongPlaying, setIsStudentSongPlaying] = useState(false);
  const [isLoadingStudentSong, setIsLoadingStudentSong] = useState(false);
  const [studentSongCurrentTime, setStudentSongCurrentTime] = useState(0);
  const [studentSongDuration, setStudentSongDuration] = useState(180);

  // Audio preview state inside "Attach Song" modal (for setting full-song start time)
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const previewStreamCleanupRef = useRef<(() => void) | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [isResolvingVideo, setIsResolvingVideo] = useState(false);
  const [previewDuration, setPreviewDuration] = useState(210);
  const [draftSong, setDraftSong] = useState<AttachedSong | null>(null);
  const draftSongRef = useRef<AttachedSong | null>(null);

  useEffect(() => {
    draftSongRef.current = draftSong;
  }, [draftSong]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "students"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
      const sorted = data.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
      setStudents(sorted);
      setLoading(false);
      // Pre-resolve direct audio streams in background so tapping a Student card on mobile plays instantly
      sorted.forEach((s) => {
        if (s.song?.title) {
          preloadSongStream(s.song.title, s.song.artist, s.song.previewUrl, s.song.duration);
        }
      });
    });
    return unsub;
  }, []);

  // Stop preview audio when closing the song attachment modal
  const stopPreviewAudio = () => {
    if (previewStreamCleanupRef.current) {
      previewStreamCleanupRef.current();
      previewStreamCleanupRef.current = null;
    }
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      detachAudioStream(previewAudioRef.current);
      previewAudioRef.current.removeAttribute("src");
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

  // Play or pause the selected song from startTime inside Attach Song modal using direct HTML5 Audio
  const togglePreviewPlay = async (songToPlay?: AttachedSong) => {
    const target = songToPlay || draftSongRef.current;
    if (!target) return;

    const audio = previewAudioRef.current;
    if (!audio) return;

    if (isPreviewPlaying && !songToPlay) {
      audio.pause();
      setIsPreviewPlaying(false);
      window.dispatchEvent(new CustomEvent("note-audio-stop"));
      return;
    }

    // Unlock audio element synchronously inside tap gesture
    unlockAudioOnGesture(audio);
    window.dispatchEvent(new CustomEvent("note-audio-start"));
    const startSec = target.startTime ?? 0;

    setIsResolvingVideo(true);
    const stream = await resolveSongStream(
      target.title,
      target.artist,
      target.previewUrl,
      target.duration
    );
    setIsResolvingVideo(false);

    if (!stream) {
      toast.error("Pratinjau audio tidak tersedia untuk lagu ini");
      return;
    }

    if (previewStreamCleanupRef.current) {
      previewStreamCleanupRef.current();
      previewStreamCleanupRef.current = null;
    }

    previewStreamCleanupRef.current = playResolvedStream({
      audio,
      stream,
      startTime: startSec,
      volume: 0.9,
      autoPlay: true,
      onReady: (dur, isFull) => {
        if (dur > 0 && isFull) {
          setPreviewDuration(dur);
          setDraftSong((prev) =>
            prev && prev.title === target.title
              ? { ...prev, duration: Math.round(dur) }
              : prev
          );
        }
      },
      onPlayStateChange: (playing) => {
        setIsPreviewPlaying(playing);
      },
      onError: () => {
        setIsPreviewPlaying(false);
      },
    });
  };

  // Auto-loop preview after 30 seconds in Attach Song modal (Instagram Note style)
  useEffect(() => {
    if (!isPreviewPlaying) return;
    const interval = setInterval(() => {
      const audio = previewAudioRef.current;
      const currentDraft = draftSongRef.current;
      if (audio && currentDraft) {
        const curr = audio.currentTime || 0;
        const dur = audio.duration || previewDuration || 210;
        const startSec = Math.min(currentDraft.startTime ?? 0, Math.max(0, dur - 2));
        if (curr >= startSec + CLIP_DURATION || (dur > 0 && curr >= dur - 0.3)) {
          try {
            audio.currentTime = startSec;
          } catch {}
        }
      }
    }, 250);
    return () => clearInterval(interval);
  }, [isPreviewPlaying, previewDuration]);

  const handleDraftStartTimeChange = (newStart: number) => {
    if (!draftSong) return;
    const updated = { ...draftSong, startTime: newStart };
    setDraftSong(updated);

    const audio = previewAudioRef.current;
    if (audio && isPreviewPlaying) {
      const dur = audio.duration && isFinite(audio.duration) ? audio.duration : previewDuration;
      const safeStart = Math.min(newStart, Math.max(0, dur - 2));
      try {
        audio.currentTime = safeStart;
      } catch {}
    }
  };

  const handleOpenStudent = (student: Student) => {
    if (student.song && studentAudioRef.current) {
      // Unlock HTML5 Audio synchronously inside the user's tap gesture on mobile
      unlockAudioOnGesture(studentAudioRef.current);
      window.dispatchEvent(new CustomEvent("note-audio-start"));
    }
    setSelectedStudent(student);
  };

  // Auto-play 30-second song clip from startTime when a Student Profile Modal with a song is opened
  useEffect(() => {
    if (!selectedStudent || !selectedStudent.song) {
      if (studentStreamCleanupRef.current) {
        studentStreamCleanupRef.current();
        studentStreamCleanupRef.current = null;
      }
      if (studentAudioRef.current) {
        studentAudioRef.current.pause();
        detachAudioStream(studentAudioRef.current);
        studentAudioRef.current.removeAttribute("src");
      }
      setIsStudentSongPlaying(false);
      setIsLoadingStudentSong(false);
      setStudentSongCurrentTime(0);
      return;
    }

    let cancelled = false;
    const song = selectedStudent.song;
    const clipStart = song.startTime ?? 0;
    const initialFullDur =
      song.duration && song.duration > 30 ? song.duration : Math.max(180, clipStart + CLIP_DURATION);

    window.dispatchEvent(new CustomEvent("note-audio-start"));
    setIsLoadingStudentSong(true);
    setStudentSongDuration(initialFullDur);
    setStudentSongCurrentTime(clipStart);

    const startStudentAudio = async () => {
      const stream = await resolveSongStream(
        song.title,
        song.artist,
        song.previewUrl,
        song.duration
      );
      if (cancelled) return;

      const audio = studentAudioRef.current;
      if (!stream || !audio) {
        setIsLoadingStudentSong(false);
        return;
      }

      if (studentStreamCleanupRef.current) {
        studentStreamCleanupRef.current();
        studentStreamCleanupRef.current = null;
      }

      const safeStart = stream.isFullTrack
        ? clipStart
        : Math.min(clipStart, Math.max(0, stream.duration - 2));

      studentStreamCleanupRef.current = playResolvedStream({
        audio,
        stream,
        startTime: safeStart,
        volume: 0.9,
        autoPlay: true,
        onReady: (dur) => {
          if (cancelled) return;
          if (dur > 0) setStudentSongDuration(dur);
          setIsLoadingStudentSong(false);
        },
        onPlayStateChange: (playing) => {
          if (cancelled) return;
          setIsStudentSongPlaying(playing);
          if (playing) setIsLoadingStudentSong(false);
        },
        onError: () => {
          if (cancelled) return;
          setIsLoadingStudentSong(false);
          setIsStudentSongPlaying(false);
        },
      });
    };

    void startStudentAudio();

    return () => {
      cancelled = true;
      if (studentStreamCleanupRef.current) {
        studentStreamCleanupRef.current();
        studentStreamCleanupRef.current = null;
      }
      if (studentAudioRef.current) {
        studentAudioRef.current.pause();
        detachAudioStream(studentAudioRef.current);
        studentAudioRef.current.removeAttribute("src");
      }
      setIsStudentSongPlaying(false);
      setIsLoadingStudentSong(false);
      // Resume background web music when student profile modal closes
      window.dispatchEvent(new CustomEvent("note-audio-stop"));
    };
  }, [selectedStudent]);

  // Smooth 40ms progress bar updater & 30-second Instagram Note loop enforcement for Student Profile
  useEffect(() => {
    if (!selectedStudent?.song || !isStudentSongPlaying) return;

    const clipStart = selectedStudent.song.startTime ?? 0;

    const interval = setInterval(() => {
      const audio = studentAudioRef.current;
      if (!audio) return;

      const dur =
        audio.duration && isFinite(audio.duration) && audio.duration > 0
          ? audio.duration
          : studentSongDuration;
      if (dur > 0 && Math.abs(dur - studentSongDuration) > 1) {
        setStudentSongDuration(dur);
      }

      const safeStart = dur > 35 ? clipStart : Math.min(clipStart, Math.max(0, dur - 2));
      const effectiveEnd = Math.min(dur, safeStart + CLIP_DURATION);
      const curr = audio.currentTime || 0;

      if (curr >= effectiveEnd || (dur > 0 && curr >= dur - 0.25)) {
        try {
          audio.currentTime = safeStart;
        } catch {}
        setStudentSongCurrentTime(safeStart);
        if (audio.paused) {
          audio.play().catch(() => {});
        }
      } else {
        setStudentSongCurrentTime(curr);
      }
    }, 40);

    return () => clearInterval(interval);
  }, [selectedStudent, isStudentSongPlaying, studentSongDuration]);

  const toggleStudentSongPlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const audio = studentAudioRef.current;
    if (!audio) return;

    if (isStudentSongPlaying) {
      audio.pause();
      setIsStudentSongPlaying(false);
    } else {
      window.dispatchEvent(new CustomEvent("note-audio-start"));
      audio
        .play()
        .then(() => setIsStudentSongPlaying(true))
        .catch(() => {});
    }
  };

  const replayStudentSongFromStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedStudent?.song) return;
    const audio = studentAudioRef.current;
    if (!audio) return;

    const clipStart = selectedStudent.song.startTime ?? 0;
    const dur =
      audio.duration && isFinite(audio.duration) && audio.duration > 0
        ? audio.duration
        : studentSongDuration;
    const safeStart = dur > 35 ? clipStart : Math.min(clipStart, Math.max(0, dur - 2));

    window.dispatchEvent(new CustomEvent("note-audio-start"));
    try {
      audio.currentTime = safeStart;
    } catch {}
    setStudentSongCurrentTime(safeStart);
    audio
      .play()
      .then(() => setIsStudentSongPlaying(true))
      .catch(() => {});
  };

  const handleStudentSongSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!selectedStudent?.song) return;
    const audio = studentAudioRef.current;
    if (!audio || !studentSongDuration) return;

    const clipStart = selectedStudent.song.startTime ?? 0;
    const safeStart =
      studentSongDuration > 35
        ? clipStart
        : Math.min(clipStart, Math.max(0, studentSongDuration - 2));
    const effectiveClipLen = Math.max(
      1,
      Math.min(CLIP_DURATION, studentSongDuration - safeStart)
    );
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = Math.min(studentSongDuration, safeStart + ratio * effectiveClipLen);

    try {
      audio.currentTime = targetTime;
      setStudentSongCurrentTime(targetTime);
    } catch {}
  };

  const searchSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!songSearch) return;
    setIsSearching(true);
    try {
      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(songSearch)}&entity=song&limit=5`);
      const data = await res.json();
      const results = data.results || [];
      setSongResults(results);
      results.slice(0, 3).forEach((s: any) => {
        if (s.trackName) {
          preloadSongStream(
            s.trackName,
            s.artistName || "",
            s.previewUrl,
            s.trackTimeMillis ? Math.round(s.trackTimeMillis / 1000) : 210
          );
        }
      });
    } catch (err) {
      console.error(err);
    }
    setIsSearching(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.name || !newStudent.initials) return;
    
    try {
      const studentData: any = { ...newStudent, imageUrl: parseImageUrl(newStudent.imageUrl) };
      if (selectedSong) {
        studentData.song = selectedSong;
      } else {
        studentData.song = null;
      }
      
      if (editingId) {
        await updateDoc(doc(db, "students", editingId), studentData);
        setEditingId(null);
        toast.success("Data anggota berhasil diperbarui!");
      } else {
        await addDoc(collection(db, "students"), studentData);
        toast.success("Anggota berhasil ditambahkan!");
      }
      setNewStudent({ name: "", initials: "", role: "", funFact: "", birthday: "", color: "white", imageUrl: "", instagram: "", tiktok: "", quote: "", favSubject: "" });
      setSelectedSong(null);
      setDraftSong(null);
    } catch (err) {
      console.error(err);
    }
  };
  
  const handleEditClick = (e: React.MouseEvent, student: Student) => {
    e.stopPropagation();
    setNewStudent({
      name: student.name || "",
      initials: student.initials || "",
      role: student.role || "",
      funFact: student.funFact || "",
      birthday: student.birthday || "",
      color: student.color || "white",
      imageUrl: student.imageUrl || "",
      instagram: student.instagram || "",
      tiktok: student.tiktok || "",
      quote: student.quote || "",
      favSubject: student.favSubject || ""
    });
    setSelectedSong(student.song || null);
    setEditingId(student.id || null);
    // scroll to form
    const formEl = document.getElementById("admin-form");
    if (formEl) formEl.scrollIntoView({ behavior: "smooth" });
  };
  
  const cancelEdit = () => {
    setEditingId(null);
    setNewStudent({ name: "", initials: "", role: "", funFact: "", birthday: "", color: "white", imageUrl: "", instagram: "", tiktok: "", quote: "", favSubject: "" });
    setSelectedSong(null);
    setDraftSong(null);
  };

  const handleDelete = async (id: string) => {
    const studentToDel = students.find(s => s.id === id);
    if (!studentToDel) return;
    try {
      await deleteDoc(doc(db, "students", id));
      toast((t) => (
        <div className="flex items-center gap-3">
          <span className="font-bold text-sm">Polaroid deleted</span>
          <button onClick={() => {
            toast.dismiss(t.id);
            setDoc(doc(db, "students", id), studentToDel);
            toast.success("Polaroid restored!");
          }} className="bg-neo-cyan px-2 py-1 font-bold border-2 border-black shadow-[2px_2px_0_0_#000] text-xs">
            UNDO
          </button>
        </div>
      ), { duration: 4000 });
    } catch (err) {
      console.error(err);
    }
  };

  
  useEffect(() => {
    if (selectedStudent || showSongModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [selectedStudent, showSongModal]);

  const filteredStudents = students.filter(student => 
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    student.initials.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <section id="roster" className="w-full relative z-10 bg-neo-yellow/20">
    {/* Direct Ad-Free HTML5 Audio Elements for Student Profile & Preview Playback */}
    <audio ref={studentAudioRef} playsInline preload="auto" className="hidden" />
    <audio ref={previewAudioRef} playsInline preload="auto" className="hidden" />

    <div className="p-4 sm:p-8 max-w-7xl mx-auto">
      <div className="mb-6 sm:mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="bg-neo-cyan border-2 border-black px-2.5 sm:px-3 py-0.5 sm:py-1 font-bold text-[10px] sm:text-xs uppercase tracking-widest text-black shadow-[2px_2px_0_0_#000] sm:shadow-[3px_3px_0_0_#000]">CHAPTER 01</span>
          <h2 className="text-3xl sm:text-5xl md:text-7xl font-black uppercase mt-3 sm:mt-4 break-words">Anggota</h2>
        </div>
        
        <div className="w-full md:w-auto md:min-w-[300px] relative">
          <input
            type="text"
            placeholder="Search student by name..."
            className="input-brutal w-full pl-10 h-10 py-1"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        </div>
      </div>

      {isAdmin && (
        <NeoCard color="white" className="p-4 sm:p-6 mb-8 sm:mb-12">
          <div className="flex items-center justify-between mb-4">
            <h3 id="admin-form" className="font-bold text-lg sm:text-xl uppercase">{editingId ? "Admin: Edit Student" : "Admin: Add Student"}</h3>
            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                className="btn-brutal bg-gray-200 hover:bg-gray-300 text-xs px-3 py-1"
              >
                Cancel Edit
              </button>
            )}
          </div>
          <form onSubmit={handleAdd} className="flex flex-col gap-3 sm:gap-4">
            <div className="flex flex-wrap gap-3 sm:gap-4 items-end">
              <div className="flex flex-col">
                <label className="font-bold text-xs sm:text-sm">Initials</label>
                <input type="text" className="input-brutal w-16 sm:w-20" maxLength={4} value={newStudent.initials} onChange={e => setNewStudent({...newStudent, initials: e.target.value.toUpperCase()})} required />
              </div>
              <div className="flex flex-col flex-1 min-w-[120px]">
                <label className="font-bold text-xs sm:text-sm">Name</label>
                <input type="text" className="input-brutal w-full" value={newStudent.name} onChange={e => setNewStudent({...newStudent, name: e.target.value})} required />
              </div>
              <div className="flex flex-col flex-1 min-w-[120px]">
                <label className="font-bold text-xs sm:text-sm">Role/Title (optional)</label>
                <input type="text" className="input-brutal w-full" value={newStudent.role} onChange={e => setNewStudent({...newStudent, role: e.target.value})} />
              </div>
              <div className="flex flex-col flex-1 min-w-[120px]">
                <label className="font-bold text-xs sm:text-sm">Image URL (Drive/Link)</label>
                <input type="url" className="input-brutal w-full" placeholder="https://..." value={newStudent.imageUrl} onChange={e => setNewStudent({...newStudent, imageUrl: e.target.value})} />
              </div>
              <div className="flex flex-col flex-1 min-w-[120px]">
                <label className="font-bold text-xs sm:text-sm">Instagram Link</label>
                <input type="text" className="input-brutal w-full" placeholder="https://instagram.com/..." value={newStudent.instagram} onChange={e => setNewStudent({...newStudent, instagram: e.target.value})} />
              </div>
              <div className="flex flex-col flex-1 min-w-[120px]">
                <label className="font-bold text-xs sm:text-sm">TikTok Link</label>
                <input type="text" className="input-brutal w-full" placeholder="https://tiktok.com/..." value={newStudent.tiktok} onChange={e => setNewStudent({...newStudent, tiktok: e.target.value})} />
              </div>
              <div className="flex flex-col flex-1 min-w-[120px]">
                <label className="font-bold text-xs sm:text-sm">Quote / Motto</label>
                <input type="text" className="input-brutal w-full" placeholder="Life is good..." value={newStudent.quote} onChange={e => setNewStudent({...newStudent, quote: e.target.value})} />
              </div>
              <div className="flex flex-col flex-1 min-w-[120px]">
                <label className="font-bold text-xs sm:text-sm">Fav Subject</label>
                <input type="text" className="input-brutal w-full" placeholder="Math, Art..." value={newStudent.favSubject} onChange={e => setNewStudent({...newStudent, favSubject: e.target.value})} />
              </div>
              <div className="flex flex-col flex-1 min-w-[120px]">
                <label className="font-bold text-xs sm:text-sm">Fun Fact (optional)</label>
                <input type="text" className="input-brutal w-full" value={newStudent.funFact} onChange={e => setNewStudent({...newStudent, funFact: e.target.value})} />
              </div>
              <div className="flex flex-col">
                <label className="font-bold text-xs sm:text-sm">Birthday</label>
                <input type="text" className="input-brutal w-24 sm:w-28" placeholder="e.g. MAR 14" value={newStudent.birthday} onChange={e => setNewStudent({...newStudent, birthday: e.target.value.toUpperCase()})} />
              </div>
              <div className="flex flex-col">
                <label className="font-bold text-xs sm:text-sm">Color</label>
                <select className="input-brutal h-[44px]" value={newStudent.color} onChange={e => setNewStudent({...newStudent, color: e.target.value})}>
                  {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex flex-col">
                <button type="button" onClick={openSongModal} className={`btn-brutal h-[44px] text-xs sm:text-sm px-3 sm:px-5 ${selectedSong ? 'bg-neo-pink' : 'bg-white hover:bg-gray-100'}`}>
                  <Music size={16} /> {selectedSong ? 'Song Added' : 'Song'}
                </button>
              </div>
              <NeoButton type="submit" color="yellow" className="text-xs sm:text-sm">
                {editingId ? "Save" : "Add"}
              </NeoButton>
            </div>

            {selectedSong && (
              <div className="flex items-center justify-between gap-2 bg-neo-pink/30 border-2 border-black p-2 sm:p-2.5 shadow-[2px_2px_0_0_#000]">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <img src={selectedSong.coverUrl} alt="cover" className="w-9 h-9 border-2 border-black shrink-0" />
                  <div className="overflow-hidden">
                    <p className="font-black text-xs sm:text-sm truncate uppercase">{selectedSong.title}</p>
                    <p className="text-[10px] sm:text-xs font-bold text-gray-700 truncate">
                      {selectedSong.artist} · <span className="bg-neo-yellow px-1 border border-black text-black">Mulai {formatSeconds(selectedSong.startTime ?? 0)}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={openSongModal}
                    className="bg-neo-cyan border-2 border-black px-2 py-1 text-[10px] sm:text-xs font-black uppercase shadow-[2px_2px_0_0_#000] hover:bg-cyan-300 flex items-center gap-1"
                  >
                    <Sliders size={12} /> Atur Bagian
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSong(null)}
                    className="bg-neo-red text-white border-2 border-black p-1 shadow-[2px_2px_0_0_#000] hover:bg-red-500"
                    title="Hapus Lagu"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            )}
          </form>
        </NeoCard>
      )}

      {/* Song Modal with Full-Song Start Time Configurator (Instagram Note Style) */}
      {showSongModal && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white border-4 border-black p-4 sm:p-6 w-full max-w-md shadow-[6px_6px_0_0_#000] max-h-[88vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-xl sm:text-2xl uppercase">Attach Song</h3>
              <button onClick={closeSongModal} className="p-1 hover:bg-gray-200 border-2 border-black rounded-full"><X size={18} /></button>
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

            {/* Full-Song Start Time Configurator when a song is selected */}
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
                <div className="mb-3 p-3 bg-neo-yellow border-2 border-black shadow-[3px_3px_0_0_#000] flex flex-col gap-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <img src={draftSong.coverUrl} alt="cover" className="w-11 h-11 border-2 border-black shrink-0" />
                      <div className="overflow-hidden">
                        <span className="inline-block bg-black text-white text-[9px] font-black uppercase px-1.5 py-0.5 mb-0.5">
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
                      className="btn-brutal bg-neo-pink text-black px-2.5 py-1.5 text-xs shrink-0 flex items-center gap-1"
                    >
                      {isPreviewPlaying ? <Pause size={14} /> : <Play size={14} />}
                      {isResolvingVideo ? "Memuat..." : isPreviewPlaying ? "Stop" : "Putar"}
                    </button>
                  </div>

                  <div className="bg-white border-2 border-black p-2.5 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs font-black uppercase">
                      <span className="flex items-center gap-1">
                        <Sliders size={13} /> MULAI BAGIAN LAGU
                      </span>
                      <span className="bg-neo-cyan px-2 py-0.5 border border-black">
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
                      className="w-full accent-black cursor-pointer h-2 bg-gray-200 border border-black"
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
                    className={`flex items-center justify-between gap-2 sm:gap-3 p-2 border-2 border-black cursor-pointer transition-colors ${
                      isSelected ? 'bg-neo-pink shadow-[2px_2px_0_0_#000]' : 'hover:bg-neo-cyan/40 bg-white'
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
                      <img src={song.artworkUrl100} alt="cover" className="w-10 h-10 border-2 border-black shrink-0" />
                      <div className="overflow-hidden">
                        <p className="font-bold text-xs sm:text-sm truncate">{song.trackName}</p>
                        <p className="text-[10px] sm:text-xs truncate text-gray-700">
                          {song.artistName} · {formatSeconds(fullTrackDurationSec)}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-black uppercase bg-neo-yellow border border-black px-2 py-1 shrink-0">
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
                className="mt-3 btn-brutal bg-red-400 text-white w-full text-xs py-2"
              >
                Hapus Lampiran Lagu
              </button>
            )}
          </div>
        </div>
      , document.body)}

      {/* Grid: 2 per row on mobile, up to 4 on desktop for larger polaroid cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
        
      {loading && (
        <div className="col-span-full grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white texture-polkadot border-2 sm:border-4 border-black p-2 sm:p-3 pb-3 sm:pb-4 flex flex-col shadow-[4px_4px_0_0_#000] sm:shadow-[6px_6px_0_0_#000]">
              <div className="border-2 sm:border-4 border-black aspect-[4/5] bg-gray-200 animate-pulse mb-2 sm:mb-3"></div>
              <div className="flex flex-col flex-1 bg-white p-1">
                <div className="h-4 bg-gray-200 animate-pulse w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 animate-pulse w-1/2 mb-1"></div>
                <div className="h-3 bg-gray-200 animate-pulse w-full mt-auto"></div>
              </div>
            </div>
          ))}
        </div>
      )}

        {!loading && filteredStudents.map((student) => {
          const bgClass = COLOR_CLASSES[student.color] || "bg-white";
          
          return (
            <div 
              key={student.id} 
              onClick={() => handleOpenStudent(student)}
              className={`bg-white texture-polkadot border-2 sm:border-4 border-black p-2 sm:p-3 pb-3 sm:pb-4 relative group flex flex-col shadow-[4px_4px_0_0_#000] sm:shadow-[6px_6px_0_0_#000] transform transition-transform hover:-translate-y-1 hover:rotate-1 cursor-pointer`}
            >
              {isAdmin && (
                <div className="absolute top-1 right-1 sm:top-2 sm:right-2 flex flex-col gap-1 z-50 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => handleEditClick(e, student)} className="text-black hover:text-neo-blue bg-white border border-black rounded-full p-0.5 sm:p-1 shadow-[1px_1px_0_0_#000]" title="Edit Student">
                    <Edit2 size={12} className="sm:w-3.5 sm:h-3.5" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(student.id!); }} className="text-black hover:text-red-500 bg-white border border-black rounded-full p-0.5 sm:p-1 shadow-[1px_1px_0_0_#000]" title="Delete Student">
                    <Trash2 size={12} className="sm:w-3.5 sm:h-3.5" />
                  </button>
                </div>
              )}
              
              {/* Image Area (Polaroid style) */}
              <div className="relative border-2 sm:border-4 border-black aspect-[4/5] overflow-hidden bg-gray-100 mb-2 sm:mb-3">
                {student.imageUrl ? (
                  <img src={parseImageUrl(student.imageUrl)} alt={student.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                ) : (
                  <div className={`w-full h-full ${bgClass} opacity-80 flex items-center justify-center`}>
                    <span className="font-black text-6xl opacity-30">{student.initials}</span>
                  </div>
                )}
              </div>

              {/* Info Area */}
              <div className="flex flex-col flex-1 bg-white/80 p-1 -m-1">
                {/* Name - NO truncation, allow wrapping */}
                <h3 className="font-like-span font-bold text-sm sm:text-lg capitalize leading-tight mb-2 sm:mb-3 text-black">
                  {student.name}
                </h3>
                
                {/* Badges */}
                <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 mb-2">
                  <span className={`px-1.5 py-0.5 border-2 border-black font-bold uppercase text-[9px] sm:text-[10px] shadow-[2px_2px_0_0_#000] ${bgClass}`}>
                    {student.initials}
                  </span>
                  {student.role && (
                    <span className={`px-1.5 py-0.5 border-2 border-black font-bold uppercase text-[9px] sm:text-[10px] shadow-[2px_2px_0_0_#000] ${bgClass}`}>
                      {student.role}
                    </span>
                  )}
                  {student.birthday && (
                    <span className="px-1.5 py-0.5 border-2 border-black font-bold uppercase text-[9px] sm:text-[10px] shadow-[2px_2px_0_0_#000] bg-white">
                      🎂 {student.birthday}
                    </span>
                  )}
                  {student.instagram && (
                    <a href={student.instagram.startsWith("http") ? student.instagram : `https://${student.instagram}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="ml-auto bg-white border-2 border-black p-1 shadow-[2px_2px_0_0_#000] hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#000] transition-all">
                      <Instagram size={12} className="sm:w-3.5 sm:h-3.5" />
                    </a>
                  )}
                </div>
                
                {/* Fun Fact */}
                {student.funFact && (
                   <p className="font-medium text-[10px] sm:text-xs text-gray-800 mb-2 leading-tight flex-1">
                     "{student.funFact}"
                   </p>
                )}

                {/* Song */}
                {student.song && (
                   <div className="mt-auto flex items-center justify-between gap-1 sm:gap-2 bg-white border-2 border-black p-1 sm:p-1.5 shadow-[2px_2px_0_0_#000]">
                     <div className="flex items-center gap-1 sm:gap-2 overflow-hidden min-w-0">
                       <img src={student.song.coverUrl} alt="Cover" className="w-6 h-6 sm:w-8 sm:h-8 border-2 border-black shrink-0" />
                       <div className="overflow-hidden min-w-0">
                         <p className="font-bold text-[8px] sm:text-[10px] truncate uppercase leading-none mb-0.5 sm:mb-1">{student.song.title}</p>
                         <p className="text-[7px] sm:text-[9px] truncate font-body leading-none text-gray-600">{student.song.artist}</p>
                       </div>
                     </div>
                     <div className="w-4 h-4 sm:w-5 sm:h-5 bg-neo-pink border border-black flex items-center justify-center shrink-0">
                       <Play size={8} className="fill-current text-black ml-0.5 sm:w-2.5 sm:h-2.5" />
                     </div>
                   </div>
                )}
              </div>
            </div>
          );
        })}
        {!loading && filteredStudents.length === 0 && (
          <div className="col-span-full text-center p-6 sm:p-8 border-2 sm:border-4 border-black border-dashed font-bold text-xs sm:text-sm bg-white">
            {students.length === 0 ? "No students added yet. Admin needs to add them!" : "No students found matching your search."}
          </div>
        )}
      </div>

      {/* Student Profile Modal with Automatic 30s Clip Song Player */}
      {selectedStudent && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedStudent(null)}>
          <div className="bg-white border-4 border-black p-4 sm:p-8 w-full max-w-2xl shadow-[8px_8px_0_0_#000] max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-black text-3xl sm:text-5xl uppercase tracking-tighter leading-none mb-2">{selectedStudent.name}</h3>
                <div className="flex flex-wrap gap-2">
                  <span className={`px-2 py-1 border-2 border-black font-bold uppercase text-xs shadow-[2px_2px_0_0_#000] ${COLOR_CLASSES[selectedStudent.color] || "bg-white"}`}>
                    {selectedStudent.initials}
                  </span>
                  {selectedStudent.role && (
                    <span className={`px-2 py-1 border-2 border-black font-bold uppercase text-xs shadow-[2px_2px_0_0_#000] ${COLOR_CLASSES[selectedStudent.color] || "bg-white"}`}>
                      {selectedStudent.role}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => setSelectedStudent(null)} className="p-2 hover:bg-gray-200 border-2 border-black rounded-full shrink-0"><X size={24} /></button>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6 sm:gap-8">
              {/* Image Column */}
              <div className="relative border-4 border-black aspect-[4/5] bg-gray-100 shadow-[6px_6px_0_0_#000]">
                {selectedStudent.imageUrl ? (
                  <img src={parseImageUrl(selectedStudent.imageUrl)} alt={selectedStudent.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                ) : (
                  <div className={`w-full h-full ${COLOR_CLASSES[selectedStudent.color] || "bg-white"} opacity-80 flex items-center justify-center`}>
                    <span className="font-black text-8xl opacity-30">{selectedStudent.initials}</span>
                  </div>
                )}
              </div>
              
              {/* Details Column */}
              <div className="flex flex-col gap-6">
                {selectedStudent.quote && (
                  <div className="bg-neo-cyan p-4 border-2 border-black shadow-[4px_4px_0_0_#000]">
                    <p className="font-bold text-lg italic leading-tight">"{selectedStudent.quote}"</p>
                    <p className="text-xs font-black uppercase tracking-widest mt-2 opacity-70">— Motto</p>
                  </div>
                )}

                <div className="space-y-4">
                  {selectedStudent.birthday && (
                    <div>
                      <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-gray-500 mb-1">Birthday</p>
                      <p className="font-bold text-base sm:text-lg">🎂 {selectedStudent.birthday}</p>
                    </div>
                  )}

                  {selectedStudent.favSubject && (
                    <div>
                      <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-gray-500 mb-1">Favorite Subject</p>
                      <p className="font-bold text-base sm:text-lg">📚 {selectedStudent.favSubject}</p>
                    </div>
                  )}

                  {selectedStudent.funFact && (
                    <div>
                      <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-gray-500 mb-1">Fun Fact</p>
                      <p className="font-bold text-base leading-snug">{selectedStudent.funFact}</p>
                    </div>
                  )}
                </div>

                {/* Socials & Music */}
                <div className="mt-auto space-y-4 pt-4 border-t-4 border-black">
                  {(selectedStudent.instagram || selectedStudent.tiktok) && (
                    <div className="flex gap-2">
                      {selectedStudent.instagram && (
                        <a href={selectedStudent.instagram.startsWith("http") ? selectedStudent.instagram : `https://${selectedStudent.instagram}`} target="_blank" rel="noopener noreferrer" className="flex-1 bg-white border-2 border-black p-2 flex items-center justify-center gap-2 font-bold text-xs sm:text-sm hover:-translate-y-1 hover:shadow-[4px_4px_0_0_#000] transition-all">
                          <Instagram size={16} /> Instagram
                        </a>
                      )}
                      {selectedStudent.tiktok && (
                        <a href={selectedStudent.tiktok.startsWith("http") ? selectedStudent.tiktok : `https://${selectedStudent.tiktok}`} target="_blank" rel="noopener noreferrer" className="flex-1 bg-black text-white border-2 border-black p-2 flex items-center justify-center gap-2 font-bold text-xs sm:text-sm hover:-translate-y-1 hover:shadow-[4px_4px_0_0_#000] transition-all">
                          TikTok
                        </a>
                      )}
                    </div>
                  )}

                  {selectedStudent.song && (() => {
                    const clipStart = selectedStudent.song.startTime ?? 0;
                    const effectiveClipLen = Math.max(
                      1,
                      Math.min(CLIP_DURATION, studentSongDuration - clipStart)
                    );
                    const elapsedInClip = Math.max(
                      0,
                      Math.min(effectiveClipLen, studentSongCurrentTime - clipStart)
                    );
                    const clipProgressPercent = Math.min(
                      100,
                      Math.max(0, (elapsedInClip / effectiveClipLen) * 100)
                    );

                    return (
                      <div className="bg-white border-2 border-black p-3 shadow-[4px_4px_0_0_#000] flex flex-col gap-2.5">
                        <div className="flex items-center justify-between gap-2.5">
                          <div className="flex items-center gap-3 overflow-hidden min-w-0">
                            <div className="relative shrink-0">
                              <img
                                src={selectedStudent.song.coverUrl}
                                alt="Cover"
                                className={`w-12 h-12 sm:w-14 sm:h-14 border-2 border-black object-cover ${
                                  isStudentSongPlaying ? "animate-pulse" : ""
                                }`}
                              />
                            </div>
                            <div className="overflow-hidden min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="text-[10px] font-black uppercase tracking-widest text-neo-pink">
                                  Theme Song
                                </span>
                                {isLoadingStudentSong && (
                                  <span className="text-[9px] font-bold uppercase text-gray-500">
                                    · Memuat...
                                  </span>
                                )}
                              </div>
                              <p className="font-black text-xs sm:text-sm truncate uppercase leading-tight">
                                {selectedStudent.song.title}
                              </p>
                              <p className="text-xs truncate font-body text-gray-800">
                                {selectedStudent.song.artist}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={replayStudentSongFromStart}
                              className="w-8 h-8 bg-neo-cyan border-2 border-black shadow-[2px_2px_0_0_#000] flex items-center justify-center hover:bg-cyan-300 transition-colors"
                              title="Ulangi Bagian Lagu"
                            >
                              <RotateCcw size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={toggleStudentSongPlay}
                              className="w-9 h-9 bg-neo-green border-2 border-black shadow-[2px_2px_0_0_#000] flex items-center justify-center hover:bg-green-400 transition-colors"
                              title={isStudentSongPlaying ? "Jeda" : "Putar Lagu"}
                            >
                              {isStudentSongPlaying ? (
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
                            onClick={handleStudentSongSeek}
                            className="w-full h-2.5 bg-gray-200 border border-black relative cursor-pointer overflow-hidden"
                          >
                            <div
                              className={`h-full bg-neo-pink transition-[width] duration-75 ease-linear ${
                                isStudentSongPlaying ? "animate-pulse" : ""
                              }`}
                              style={{
                                width: `${clipProgressPercent}%`,
                              }}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] font-bold text-gray-700">
                            <span>{formatSeconds(studentSongCurrentTime)}</span>
                            <span>{formatSeconds(clipStart + effectiveClipLen)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
    </section>
  );
}

