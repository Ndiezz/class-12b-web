import { useEffect, useState } from "react";
import { collection, onSnapshot, addDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import { useRole } from "@/src/hooks/useRole";
import { GalleryImage } from "@/src/types";
import { NeoCard } from "./ui/NeoCard";
import { NeoButton } from "./ui/NeoButton";
import { Trash2 } from "lucide-react";

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
    try {
      await addDoc(collection(db, "gallery"), { ...newImage, createdAt: Date.now() });
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
    <section id="gallery" className="p-4 sm:p-8 max-w-7xl mx-auto border-t-4 border-black border-dashed">
      <div className="mb-6 sm:mb-8">
        <span className="bg-neo-pink border-2 sm:border-4 border-black px-2 sm:px-3 py-0.5 sm:py-1 font-bold text-xs sm:text-sm uppercase">Chapter 03</span>
        <h2 className="text-3xl sm:text-5xl md:text-7xl font-black uppercase mt-3 sm:mt-4 break-words">Memory Wall</h2>
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

      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-8">
        {images.map((img) => (
          <div key={img.id} className="relative group border-2 sm:border-4 border-black shadow-[3px_3px_0_0_#000] sm:shadow-[8px_8px_0_0_#000] bg-white p-1.5 sm:p-2 transform transition-transform hover:-rotate-1 sm:hover:-rotate-2">
            {isAdmin && (
              <button onClick={() => handleDelete(img.id!)} className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10 bg-white border border-black p-0.5 sm:p-1 text-black hover:bg-red-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                <Trash2 size={14} className="sm:w-5 sm:h-5" />
              </button>
            )}
            <div className="aspect-square border-2 sm:border-4 border-black overflow-hidden bg-gray-200">
              <img src={img.url} alt={img.caption} className="w-full h-full object-cover" />
            </div>
            {img.caption && (
              <p className="mt-2 sm:mt-4 font-bold text-center uppercase tracking-wide px-1 sm:px-2 pb-1 sm:pb-2 text-[10px] sm:text-base break-words line-clamp-2 sm:line-clamp-none">
                {img.caption}
              </p>
            )}
          </div>
        ))}
        {images.length === 0 && (
          <div className="col-span-full text-center p-8 sm:p-12 border-2 sm:border-4 border-black border-dashed font-bold text-sm sm:text-xl">
            No memories added yet.
          </div>
        )}
      </div>
    </section>
  );
}
