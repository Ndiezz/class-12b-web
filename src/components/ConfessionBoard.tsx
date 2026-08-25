import { useEffect, useState } from "react";
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import { useRole } from "@/src/hooks/useRole";
import { Message, Student } from "@/src/types";
import { Trash2, Send, Users, Music, X, Search, Pencil } from "lucide-react";

const COLORS = ["yellow", "cyan", "green", "pink", "orange", "purple", "blue", "lime", "red"] as const;
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
};

export default function ConfessionBoard() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const { isAdmin } = useRole();
  
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
  const [selectedSong, setSelectedSong] = useState<{title: string, artist: string, coverUrl: string} | null>(null);
  
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
      
      if (!isAdmin) recordPost();
      
      setNewMessage({ nickname: "", content: "", color: COLORS[Math.floor(Math.random() * COLORS.length)] });
      setSelectedTo(null);
      setSelectedSong(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "messages", id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMessage) return;
    try {
      await updateDoc(doc(db, "messages", editingMessage.id), {
        content: editingMessage.content,
        isEdited: true,
        editReason: editingMessage.editReason || "Censored by admin"
      });
      setShowEditModal(false);
      setEditingMessage(null);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <section id="board" className="p-4 sm:p-8 max-w-7xl mx-auto border-t-4 border-black graph-paper-pink relative">
      <div className="mb-6 sm:mb-8">
        <span className="bg-neo-green border-2 border-black px-2.5 sm:px-3 py-0.5 sm:py-1 font-bold text-[10px] sm:text-xs uppercase tracking-widest text-black shadow-[2px_2px_0_0_#000] sm:shadow-[3px_3px_0_0_#000]">CHAPTER 02</span>
        <h2 className="text-3xl sm:text-5xl md:text-7xl font-black uppercase mt-3 sm:mt-6 tracking-tight break-words">Confession Board</h2>
        <p className="mt-2 sm:mt-4 font-medium text-xs sm:text-base md:text-lg max-w-2xl text-gray-800 leading-relaxed">
          Bisa pakai nama asli, nama panggilan, atau anonim. Tulisanmu bisa dibaca semua orang, dan hanya bisa mengirim 5 note sehari ya.
        </p>
      </div>

      <div className="bg-white border-2 border-black p-3 sm:p-6 mb-6 sm:mb-12 shadow-[4px_4px_0_0_#000] sm:shadow-[6px_6px_0_0_#000] max-w-4xl relative z-10">
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
          
          <div className="flex flex-wrap gap-2 sm:gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-1.5 sm:gap-2 items-center">
              <button type="submit" className="btn-brutal bg-neo-green hover:bg-green-400 text-xs sm:text-sm py-2 px-3 sm:py-2.5 sm:px-5">
                <Send size={14} className="sm:w-4 sm:h-4" /> Pin It
              </button>
              
              <button type="button" onClick={() => setShowToModal(true)} className={`btn-brutal text-xs sm:text-sm py-2 px-2.5 sm:py-2.5 sm:px-5 ${selectedTo ? 'bg-neo-cyan' : 'bg-white hover:bg-gray-100'}`}>
                <Users size={14} className="sm:w-4 sm:h-4" /> {selectedTo ? `To: ${selectedTo}` : 'To'}
              </button>
              
              <button type="button" onClick={() => setShowSongModal(true)} className={`btn-brutal text-xs sm:text-sm py-2 px-2.5 sm:py-2.5 sm:px-5 ${selectedSong ? 'bg-neo-pink' : 'bg-white hover:bg-gray-100'}`}>
                <Music size={14} className="sm:w-4 sm:h-4" /> {selectedSong ? 'Song Added' : 'Song'}
              </button>
            </div>
            
            <div className="flex gap-1 items-center overflow-x-auto py-1">
              {COLORS.map(c => (
                <button 
                  key={c}
                  type="button"
                  onClick={() => setNewMessage({...newMessage, color: c})}
                  className={`w-5 h-5 sm:w-6 sm:h-6 border-2 border-black shrink-0 ${COLOR_CLASSES[c]} ${newMessage.color === c ? 'scale-125 shadow-[1px_1px_0_0_#000]' : 'opacity-70 hover:opacity-100'} transition-all rounded-full cursor-pointer`}
                />
              ))}
            </div>
          </div>
        </form>
      </div>

      {/* Modals for To and Song */}
      {showToModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white border-4 border-black p-4 sm:p-6 w-full max-w-md shadow-[6px_6px_0_0_#000] max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-xl sm:text-2xl uppercase">Send To...</h3>
              <button onClick={() => setShowToModal(false)} className="p-1 hover:bg-gray-200 border-2 border-black rounded-full"><X size={18} /></button>
            </div>
            <div className="overflow-y-auto flex-1 border-2 border-black p-2 space-y-1 sm:space-y-2 text-xs sm:text-sm">
              <button 
                onClick={() => { setSelectedTo(null); setShowToModal(false); }}
                className="w-full text-left p-2 hover:bg-neo-yellow font-bold uppercase border-b-2 border-dashed border-gray-300"
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
      )}

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

      {showSpamModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-neo-red border-4 border-black p-6 sm:p-8 w-full max-w-md shadow-[8px_8px_0_0_#000] text-center">
            <h3 className="font-black text-2xl sm:text-3xl uppercase mb-3 text-white">Hold Up! 🛑</h3>
            <p className="font-bold text-sm sm:text-lg mb-6 text-white leading-relaxed">
              Kamu sudah mengirim 5 note dalam 12 jam terakhir. Beri kesempatan yang lain ya!
            </p>
            <button 
              onClick={() => setShowSpamModal(false)}
              className="btn-brutal bg-white hover:bg-gray-100 w-full text-xs sm:text-sm"
            >
              Okay, I'll wait
            </button>
          </div>
        </div>
      )}

      {showEditModal && editingMessage && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white border-4 border-black p-4 sm:p-6 w-full max-w-md shadow-[6px_6px_0_0_#000] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-xl sm:text-2xl uppercase">Edit Note</h3>
              <button onClick={() => setShowEditModal(false)} className="p-1 hover:bg-gray-200 border-2 border-black rounded-full"><X size={18} /></button>
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
      )}

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
              className={`p-2 sm:p-3 mb-2 sm:mb-4 relative group border sm:border-2 border-black shadow-[2px_2px_0_0_#000] flex flex-col break-inside-avoid ${bgClass}`}
            >
              {isAdmin && (
                <div className="absolute top-1 right-1 sm:top-2 sm:right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <button onClick={() => {
                    setEditingMessage({ id: msg.id!, content: msg.content, editReason: msg.editReason || "" });
                    setShowEditModal(true);
                  }} className="text-black hover:text-blue-500 bg-white border border-black rounded-full p-0.5 sm:p-1 shadow-[1px_1px_0_0_#000]">
                    <Pencil size={11} className="sm:w-3.5 sm:h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(msg.id!)} className="text-black hover:text-red-500 bg-white border border-black rounded-full p-0.5 sm:p-1 shadow-[1px_1px_0_0_#000]">
                    <Trash2 size={11} className="sm:w-3.5 sm:h-3.5" />
                  </button>
                </div>
              )}
              
              {msg.to && (
                <div className="font-bold text-[7px] sm:text-[10px] uppercase tracking-wide border-b border-black/20 pb-0.5 mb-1 sm:mb-2 truncate">
                  To: {msg.to}
                </div>
              )}
              
              <p className="font-medium text-[9px] sm:text-xs mb-1.5 sm:mb-2 leading-tight sm:leading-relaxed whitespace-pre-wrap break-words">
                {msg.content}
              </p>
              
              {msg.isEdited && (
                <div className="mb-1 sm:mb-2 inline-block bg-black text-white text-[6px] sm:text-[8px] font-bold uppercase px-1 py-0.2 shadow-[1px_1px_0_0_rgba(0,0,0,0.5)] self-start max-w-full truncate">
                  EDITED: {msg.editReason}
                </div>
              )}
              
              {msg.song && (
                <div className="flex items-center gap-1 bg-white/50 border border-black p-1 mb-1.5 sm:mb-2">
                  <img src={msg.song.coverUrl} alt="Album Art" className="w-4 h-4 sm:w-6 sm:h-6 border border-black shrink-0" />
                  <div className="overflow-hidden min-w-0">
                    <p className="font-bold text-[7px] sm:text-[9px] truncate uppercase leading-none">{msg.song.title}</p>
                    <p className="text-[6px] sm:text-[8px] truncate font-body leading-none text-gray-700">{msg.song.artist}</p>
                  </div>
                </div>
              )}
              
              <div className="font-bold uppercase text-[7px] sm:text-[9px] flex justify-between items-end mt-auto pt-1 sm:pt-1.5 border-t border-black/20">
                <span className="truncate mr-1 max-w-[55%]">— {msg.nickname}</span>
                <span className="text-[6px] sm:text-[8px] opacity-75 text-right font-body tracking-tight shrink-0">{timeString}<br/>{dateString}</span>
              </div>
            </div>
          );
        })}
      </div>
      
      {messages.length === 0 && (
        <div className="text-center p-8 sm:p-12 border-2 border-black border-dashed font-bold text-sm sm:text-xl bg-white shadow-[4px_4px_0_0_#000] mt-6">
          No confessions yet. Be the first!
        </div>
      )}
    </section>
  );
}
