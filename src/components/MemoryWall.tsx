import { useEffect, useState } from "react";
import { collection, onSnapshot, addDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import { useRole } from "@/src/hooks/useRole";
import { GalleryImage } from "@/src/types";
import { NeoCard } from "./ui/NeoCard";
import { NeoButton } from "./ui/NeoButton";
import { Trash2 } from "lucide-react";

const parseImageUrl = (url: string) => {
  const driveRegex = /\/file\/d\/([a-zA-Z0-9_-]+)/;
  const match = url.match(driveRegex);
  if (match && match[1]) {
    return `https://drive.google.com/uc?export=view&id=${match[1]}`;
  }
  return url;
};

export default function MemoryWall() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const { isAdmin, isMember } = useRole();
  const [newImage, setNewImage] = useState({ url: "", caption: "" });

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
      await addDoc(collection(db, "gallery"), { url: finalUrl, caption: newImage.caption, createdAt: Date.now() });
      setNewImage({ url: "", caption: "" });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "gallery", id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <section id="gallery" className="p-4 sm:p-8 max-w-7xl mx-auto border-t-4 border-black border-dashed relative z-10">
      <div className="mb-6 sm:mb-8">
        <span className="bg-neo-pink border-2 border-black px-2.5 sm:px-3 py-0.5 sm:py-1 font-bold text-[10px] sm:text-xs uppercase tracking-widest text-black shadow-[2px_2px_0_0_#000] sm:shadow-[3px_3px_0_0_#000]">CHAPTER 03</span>
        <h2 className="text-3xl sm:text-5xl md:text-7xl font-black uppercase mt-3 sm:mt-4 break-words">Kenangan Kita</h2>
        <p className="mt-2 sm:mt-4 font-bold text-xs sm:text-sm max-w-2xl text-gray-800">
          Jangan lupa ganti izin akses link jadi publik/semua orang yang memiliki link ya!
        </p>
      </div>

      {(isAdmin || isMember) && (
        <NeoCard color="white" className="p-4 sm:p-6 mb-6 sm:mb-12">
          <h3 className="font-bold text-lg sm:text-xl mb-4 uppercase">Add Photo</h3>
          <form onSubmit={handleAdd} className="flex flex-wrap gap-3 sm:gap-4 items-end">
            <div className="flex flex-col flex-1 min-w-[150px]">
              <label className="font-bold text-xs sm:text-sm">Image URL</label>
              <input type="url" className="input-brutal text-xs sm:text-sm" placeholder="https://..." value={newImage.url} onChange={e => setNewImage({...newImage, url: e.target.value})} required />
            </div>
            <div className="flex flex-col flex-1 min-w-[150px]">
              <label className="font-bold text-xs sm:text-sm">Caption (optional)</label>
              <input type="text" className="input-brutal text-xs sm:text-sm" value={newImage.caption} onChange={e => setNewImage({...newImage, caption: e.target.value})} />
            </div>
            <NeoButton type="submit" color="pink" className="h-[44px] text-xs sm:text-sm">Add</NeoButton>
          </form>
        </NeoCard>
      )}

      <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-3 sm:gap-6 space-y-3 sm:space-y-6">
        {images.map((img) => (
          <div key={img.id} className="relative group break-inside-avoid border-2 sm:border-4 border-black shadow-[3px_3px_0_0_#000] sm:shadow-[6px_6px_0_0_#000] bg-white p-1.5 sm:p-2 transform transition-transform hover:-rotate-1 sm:hover:-rotate-2">
            {isAdmin && (
              <button onClick={() => handleDelete(img.id!)} className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10 bg-white border border-black p-0.5 sm:p-1 text-black hover:bg-red-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                <Trash2 size={14} className="sm:w-5 sm:h-5" />
              </button>
            )}
            <div className="border-2 sm:border-4 border-black overflow-hidden bg-gray-200">
              <img src={img.url} alt={img.caption} className="w-full h-auto object-cover" />
            </div>
            {img.caption && (
              <p className="mt-2 sm:mt-4 font-bold text-center uppercase tracking-wide px-1 sm:px-2 pb-1 sm:pb-2 text-[10px] sm:text-base break-words line-clamp-2 sm:line-clamp-none">
                {img.caption}
              </p>
            )}
          </div>
        ))}
        {images.length === 0 && (
          <div className="col-span-full break-inside-avoid text-center p-8 sm:p-12 border-2 sm:border-4 border-black border-dashed font-bold text-sm sm:text-xl">
            No memories added yet.
          </div>
        )}
      </div>
    </section>
  );
}
