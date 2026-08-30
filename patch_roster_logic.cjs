const fs = require('fs');
let code = fs.readFileSync('src/components/Roster.tsx', 'utf8');

// 1. Add states
if (!code.includes('const [loading, setLoading] = useState(true);')) {
  code = code.replace(
    'const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);',
    `const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);`
  );
}

// 2. Set loading false
code = code.replace(
  'setStudents(data.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase())));',
  'setStudents(data.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase())));\n      setLoading(false);'
);

// 3. Handle edit and add submit
const handleAddRegex = /const handleAdd = async \([^]*?setNewStudent\([^]*?\);[^}]*?setSelectedSong\(null\);\n    } catch \(err\) {\n      console\.error\(err\);\n    }\n  };/;
const newHandleSubmit = `const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.name || !newStudent.initials) return;
    
    try {
      const studentData: any = { ...newStudent, imageUrl: parseImageUrl(newStudent.imageUrl) };
      if (selectedSong) studentData.song = selectedSong;
      
      if (editingId) {
        await updateDoc(doc(db, "students", editingId), studentData);
        setEditingId(null);
      } else {
        await addDoc(collection(db, "students"), studentData);
      }
      setNewStudent({ name: "", initials: "", role: "", funFact: "", birthday: "", color: "white", imageUrl: "", instagram: "", tiktok: "", quote: "", favSubject: "" });
      setSelectedSong(null);
    } catch (err) {
      console.error(err);
    }
  };
  
  const handleEditClick = (e: React.MouseEvent, student: Student) => {
    e.stopPropagation();
    setNewStudent({
      name: student.name || "",
      initials: student.initials || "",
      role: student.role || "",
      funFact: student.funFact || "",
      birthday: student.birthday || "",
      color: student.color || "white",
      imageUrl: student.imageUrl || "",
      instagram: student.instagram || "",
      tiktok: student.tiktok || "",
      quote: student.quote || "",
      favSubject: student.favSubject || ""
    });
    setSelectedSong(student.song || null);
    setEditingId(student.id || null);
    // scroll to form
    const formEl = document.getElementById("admin-form");
    if (formEl) formEl.scrollIntoView({ behavior: "smooth" });
  };
  
  const cancelEdit = () => {
    setEditingId(null);
    setNewStudent({ name: "", initials: "", role: "", funFact: "", birthday: "", color: "white", imageUrl: "", instagram: "", tiktok: "", quote: "", favSubject: "" });
    setSelectedSong(null);
  };`;
code = code.replace(handleAddRegex, newHandleSubmit);

// 4. Update the Admin form title
code = code.replace(
  '<h3 className="font-bold text-lg sm:text-xl mb-4 uppercase">Admin: Add Student</h3>',
  '<h3 id="admin-form" className="font-bold text-lg sm:text-xl mb-4 uppercase">{editingId ? "Admin: Edit Student" : "Admin: Add Student"}</h3>'
);

// 5. Add Cancel Edit button
code = code.replace(
  '<NeoButton type="submit" color="pink" className="h-[44px]">Add Student</NeoButton>',
  '<NeoButton type="submit" color="pink" className="h-[44px]">{editingId ? "Update" : "Add Student"}</NeoButton>\n            {editingId && <NeoButton type="button" onClick={cancelEdit} color="white" className="h-[44px]">Cancel</NeoButton>}'
);
code = code.replace(
  '<NeoButton type="submit" color="pink" className="h-[44px]">Tambah</NeoButton>',
  '<NeoButton type="submit" color="pink" className="h-[44px]">{editingId ? "Update" : "Tambah"}</NeoButton>\n            {editingId && <NeoButton type="button" onClick={cancelEdit} color="white" className="h-[44px]">Cancel</NeoButton>}'
);
// just in case "Add Student" or "Tambah" text wasn't matched properly:
if (!code.includes('editingId ? "Update"')) {
    code = code.replace(
        /<NeoButton type="submit" color="pink" className="h-\[44px\]">[^<]*<\/NeoButton>/,
        '<NeoButton type="submit" color="pink" className="h-[44px]">{editingId ? "Update" : "Simpan"}</NeoButton>\n            {editingId && <NeoButton type="button" onClick={cancelEdit} color="white" className="h-[44px]">Batal</NeoButton>}'
    );
}

fs.writeFileSync('src/components/Roster.tsx', code);
