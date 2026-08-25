import { useEffect, useState } from "react";
import { collection, onSnapshot, addDoc, deleteDoc, doc } from "firebase/firestore";
import { useRole } from "@/src/hooks/useRole";
import { db } from "@/src/lib/firebase";
import { Student } from "@/src/types";
import { NeoCard } from "./ui/NeoCard";
import { NeoButton } from "./ui/NeoButton";
import { Trash2, Music, X, Search } from "lucide-react";

const COLORS = ["white", "yellow", "cyan", "green", "pink", "orange", "purple", "blue", "lime", "red"] as const;
const COLOR_CLASSES: Record<string, string> = {
  white: "bg-white",
  yellow: "bg-neo-yellow",
  cyan: "bg-neo-cyan",
  green: "bg-neo-green",
  pink: "bg-neo-pink",
  orange: "bg-neo-orange",
  purple: "bg-neo-purple",
  blue: "bg-neo-blue",
  lime: "bg-neo-lime",
  red: "bg-neo-red",
};

const parseImageUrl = (url: string) => {
  if (!url) return "";
  const driveRegex = /\/file\/d\/([a-zA-Z0-9_-]+)/;
  const match = url.match(driveRegex);
  if (match && match[1]) {
    return `https://drive.google.com/uc?export=view&id=${match[1]}`;
  }
  return url;
};

export default function Roster() {
  const [students, setStudents] = useState<Student[]>([]);
  const { isAdmin } = useRole();
  const [newStudent, setNewStudent] = useState({ name: "", initials: "", role: "", funFact: "", birthday: "", color: "white", imageUrl: "" });
  
  // Song functionality
  const [showSongModal, setShowSongModal] = useState(false);
  const [selectedSong, setSelectedSong] = useState<{title: string, artist: string, coverUrl: string} | null>(null);
  const [songSearch, setSongSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [songResults, setSongResults] = useState<any[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "students"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
      setStudents(data.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase())));
    });
    return unsub;
  }, []);

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
    if (!newStudent.name || !newStudent.initials) return;
    
    try {
      const studentData: any = { ...newStudent, imageUrl: parseImageUrl(newStudent.imageUrl) };
      if (selectedSong) studentData.song = selectedSong;
      
      await addDoc(collection(db, "students"), studentData);
      setNewStudent({ name: "", initials: "", role: "", funFact: "", birthday: "", color: "white", imageUrl: "" });
      setSelectedSong(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "students", id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <section id="roster" className="p-4 sm:p-8 max-w-7xl mx-auto relative z-10">
      <div className="mb-6 sm:mb-8">
        <span className="bg-neo-yellow border-2 border-black px-2.5 sm:px-3 py-0.5 sm:py-1 font-bold text-[10px] sm:text-xs uppercase tracking-widest text-black shadow-[2px_2px_0_0_#000] sm:shadow-[3px_3px_0_0_#000]">CHAPTER 01</span>
        <h2 className="text-3xl sm:text-5xl md:text-7xl font-black uppercase mt-3 sm:mt-4 break-words">Anggota</h2>
      </div>

      {isAdmin && (
        <NeoCard color="white" className="p-4 sm:p-6 mb-8 sm:mb-12">
          <h3 className="font-bold text-lg sm:text-xl mb-4 uppercase">Admin: Add Student</h3>
          <form onSubmit={handleAdd} className="flex flex-wrap gap-3 sm:gap-4 items-end">
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
              <button type="button" onClick={() => setShowSongModal(true)} className={`btn-brutal h-[44px] text-xs sm:text-sm px-3 sm:px-5 ${selectedSong ? 'bg-neo-pink' : 'bg-white hover:bg-gray-100'}`}>
                <Music size={16} /> {selectedSong ? 'Song Added' : 'Song'}
              </button>
            </div>
            <NeoButton type="submit" color="yellow" className="text-xs sm:text-sm">Add</NeoButton>
          </form>
        </NeoCard>
      )}

      {/* Song Modal */}
      {showSongModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white border-4 border-black p-4 sm:p-6 w-full max-w-md shadow-[6px_6px_0_0_#000] max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-xl sm:text-2xl uppercase">Attach Song</h3>
              <button onClick={() => setShowSongModal(false)} className="p-1 hover:bg-gray-200 border-2 border-black rounded-full"><X size={18} /></button>
            </div>
            
            <form onSubmit={searchSong} className="flex gap-2 mb-4">
              <input 
                type="text" 
                className="input-brutal flex-1 text-xs sm:text-sm" 
                placeholder="Search song title..." 
                value={songSearch}
                onChange={e => setSongSearch(e.target.value)}
              />
              <button type="submit" className="btn-brutal bg-neo-yellow px-3" disabled={isSearching}>
                <Search size={18} />
              </button>
            </form>
            
            <div className="overflow-y-auto flex-1 space-y-2 sm:space-y-3">
              {songResults.map(song => (
                <div 
                  key={song.trackId}
                  className="flex items-center gap-2 sm:gap-3 p-2 border-2 border-black hover:bg-neo-pink cursor-pointer transition-colors"
                  onClick={() => {
                    setSelectedSong({
                      title: song.trackName,
                      artist: song.artistName,
                      coverUrl: song.artworkUrl100
                    });
                    setShowSongModal(false);
                  }}
                >
                  <img src={song.artworkUrl100} alt="cover" className="w-10 h-10 border-2 border-black shrink-0" />
                  <div className="overflow-hidden">
                    <p className="font-bold text-xs sm:text-sm truncate">{song.trackName}</p>
                    <p className="text-[10px] sm:text-xs truncate">{song.artistName}</p>
                  </div>
                </div>
              ))}
              {songResults.length === 0 && !isSearching && songSearch && (
                <p className="text-center font-bold text-xs opacity-50 p-4">No results found.</p>
              )}
              {isSearching && (
                <p className="text-center font-bold text-xs p-4">Searching...</p>
              )}
            </div>
            
            {selectedSong && (
              <button 
                onClick={() => { setSelectedSong(null); setShowSongModal(false); }}
                className="mt-4 btn-brutal bg-red-400 text-white w-full text-xs"
              >
                Remove Attached Song
              </button>
            )}
          </div>
        </div>
      )}

      {/* Grid: 2 per row on mobile, up to 4 on desktop for larger polaroid cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
        {students.map((student) => {
          const bgClass = COLOR_CLASSES[student.color] || "bg-white";
          
          return (
            <div key={student.id} className="border-2 sm:border-4 border-black p-2 sm:p-3 relative group flex flex-col shadow-[4px_4px_0_0_#000] bg-white aspect-[3/4]">
              {isAdmin && (
                <button onClick={() => handleDelete(student.id!)} className="absolute top-1 right-1 sm:top-2 sm:right-2 text-black hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-50 bg-white border border-black rounded-full p-0.5 sm:p-1 shadow-[1px_1px_0_0_#000]">
                  <Trash2 size={12} className="sm:w-3.5 sm:h-3.5" />
                </button>
              )}
              
              {/* Background Image / Placeholder */}
              <div className="absolute inset-2 sm:inset-3 border-2 border-black overflow-hidden bg-gray-200">
                {student.imageUrl ? (
                  <img src={student.imageUrl} alt={student.name} className="w-full h-full object-cover" />
                ) : (
                  <div className={`w-full h-full ${bgClass} opacity-50 flex items-center justify-center`}>
                    <span className="font-black text-6xl opacity-20">{student.initials}</span>
                  </div>
                )}
              </div>
              
              {/* Floating elements on top of the image */}
              <div className="relative z-10 flex flex-col h-full pointer-events-none justify-between">
                
                {/* Floating Initials (Top Left) and Name (Center) */}
                <div className="flex justify-between items-start -mt-1 sm:-mt-2 -mx-1 sm:-mx-2">
                  <div className={`self-start min-w-[1.75rem] sm:min-w-[2.5rem] px-1 sm:px-2 h-7 sm:h-10 flex-shrink-0 border-2 border-black flex items-center justify-center font-black text-xs sm:text-lg bg-white shadow-[2px_2px_0_0_#000]`}>
                    {student.initials}
                  </div>
                  
                  <h3 className={`mt-1 mr-1 px-2 py-0.5 border-2 border-black font-black text-[10px] sm:text-xs text-center line-clamp-1 break-all ${bgClass} shadow-[2px_2px_0_0_#000]`}>
                    {student.name}
                  </h3>
                </div>
                
                {/* Bottom Overlays */}
                <div className="flex flex-col gap-1 sm:gap-1.5 mt-auto -mx-1 sm:-mx-1">
                  {/* Role & Bday row */}
                  <div className="flex gap-1 w-full pointer-events-auto">
                    {student.role && (
                      <span className={`px-1 border-2 border-black font-bold uppercase text-[8px] sm:text-[9px] shadow-[2px_2px_0_0_#000] truncate flex-1 text-center bg-white`}>
                        {student.role}
                      </span>
                    )}
                    {student.birthday && (
                      <span className={`px-1 border-2 border-black font-bold uppercase text-[8px] sm:text-[9px] shadow-[2px_2px_0_0_#000] truncate flex-1 text-center bg-white`}>
                        🎂 {student.birthday}
                      </span>
                    )}
                  </div>
                  
                  {/* About me (fun fact) */}
                  {student.funFact && (
                    <span className={`px-1 border-2 border-black font-medium text-[9px] sm:text-[10px] shadow-[2px_2px_0_0_#000] w-full text-center bg-white line-clamp-2 leading-tight py-0.5 pointer-events-auto`}>
                      {student.funFact}
                    </span>
                  )}

                  {/* Song integration */}
                  {student.song && (
                    <div className="w-full flex items-center gap-1 bg-white border-2 border-black p-1 shadow-[2px_2px_0_0_#000] pointer-events-auto">
                      <img src={student.song.coverUrl} alt="Cover" className="w-5 h-5 sm:w-6 sm:h-6 border border-black shrink-0" />
                      <div className="overflow-hidden min-w-0">
                        <p className="font-bold text-[7px] sm:text-[8px] truncate uppercase leading-none">{student.song.title}</p>
                        <p className="text-[6px] sm:text-[7px] truncate font-body leading-none text-gray-600">{student.song.artist}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {students.length === 0 && (
          <div className="col-span-full text-center p-6 sm:p-8 border-2 sm:border-4 border-black border-dashed font-bold text-xs sm:text-sm bg-white">
            No students added yet. Admin needs to add them!
          </div>
        )}
      </div>
    </section>
  );
}
