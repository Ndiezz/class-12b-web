const fs = require('fs');
let code = fs.readFileSync('src/components/ConfessionBoard.tsx', 'utf8');

// Imports
code = code.replace(
  'import { Trash2, Send, Users, Music, X, Search, Pencil } from "lucide-react";',
  'import { Trash2, Send, Users, Music, X, Search, Pencil, Download, Eye } from "lucide-react";\nimport html2canvas from "html2canvas";'
);

// State
const stateInsert = `
  const [revealedNotes, setRevealedNotes] = useState<Set<string>>(new Set());
  const [selectedNglNote, setSelectedNglNote] = useState<Message | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('revealed_notes');
    if (saved) {
      try {
        setRevealedNotes(new Set(JSON.parse(saved)));
      } catch(e){}
    }
  }, []);

  const handleReveal = (msg: Message) => {
    if (!revealedNotes.has(msg.id!)) {
      const newSet = new Set(revealedNotes);
      newSet.add(msg.id!);
      setRevealedNotes(newSet);
      localStorage.setItem('revealed_notes', JSON.stringify(Array.from(newSet)));
    }
    setSelectedNglNote(msg);
  };
`;

code = code.replace(
  'const { isAdmin } = useRole();',
  'const { isAdmin } = useRole();' + stateInsert
);

fs.writeFileSync('src/components/ConfessionBoard.tsx', code);
