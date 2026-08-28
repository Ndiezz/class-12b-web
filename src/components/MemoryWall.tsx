import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import { useRole } from "@/src/hooks/useRole";
import { GalleryImage } from "@/src/types";
import { NeoCard } from "./ui/NeoCard";
import { NeoButton } from "./ui/NeoButton";
import { createPortal } from "react-dom";
import { Trash2, Heart, MessageCircle, X, Download } from "lucide-react";
import html2canvas from "html2canvas";

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

export default function MemoryWall() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const { isAdmin, isMember } = useRole();
  const [newImage, setNewImage] = useState({ url: "", caption: "" });
  const [selectedImg, setSelectedImg] = useState<GalleryImage | null>(null);
  const [commentText, setCommentText] = useState("");
  const [commentNickname, setCommentNickname] = useState("");
  useEffect(() => {
    if (selectedImg) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [selectedImg]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "gallery"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GalleryImage));
      setImages(data.sort((a, b) => b.createdAt - a.createdAt));
    });
    return unsub;
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newImage.url) return;
    
    const finalUrl = parseImageUrl(newImage.url);
    
    try {
      await addDoc(collection(db, "gallery"), { url: finalUrl, caption: newImage.caption, createdAt: Date.now(), likes: [], comments: [] });
      setNewImage({ url: "", caption: "" });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "gallery", id));
      if (selectedImg?.id === id) setSelectedImg(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleReaction = async (e: React.MouseEvent, img: GalleryImage, emoji: string) => {
    e.stopPropagation();
    if (!img.id) return;

    const spamKey = `emoji_spam_${img.id}`;
    const count = parseInt(localStorage.getItem(spamKey) || "0", 10);
    
    if (count >= 3) {
      toast.error("Maksimal 3 emoji per foto untuk satu perangkat!");
      return;
    }

    try {
      const currentReactions = img.reactions || {};
      await updateDoc(doc(db, "gallery", img.id), {
        [`reactions.${emoji}`]: (currentReactions[emoji] || 0) + 1
      });
      localStorage.setItem(spamKey, (count + 1).toString());
    } catch (err) {
      console.error("Error reacting:", err);
    }
  };

  const handleLike = async (e: React.MouseEvent, img: GalleryImage) => {
    e.stopPropagation();
    if (!img.id) return;
    
    // We'll just generate a simple local ID if one doesn't exist to track likes loosely
    let localId = localStorage.getItem("local_user_id");
    if (!localId) {
      localId = Math.random().toString(36).substr(2, 9);
      localStorage.setItem("local_user_id", localId);
    }

    const likes = img.likes || [];
    const hasLiked = likes.includes(localId);

    try {
      if (!hasLiked) {
        await updateDoc(doc(db, "gallery", img.id), {
          likes: arrayUnion(localId)
        });
      }
    } catch (err) {
      console.error("Error liking:", err);
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedImg?.id || !commentText) return;

    try {
      const newComment = {
        id: Math.random().toString(36).substr(2, 9),
        nickname: commentNickname || "ANONYMOUS",
        text: commentText,
        createdAt: Date.now()
      };

      await updateDoc(doc(db, "gallery", selectedImg.id), {
        comments: arrayUnion(newComment)
      });
      
      setCommentText("");
    } catch (err) {
      console.error("Error commenting:", err);
    }
  };

  const handleDownload = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const element = document.getElementById(`memory-${id}`);
    if (!element) return;
    
    try {
      const canvas = await html2canvas(element, { backgroundColor: null, useCORS: true });
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `memory-${id}.png`;
      a.click();
    } catch (err) {
      console.error("Error generating image:", err);
    }
  };

  return (
    <section id="gallery" className="w-full border-t-4 border-black border-dashed bg-[#2962FF]/10 relative z-10">
    <div className="p-4 sm:p-8 max-w-7xl mx-auto">
      <div className="mb-6 sm:mb-8">
        <span className="bg-neo-pink border-2 border-black px-2.5 sm:px-3 py-0.5 sm:py-1 font-bold text-[10px] sm:text-xs uppercase tracking-widest text-black shadow-[2px_2px_0_0_#000] sm:shadow-[3px_3px_0_0_#000]">CHAPTER 03</span>
        <h2 className="text-3xl sm:text-5xl md:text-7xl font-black uppercase mt-3 sm:mt-4 break-words">Kenangan Kita</h2>
        <p className="mt-2 sm:mt-4 font-bold text-xs sm:text-sm max-w-2xl text-gray-800">
          Jangan lupa ganti izin akses link jadi publik/semua orang yang memiliki link ya!
        </p>
      </div>

      {(isAdmin || isMember) && (
        <NeoCard color="white" className="p-4 sm:p-6 mb-6 sm:mb-12">
          <h3 className="font-bold text-lg sm:text-xl mb-4 uppercase">Tambah Foto</h3>
          <form onSubmit={handleAdd} className="flex flex-wrap gap-3 sm:gap-4 items-end">
            <div className="flex flex-col flex-1 min-w-[150px]">
              <label className="font-bold text-xs sm:text-sm">URL Gambar</label>
              <input type="url" className="input-brutal text-xs sm:text-sm" placeholder="https://..." value={newImage.url} onChange={e => setNewImage({...newImage, url: e.target.value})} required />
            </div>
            <div className="flex flex-col flex-1 min-w-[150px]">
              <label className="font-bold text-xs sm:text-sm">Keterangan (opsional)</label>
              <input type="text" className="input-brutal text-xs sm:text-sm" value={newImage.caption} onChange={e => setNewImage({...newImage, caption: e.target.value})} />
            </div>
            <NeoButton type="submit" color="pink" className="h-[44px] text-xs sm:text-sm">Tambah</NeoButton>
          </form>
        </NeoCard>
      )}

      <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-3 sm:gap-6 space-y-3 sm:space-y-6">
        {images.map((img) => {
          const likesCount = (img.likes || []).length;
          const commentsCount = (img.comments || []).length;
          
          return (
            <div 
              key={img.id} 
              id={`memory-${img.id}`}
              onClick={() => setSelectedImg(img)}
              className="relative group break-inside-avoid border-2 sm:border-4 border-black shadow-[3px_3px_0_0_#000] sm:shadow-[6px_6px_0_0_#000] bg-white p-1.5 sm:p-2 transform transition-transform hover:-rotate-1 sm:hover:-rotate-2 cursor-pointer"
            >
              <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10 flex flex-col gap-1 sm:gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" data-html2canvas-ignore>
                {isAdmin && (
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(img.id!); }} className="bg-white border border-black p-0.5 sm:p-1 text-black hover:bg-red-500 hover:text-white rounded-full">
                    <Trash2 size={14} className="sm:w-5 sm:h-5" />
                  </button>
                )}
                <button onClick={(e) => handleDownload(e, img.id!)} className="bg-white border border-black p-0.5 sm:p-1 text-black hover:bg-neo-cyan hover:text-black rounded-full" title="Download Image">
                  <Download size={14} className="sm:w-5 sm:h-5" />
                </button>
              </div>
              <div className="border-2 sm:border-4 border-black overflow-hidden bg-gray-200">
                <img src={parseImageUrl(img.url)} alt={img.caption} referrerPolicy="no-referrer" className="w-full h-auto object-cover" />
              </div>
              
              <div className="flex justify-between items-center mt-2 px-1 border-b-2 border-black pb-1 mb-1">
                <button onClick={(e) => handleLike(e, img)} className="flex items-center gap-1 text-xs font-bold hover:text-neo-pink transition-colors">
                  <Heart size={14} className={likesCount > 0 ? "fill-neo-pink text-neo-pink" : ""} /> {likesCount}
                </button>
                <div className="flex items-center gap-1 text-xs font-bold text-gray-500">
                  <MessageCircle size={14} /> {commentsCount}
                </div>
              </div>


              <div className="flex flex-wrap items-center gap-2 mt-2 px-1">
                {['❤️', '😂', '🔥', '👏', '😢'].map(emoji => (
                  <button 
                    key={emoji} 
                    onClick={(e) => handleReaction(e, img, emoji)}
                    className="text-xs sm:text-sm bg-gray-100 hover:bg-gray-200 border border-black rounded-full px-2 py-0.5 shadow-[1px_1px_0_0_#000] active:translate-y-px active:shadow-none transition-all flex items-center gap-1"
                  >
                    <span>{emoji}</span>
                    <span className="font-bold text-[10px]">{img.reactions?.[emoji] || 0}</span>
                  </button>
                ))}
              </div>
              {img.caption && (
                <p className="mt-1 font-bold text-left uppercase tracking-wide px-1 sm:px-2 pb-1 sm:pb-2 text-[10px] sm:text-xs break-words line-clamp-2 sm:line-clamp-none">
                  {img.caption}
                </p>
              )}
            </div>
          );
        })}
        {images.length === 0 && (
          <div className="col-span-full break-inside-avoid text-center p-8 sm:p-12 border-2 sm:border-4 border-black border-dashed font-bold text-sm sm:text-xl">
            No memories added yet.
          </div>
        )}
      </div>

      {/* Image Modal with Comments */}
      {selectedImg && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedImg(null)}>
          <div className="bg-white border-4 border-black w-full max-w-5xl shadow-[8px_8px_0_0_#000] flex flex-col lg:flex-row max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Image side */}
            <div className="lg:w-2/3 bg-black flex items-center justify-center relative border-b-4 lg:border-b-0 lg:border-r-4 border-black">
              <img src={parseImageUrl(selectedImg.url)} alt={selectedImg.caption} referrerPolicy="no-referrer" className="max-w-full max-h-[50vh] lg:max-h-[90vh] object-contain" />
              <button onClick={() => setSelectedImg(null)} className="absolute top-4 right-4 p-2 bg-white hover:bg-gray-200 border-2 border-black rounded-full shadow-[2px_2px_0_0_#000] z-10"><X size={20} /></button>
            </div>
            
            {/* Comments side */}
            <div className="lg:w-1/3 bg-white flex flex-col h-[40vh] lg:h-[90vh]">
              <div className="p-4 border-b-4 border-black bg-neo-cyan">
                <h3 className="font-black text-xl uppercase break-words">{selectedImg.caption || "Photo"}</h3>
                <p className="text-xs font-bold mt-1 opacity-75">{new Date(selectedImg.createdAt).toLocaleString()}</p>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {(images.find(i => i.id === selectedImg.id)?.comments || []).length === 0 ? (
                  <p className="text-center font-bold text-gray-400 text-sm italic mt-8">No comments yet. Be the first!</p>
                ) : (
                  (images.find(i => i.id === selectedImg.id)?.comments || []).map(comment => (
                    <div key={comment.id} className="bg-gray-50 border-2 border-black p-3 shadow-[2px_2px_0_0_#000]">
                      <div className="flex justify-between items-center border-b-2 border-black pb-1 mb-2">
                        <span className="font-black text-xs uppercase bg-neo-cyan px-1">{comment.nickname}</span>
                        <span className="text-[9px] font-bold text-gray-500">{new Date(comment.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="font-medium text-sm leading-snug">{comment.text}</p>
                    </div>
                  ))
                )}
              </div>
              
              <div className="p-4 border-t-4 border-black bg-gray-100">
                <form onSubmit={handleComment} className="flex flex-col gap-2">
                  <input 
                    type="text" 
                    placeholder="Nickname (Anon)" 
                    className="input-brutal text-xs" 
                    value={commentNickname}
                    onChange={e => setCommentNickname(e.target.value.toUpperCase())}
                  />
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Add a comment..." 
                      className="input-brutal flex-1 text-sm" 
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      required
                    />
                    <NeoButton type="submit" color="pink" className="px-4 shrink-0">Post</NeoButton>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
    </section>
  );
}
