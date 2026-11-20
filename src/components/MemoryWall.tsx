import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, arrayUnion, setDoc, runTransaction } from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import { getOrCreateClientId } from "@/src/lib/clientId";
import { useRole } from "@/src/hooks/useRole";
import { GalleryImage } from "@/src/types";
import { NeoCard } from "./ui/NeoCard";
import { NeoButton } from "./ui/NeoButton";
import { createPortal } from "react-dom";
import { Trash2, Heart, MessageCircle, X, Download, Film, Image as ImageIcon } from "lucide-react";
import html2canvas from "html2canvas";

const extractDriveFileId = (url: string): string | null => {
  if (!url) return null;
  const matchFileD = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (matchFileD?.[1]) return matchFileD[1];
  const matchLh3 = url.match(/googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
  if (matchLh3?.[1]) return matchLh3[1];
  const matchId = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchId?.[1]) return matchId[1];
  return null;
};

const parseImageUrl = (url: string) => {
  if (!url) return "";
  const id = extractDriveFileId(url);
  if (id) {
    return `https://lh3.googleusercontent.com/d/${id}`;
  }
  return url;
};

const getDrivePreviewUrl = (url: string): string | null => {
  const id = extractDriveFileId(url);
  if (id) {
    return `https://drive.google.com/file/d/${id}/preview`;
  }
  return null;
};

const isDirectVideoUrl = (url: string): boolean => {
  if (!url) return false;
  return /\.(mp4|webm|mov|m4v|mkv|avi|ogg|3gp)(\?|#|$)/i.test(url) || /\/preview(\?|#|$)/i.test(url);
};

async function detectMediaTypeFromUrl(url: string): Promise<"image" | "video"> {
  if (!url) return "image";
  if (isDirectVideoUrl(url)) return "video";

  const driveId = extractDriveFileId(url);
  if (!driveId) return "image";

  const endpoints = [
    `/class-12b-web/api/gdrive-detect?id=${encodeURIComponent(driveId)}`,
    `/api/gdrive-detect?id=${encodeURIComponent(driveId)}`,
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        if (data?.mediaType === "video" || data?.mediaType === "image") {
          return data.mediaType;
        }
      }
    } catch {
      // try next endpoint
    }
  }
  return "image";
}

export default function MemoryWall() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const { isAdmin, isMember } = useRole();
  const [newImage, setNewImage] = useState({ url: "", caption: "" });
  const [isAdding, setIsAdding] = useState(false);
  const [selectedImg, setSelectedImg] = useState<GalleryImage | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [commentNickname, setCommentNickname] = useState("");
  const [pendingKeys, setPendingKeys] = useState<Record<string, boolean>>({});
  const pendingLocksRef = useRef<Set<string>>(new Set());
  const autoCheckedIdsRef = useRef<Set<string>>(new Set());
  const clientId = getOrCreateClientId();

  useEffect(() => {
    if (selectedImg) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [selectedImg]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "gallery"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GalleryImage));
      setImages(data.sort((a, b) => b.createdAt - a.createdAt));
      setLoading(false);
    });
    return unsub;
  }, []);

  // Keep selectedImg synchronized with real-time Firestore updates (e.g. mediaType toggle or new comments)
  useEffect(() => {
    if (!selectedImg?.id) return;
    const updated = images.find(i => i.id === selectedImg.id);
    if (updated) {
      setSelectedImg(updated);
    }
  }, [images, selectedImg?.id]);

  // Background auto-detection for any existing Google Drive item that doesn't have mediaType saved yet
  useEffect(() => {
    images.forEach((img) => {
      if (!img.id || img.mediaType) return;
      if (autoCheckedIdsRef.current.has(img.id)) return;
      const driveId = extractDriveFileId(img.url);
      if (!driveId && !isDirectVideoUrl(img.url)) return;

      autoCheckedIdsRef.current.add(img.id);
      detectMediaTypeFromUrl(img.url).then((detected) => {
        if (detected === "video" && img.id) {
          updateDoc(doc(db, "gallery", img.id), { mediaType: "video" }).catch(() => {});
        }
      });
    });
  }, [images]);

  const resolveItemMediaType = (img: GalleryImage): "image" | "video" => {
    if (img.mediaType === "video" || img.mediaType === "image") {
      return img.mediaType;
    }
    if (isDirectVideoUrl(img.url)) {
      return "video";
    }
    return "image";
  };

  const handleToggleMediaType = async (e: React.MouseEvent, img: GalleryImage) => {
    e.stopPropagation();
    if (!img.id) return;
    const currentType = resolveItemMediaType(img);
    const nextType: "image" | "video" = currentType === "video" ? "image" : "video";
    try {
      await updateDoc(doc(db, "gallery", img.id), { mediaType: nextType });
      toast.success(
        nextType === "video" ? "Diubah ke pemutar Video!" : "Diubah ke tampilan Foto!",
        { id: "app-toast", duration: 2000 }
      );
    } catch (err) {
      console.error("Failed to toggle media type:", err);
      toast.error("Gagal mengubah tipe media!", { id: "app-toast", duration: 2500 });
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newImage.url || isAdding) return;

    setIsAdding(true);
    try {
      const detectedType = await detectMediaTypeFromUrl(newImage.url);
      const driveId = extractDriveFileId(newImage.url);
      const finalUrl = driveId
        ? `https://lh3.googleusercontent.com/d/${driveId}`
        : newImage.url;

      await addDoc(collection(db, "gallery"), {
        url: finalUrl,
        caption: newImage.caption,
        mediaType: detectedType,
        createdAt: Date.now(),
        likes: [],
        reactions: {},
        userReactions: {},
        comments: []
      });
      setNewImage({ url: "", caption: "" });
      toast.success(
        detectedType === "video"
          ? "Video kenangan berhasil ditambahkan!"
          : "Foto kenangan berhasil ditambahkan!",
        { id: "app-toast", duration: 2500 }
      );
    } catch (err) {
      console.error(err);
      toast.error("Gagal menambahkan kenangan!", { id: "app-toast", duration: 2500 });
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    const imgToDel = images.find(i => i.id === id);
    if (!imgToDel) return;
    try {
      await deleteDoc(doc(db, "gallery", id));
      if (selectedImg?.id === id) setSelectedImg(null);
      toast((t) => (
        <div className="flex items-center gap-3">
          <span className="font-bold text-sm">Memory deleted</span>
          <button onClick={() => {
            toast.dismiss(t.id);
            setDoc(doc(db, "gallery", id), imgToDel);
            toast.success("Memory restored!");
          }} className="bg-neo-cyan px-2 py-1 font-bold border-2 border-[#000] shadow-[2px_2px_0_0_#000] text-xs">
            UNDO
          </button>
        </div>
      ), { duration: 4000 });
    } catch (err) {
      console.error(err);
    }
  };

  const getSelectedEmoji = (img: GalleryImage): string | null => {
    if (img.userReactions && img.userReactions[clientId]) {
      return img.userReactions[clientId];
    }
    if (img.id) {
      try {
        return localStorage.getItem(`selected_emoji_${img.id}`);
      } catch {
        return null;
      }
    }
    return null;
  };

  const handleReaction = async (e: React.MouseEvent, img: GalleryImage, emoji: string) => {
    e.stopPropagation();
    if (!img.id) return;

    const lockKey = `react_${img.id}`;
    if (pendingLocksRef.current.has(lockKey)) return;

    pendingLocksRef.current.add(lockKey);
    setPendingKeys(prev => ({ ...prev, [lockKey]: true }));

    const storageKey = `selected_emoji_${img.id}`;

    try {
      const imgRef = doc(db, "gallery", img.id);
      let actionResult: "added" | "switched" | "removed" = "added";

      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(imgRef);
        if (!snap.exists()) return;

        const data = snap.data() as GalleryImage;
        const reactions: Record<string, number> = { ...(data.reactions || {}) };
        const userReactions: Record<string, string> = { ...(data.userReactions || {}) };

        let previousEmoji: string | undefined = userReactions[clientId];
        if (!previousEmoji) {
          try {
            const localSaved = localStorage.getItem(storageKey);
            if (localSaved && (reactions[localSaved] || 0) > 0) {
              previousEmoji = localSaved;
            }
          } catch {
            // ignore storage errors
          }
        }

        if (previousEmoji === emoji) {
          reactions[emoji] = Math.max(0, (reactions[emoji] || 1) - 1);
          delete userReactions[clientId];
          actionResult = "removed";
        } else if (previousEmoji && previousEmoji !== emoji) {
          reactions[previousEmoji] = Math.max(0, (reactions[previousEmoji] || 1) - 1);
          reactions[emoji] = (reactions[emoji] || 0) + 1;
          userReactions[clientId] = emoji;
          actionResult = "switched";
        } else {
          reactions[emoji] = (reactions[emoji] || 0) + 1;
          userReactions[clientId] = emoji;
          actionResult = "added";
        }

        transaction.update(imgRef, {
          reactions,
          userReactions
        });
      });

      try {
        localStorage.removeItem(`emoji_spam_${img.id}`);
        if (actionResult === "removed") {
          localStorage.removeItem(storageKey);
        } else {
          localStorage.setItem(storageKey, emoji);
        }
      } catch {
        // ignore storage errors
      }
    } catch (err) {
      console.error("Error reacting:", err);
      toast.error("Gagal memperbarui reaksi emoji!", { id: "app-toast", duration: 2500 });
    } finally {
      pendingLocksRef.current.delete(lockKey);
      setPendingKeys(prev => {
        const next = { ...prev };
        delete next[lockKey];
        return next;
      });
    }
  };

  const handleLike = async (e: React.MouseEvent, img: GalleryImage) => {
    e.stopPropagation();
    if (!img.id) return;

    const lockKey = `like_${img.id}`;
    if (pendingLocksRef.current.has(lockKey)) return;

    pendingLocksRef.current.add(lockKey);
    setPendingKeys(prev => ({ ...prev, [lockKey]: true }));

    try {
      const imgRef = doc(db, "gallery", img.id);
      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(imgRef);
        if (!snap.exists()) return;

        const data = snap.data() as GalleryImage;
        const currentLikes = Array.isArray(data.likes) ? [...data.likes] : [];
        const hasLiked = currentLikes.includes(clientId);

        const updatedLikes = hasLiked
          ? currentLikes.filter(id => id !== clientId)
          : [...currentLikes, clientId];

        transaction.update(imgRef, { likes: updatedLikes });
      });
    } catch (err) {
      console.error("Error liking:", err);
      toast.error("Gagal memperbarui like!", { id: "app-toast", duration: 2500 });
    } finally {
      pendingLocksRef.current.delete(lockKey);
      setPendingKeys(prev => {
        const next = { ...prev };
        delete next[lockKey];
        return next;
      });
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
    <section id="gallery" className="w-full border-t-4 border-[#000] border-dashed bg-[#2962FF]/10 relative z-10">
    <div className="p-4 sm:p-8 max-w-7xl mx-auto">
      <div className="mb-6 sm:mb-8">
        <span className="bg-neo-pink border-2 border-[#000] px-2.5 sm:px-3 py-0.5 sm:py-1 font-bold text-[10px] sm:text-xs uppercase tracking-widest text-[#000] shadow-[2px_2px_0_0_#000] sm:shadow-[3px_3px_0_0_#000]">CHAPTER 03</span>
        <h2 className="text-3xl sm:text-5xl md:text-7xl font-black uppercase mt-3 sm:mt-4 break-words">Kenangan Kita</h2>
        <p className="mt-2 sm:mt-4 font-bold text-xs sm:text-sm max-w-2xl text-gray-800">
          Bisa menaruh link Foto maupun Video dari Google Drive! Jangan lupa ganti izin akses link jadi publik/semua orang yang memiliki link ya!
        </p>
      </div>

      {(isAdmin || isMember) && (
        <NeoCard color="white" className="p-4 sm:p-6 mb-6 sm:mb-12">
          <h3 className="font-bold text-lg sm:text-xl mb-4 uppercase">Tambah Foto / Video</h3>
          <form onSubmit={handleAdd} className="flex flex-wrap gap-3 sm:gap-4 items-end">
            <div className="flex flex-col flex-1 min-w-[150px]">
              <label className="font-bold text-xs sm:text-sm">URL Foto atau Video (Google Drive / Link)</label>
              <input type="url" className="input-brutal text-xs sm:text-sm" placeholder="https://drive.google.com/file/d/..." value={newImage.url} onChange={e => setNewImage({...newImage, url: e.target.value})} required />
            </div>
            <div className="flex flex-col flex-1 min-w-[150px]">
              <label className="font-bold text-xs sm:text-sm">Keterangan (opsional)</label>
              <input type="text" className="input-brutal text-xs sm:text-sm" value={newImage.caption} onChange={e => setNewImage({...newImage, caption: e.target.value})} />
            </div>
            <NeoButton type="submit" color="pink" className="h-[44px] text-xs sm:text-sm" disabled={isAdding}>
              {isAdding ? "Mendeteksi..." : "Tambah"}
            </NeoButton>
          </form>
        </NeoCard>
      )}

      <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 sm:gap-6 space-y-3 sm:space-y-6">
        
      {loading && (
        <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 sm:gap-6 space-y-3 sm:space-y-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="break-inside-avoid border-2 sm:border-4 border-[#000] bg-[#fff] p-1.5 sm:p-2 shadow-[3px_3px_0_0_#000] sm:shadow-[6px_6px_0_0_#000]">
              <div className="border-2 sm:border-4 border-[#000] aspect-[3/4] bg-[#e5e7eb] animate-pulse"></div>
              <div className="mt-2 h-4 bg-[#e5e7eb] animate-pulse w-1/3"></div>
              <div className="mt-2 flex gap-1"><div className="h-4 bg-[#e5e7eb] animate-pulse w-8 rounded-full"></div></div>
            </div>
          ))}
        </div>
      )}

        {!loading && images.map((img) => {
          const likesList = img.likes || [];
          const likesCount = likesList.length;
          const hasLiked = likesList.includes(clientId);
          const commentsCount = (img.comments || []).length;
          const activeEmoji = getSelectedEmoji(img);
          const isLikePending = !!pendingKeys[`like_${img.id}`];
          const isReactPending = !!pendingKeys[`react_${img.id}`];
          const itemMediaType = resolveItemMediaType(img);
          const isVideo = itemMediaType === "video";
          const drivePreviewUrl = getDrivePreviewUrl(img.url);
          
          return (
            <div 
              key={img.id} 
              id={`memory-${img.id}`}
              onClick={() => setSelectedImg(img)}
              className="relative group break-inside-avoid border-2 sm:border-4 border-[#000] shadow-[3px_3px_0_0_#000] sm:shadow-[6px_6px_0_0_#000] bg-[#fff] p-1.5 sm:p-2 transform transition-transform hover:-rotate-1 sm:hover:-rotate-2 cursor-pointer"
            >
              <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-20 flex flex-col gap-1 sm:gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" data-html2canvas-ignore>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleDelete(img.id!); }}
                    className="bg-[#fff] border border-[#000] p-0.5 sm:p-1 text-[#000] hover:bg-red-500 hover:text-white rounded-full shadow-[1px_1px_0_0_#000]"
                    title="Hapus"
                  >
                    <Trash2 size={14} className="sm:w-5 sm:h-5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => handleToggleMediaType(e, img)}
                  className="bg-[#fff] border border-[#000] p-0.5 sm:p-1 text-[#000] hover:bg-neo-yellow hover:text-[#000] rounded-full shadow-[1px_1px_0_0_#000]"
                  title={isVideo ? "Ubah tampilan ke Foto" : "Ubah tampilan ke Pemutar Video"}
                >
                  {isVideo ? <ImageIcon size={14} className="sm:w-5 sm:h-5" /> : <Film size={14} className="sm:w-5 sm:h-5" />}
                </button>
                {!isVideo && (
                  <button
                    type="button"
                    onClick={(e) => handleDownload(e, img.id!)}
                    className="bg-[#fff] border border-[#000] p-0.5 sm:p-1 text-[#000] hover:bg-neo-cyan hover:text-[#000] rounded-full shadow-[1px_1px_0_0_#000]"
                    title="Download Image"
                  >
                    <Download size={14} className="sm:w-5 sm:h-5" />
                  </button>
                )}
              </div>

              {isVideo ? (
                <div
                  className="border-2 sm:border-4 border-[#000] overflow-hidden bg-[#000] aspect-video relative"
                  onClick={(e) => e.stopPropagation()}
                >
                  {drivePreviewUrl ? (
                    <iframe
                      src={drivePreviewUrl}
                      title={img.caption || "Google Drive Video"}
                      className="w-full h-full border-0"
                      allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <video
                      src={img.url}
                      controls
                      playsInline
                      preload="metadata"
                      className="w-full h-full object-contain bg-[#000]"
                    />
                  )}
                </div>
              ) : (
                <div className="border-2 sm:border-4 border-[#000] overflow-hidden bg-[#e5e7eb]">
                  <img
                    src={parseImageUrl(img.url)}
                    alt={img.caption}
                    referrerPolicy="no-referrer"
                    className="w-full h-auto object-cover"
                    onError={() => {
                      // If an untyped Google Drive link fails to render as a photo, automatically switch to video player
                      if (!img.mediaType && img.id && extractDriveFileId(img.url)) {
                        updateDoc(doc(db, "gallery", img.id), { mediaType: "video" }).catch(() => {});
                      }
                    }}
                  />
                </div>
              )}
              
              <div className="flex justify-between items-center mt-2 px-1 border-b-2 border-[#000] pb-1 mb-1">
                <button
                  type="button"
                  disabled={isLikePending}
                  onClick={(e) => handleLike(e, img)}
                  title={hasLiked ? "Batalkan Like" : "Sukai"}
                  className={`flex items-center gap-1 text-xs font-bold transition-colors tabular-nums ${
                    hasLiked ? "text-neo-pink" : "text-[#000] hover:text-neo-pink"
                  } ${isLikePending ? "opacity-60 cursor-wait" : ""}`}
                >
                  <Heart size={14} className={hasLiked ? "fill-neo-pink text-neo-pink scale-110 transition-transform" : ""} /> {likesCount}
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => handleToggleMediaType(e, img)}
                    className="text-[10px] font-black uppercase px-1.5 py-0.5 border border-[#000] bg-neo-cyan hover:bg-neo-yellow transition-colors flex items-center gap-1"
                    title={isVideo ? "Ganti ke mode Foto" : "Ganti ke mode Video Google Drive"}
                  >
                    {isVideo ? <Film size={10} /> : <ImageIcon size={10} />}
                    <span>{isVideo ? "VIDEO" : "FOTO"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedImg(img);
                    }}
                    className="flex items-center gap-1 text-xs font-bold text-[#6b7280] hover:text-[#000] tabular-nums"
                    title="Lihat detail & komentar"
                  >
                    <MessageCircle size={14} /> {commentsCount}
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mt-2 px-1">
                {['❤️', '😂', '🔥', '👏', '😢'].map(emoji => {
                  const isSelected = activeEmoji === emoji;
                  const count = img.reactions?.[emoji] || 0;
                  return (
                    <button 
                      key={emoji}
                      type="button"
                      disabled={isReactPending}
                      onClick={(e) => handleReaction(e, img, emoji)}
                      title={isSelected ? "Klik untuk batalkan reaksi" : activeEmoji ? "Klik untuk ganti reaksi ke emoji ini" : "Berikan reaksi"}
                      className={`text-[12px] rounded-full px-2 py-0.5 transition-all flex items-center gap-1 tabular-nums ${
                        isSelected
                          ? "bg-neo-yellow border-2 border-[#000] shadow-[2px_2px_0_0_#000] font-black text-[#000] -translate-y-0.5"
                          : "bg-[#E5E5EA] border border-[#D1D1D6] shadow-sm hover:bg-[#D1D1D6] active:bg-[#C7C7CC] text-[#000]"
                      } ${isReactPending ? "opacity-60 cursor-wait" : ""}`}
                    >
                      <span>{emoji}</span>
                      <span className={`text-[10px] ${isSelected ? "font-black text-[#000]" : "font-semibold text-[#8E8E93]"}`}>{count}</span>
                    </button>
                  );
                })}
              </div>
              {img.caption && (
                <p className="mt-1 font-bold text-left uppercase tracking-wide px-1 sm:px-2 pb-1 sm:pb-2 text-[10px] sm:text-xs break-words line-clamp-2 sm:line-clamp-none">
                  {img.caption}
                </p>
              )}
            </div>
          );
        })}
        {!loading && images.length === 0 && (
          <div className="col-span-full break-inside-avoid text-center p-8 sm:p-12 border-2 sm:border-4 border-[#000] border-dashed font-bold text-sm sm:text-xl">
            No memories added yet.
          </div>
        )}
      </div>

      {/* Image / Video Modal with Comments */}
      {selectedImg && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 bg-[#000]/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedImg(null)}>
          <div className="bg-[#fff] border-4 border-[#000] w-full max-w-5xl shadow-[8px_8px_0_0_#000] flex flex-col lg:flex-row max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Media side (Photo or Google Drive Video Player with default progress bar) */}
            <div className="lg:w-2/3 bg-[#000] flex items-center justify-center relative border-b-4 lg:border-b-0 lg:border-r-4 border-[#000] min-h-[260px] sm:min-h-[360px]">
              {resolveItemMediaType(selectedImg) === "video" ? (
                getDrivePreviewUrl(selectedImg.url) ? (
                  <iframe
                    src={getDrivePreviewUrl(selectedImg.url)!}
                    title={selectedImg.caption || "Google Drive Video"}
                    className="w-full h-[45vh] sm:h-[55vh] lg:h-[85vh] border-0"
                    allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video
                    src={selectedImg.url}
                    controls
                    autoPlay
                    playsInline
                    className="w-full max-h-[50vh] lg:max-h-[85vh] object-contain bg-[#000]"
                  />
                )
              ) : (
                <img
                  src={parseImageUrl(selectedImg.url)}
                  alt={selectedImg.caption}
                  referrerPolicy="no-referrer"
                  className="max-w-full max-h-[50vh] lg:max-h-[90vh] object-contain"
                />
              )}
              <button
                type="button"
                onClick={() => setSelectedImg(null)}
                className="absolute top-4 right-4 p-2 bg-[#fff] hover:bg-[#e5e7eb] border-2 border-[#000] rounded-full shadow-[2px_2px_0_0_#000] z-10"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Comments side */}
            <div className="lg:w-1/3 bg-[#fff] flex flex-col h-[40vh] lg:h-[90vh]">
              <div className="p-4 border-b-4 border-[#000] bg-neo-cyan flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-black text-xl uppercase break-words">
                    {selectedImg.caption || (resolveItemMediaType(selectedImg) === "video" ? "Video" : "Photo")}
                  </h3>
                  <p className="text-xs font-bold mt-1 opacity-75">{new Date(selectedImg.createdAt).toLocaleString()}</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => handleToggleMediaType(e, selectedImg)}
                  className="shrink-0 bg-[#fff] hover:bg-neo-yellow border-2 border-[#000] px-2 py-1 text-[10px] font-black uppercase shadow-[2px_2px_0_0_#000] flex items-center gap-1"
                  title="Ubah tampilan antara Foto dan Video"
                >
                  {resolveItemMediaType(selectedImg) === "video" ? <ImageIcon size={12} /> : <Film size={12} />}
                  <span>{resolveItemMediaType(selectedImg) === "video" ? "Ubah ke Foto" : "Ubah ke Video"}</span>
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {(images.find(i => i.id === selectedImg.id)?.comments || []).length === 0 ? (
                  <p className="text-center font-bold text-gray-400 text-sm italic mt-8">No comments yet. Be the first!</p>
                ) : (
                  (images.find(i => i.id === selectedImg.id)?.comments || []).map(comment => (
                    <div key={comment.id} className="bg-gray-50 border-2 border-[#000] p-3 shadow-[2px_2px_0_0_#000]">
                      <div className="flex justify-between items-center border-b-2 border-[#000] pb-1 mb-2">
                        <span className="font-black text-xs uppercase bg-neo-cyan px-1">{comment.nickname}</span>
                        <span className="text-[9px] font-bold text-[#6b7280]">{new Date(comment.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="font-medium text-sm leading-snug">{comment.text}</p>
                    </div>
                  ))
                )}
              </div>
              
              <div className="p-4 border-t-4 border-[#000] bg-gray-100">
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
