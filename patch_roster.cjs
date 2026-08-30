const fs = require('fs');
let code = fs.readFileSync('src/components/Roster.tsx', 'utf8');

// Add imports
if (!code.includes('import toast')) {
  code = code.replace(
    'import { useEffect, useState } from "react";',
    'import { useEffect, useState } from "react";\nimport toast from "react-hot-toast";'
  );
}

if (!code.includes('setDoc')) {
  code = code.replace(
    'import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";',
    'import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, setDoc } from "firebase/firestore";'
  );
}

// Update handleDelete with undo functionality
const oldHandleDelete = `  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "students", id));
    } catch (err) {
      console.error(err);
    }
  };`;
const newHandleDelete = `  const handleDelete = async (id: string) => {
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
          }} className="bg-neo-yellow px-2 py-1 font-bold border-2 border-black shadow-[2px_2px_0_0_#000] text-xs">
            UNDO
          </button>
        </div>
      ), { duration: 4000 });
    } catch (err) {
      console.error(err);
    }
  };`;
code = code.replace(oldHandleDelete, newHandleDelete);

// Update Modal Role background color
code = code.replace(
  '<span className="px-2 py-1 border-2 border-black font-bold uppercase text-xs shadow-[2px_2px_0_0_#000] bg-neo-cyan">',
  '<span className={`px-2 py-1 border-2 border-black font-bold uppercase text-xs shadow-[2px_2px_0_0_#000] ${COLOR_CLASSES[selectedStudent.color] || "bg-white"}`}>'
);

fs.writeFileSync('src/components/Roster.tsx', code);
