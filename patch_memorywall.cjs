const fs = require('fs');
let code = fs.readFileSync('src/components/MemoryWall.tsx', 'utf8');

if (!code.includes('setDoc')) {
  code = code.replace(
    'import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, arrayUnion } from "firebase/firestore";',
    'import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, arrayUnion, setDoc } from "firebase/firestore";'
  );
}

const oldHandleDelete = `  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "gallery", id));
      if (selectedImg?.id === id) setSelectedImg(null);
    } catch (err) {
      console.error(err);
    }
  };`;
const newHandleDelete = `  const handleDelete = async (id: string) => {
    const imgToDel = gallery.find(i => i.id === id);
    if (!imgToDel) return;
    try {
      await deleteDoc(doc(db, "gallery", id));
      if (selectedImg?.id === id) setSelectedImg(null);
      toast((t) => (
        <div className="flex items-center gap-3">
          <span className="font-bold text-sm">Image deleted</span>
          <button onClick={() => {
            toast.dismiss(t.id);
            setDoc(doc(db, "gallery", id), imgToDel);
            toast.success("Image restored!");
          }} className="bg-neo-cyan px-2 py-1 font-bold border-2 border-black shadow-[2px_2px_0_0_#000] text-xs">
            UNDO
          </button>
        </div>
      ), { duration: 4000 });
    } catch (err) {
      console.error(err);
    }
  };`;
code = code.replace(oldHandleDelete, newHandleDelete);
fs.writeFileSync('src/components/MemoryWall.tsx', code);
