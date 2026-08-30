const fs = require('fs');
let code = fs.readFileSync('src/components/ConfessionBoard.tsx', 'utf8');

// 1. Imports
code = code.replace(
  'import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";',
  'import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, setDoc } from "firebase/firestore";'
);
if (!code.includes('import { motion } from "motion/react";')) {
  code = code.replace(
    'import { Trash2, Send, Users, Music, X, Search, Pencil, Download, Eye } from "lucide-react";',
    'import { Trash2, Send, Users, Music, X, Search, Pencil, Download, Eye } from "lucide-react";\nimport { motion, AnimatePresence } from "motion/react";'
  );
}

// 2. handleEditSubmit with undo
const oldHandleEdit = `  const handleEditSubmit = async (e: React.FormEvent) => {
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
  };`;

const newHandleEdit = `  const handleEditSubmit = async (e: React.FormEvent) => {
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
          }} className="bg-neo-yellow px-2 py-1 font-bold border-2 border-black shadow-[2px_2px_0_0_#000] text-xs">
            UNDO
          </button>
        </div>
      ), { duration: 4000 });
      
      setShowEditModal(false);
      setEditingMessage(null);
    } catch (err) {
      console.error(err);
    }
  };`;
code = code.replace(oldHandleEdit, newHandleEdit);

// 3. handleDelete with undo
const oldHandleDelete = `  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "messages", id));
    } catch (err) {
      console.error(err);
    }
  };`;
const newHandleDelete = `  const handleDelete = async (id: string) => {
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

// 4. Always show admin buttons on mobile instead of hiding them
code = code.replace(
  'className="absolute top-1 right-1 sm:top-2 sm:right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"',
  'className="absolute top-1 right-1 sm:top-2 sm:right-2 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-10"'
);

// 5. NGL Modal UI & html2canvas fixes & animations
// Wrapping modal in AnimatePresence is tricky due to createPortal. We will wrap the inner element with motion.div.
// Note: AnimatePresence requires the component to remain mounted while exiting, which isn't easy here, so we just do enter animation.
code = code.replace(
  '<div className="w-full max-w-sm relative flex flex-col gap-4 items-center">',
  '<motion.div initial={{ scale: 0.8, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 25 }} className="w-full max-w-sm relative flex flex-col gap-4 items-center">'
);
code = code.replace(
  'html2canvas(node, { scale: 3, backgroundColor: null }).then(canvas => {',
  'html2canvas(node, { scale: 3, backgroundColor: null, useCORS: true, allowTaint: true }).then(canvas => {'
);
code = code.replace(
  '<p className="font-black text-[10px] text-neo-pink uppercase tracking-widest leading-none mb-1">Attached Song</p>',
  ''
);

// Add From: nickname in NGL header
const oldHeader = `<h4 className="font-black text-sm uppercase mt-1 text-black">
                    {selectedNglNote.to ? \`To: \${selectedNglNote.to}\` : "Send me anonymous messages!"}
                  </h4>`;
const newHeader = `<h4 className="font-black text-sm uppercase mt-1 text-black">
                    {selectedNglNote.to ? \`To: \${selectedNglNote.to}\` : \`From: \${selectedNglNote.nickname}\`}
                  </h4>`;
code = code.replace(oldHeader, newHeader);

// Close motion.div (which replaces the div holding the ngl-sticker and buttons)
code = code.replace(
  '</div>\n        </div>\n      , document.body)}',
  '</motion.div>\n        </div>\n      , document.body)}'
);

fs.writeFileSync('src/components/ConfessionBoard.tsx', code);
