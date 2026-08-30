const fs = require('fs');
let code = fs.readFileSync('src/components/Roster.tsx', 'utf8');

code = code.replace(
  'import { collection, onSnapshot, addDoc, deleteDoc, doc } from "firebase/firestore";',
  'import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";'
);
code = code.replace(
  'import { Trash2, Music, X, Search, Instagram } from "lucide-react";',
  'import { Trash2, Music, X, Search, Instagram, Edit2 } from "lucide-react";'
);

fs.writeFileSync('src/components/Roster.tsx', code);
