const fs = require('fs');
let code = fs.readFileSync('src/components/ConfessionBoard.tsx', 'utf8');

const effectCode = `  useEffect(() => {
    if (showToModal || showSongModal || showSpamModal || showEditModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [showToModal, showSongModal, showSpamModal, showEditModal]);`;

code = code.replace(effectCode, '');

// insert it right before searchSong function or after the modal state definitions
const target = `  const [selectedSong, setSelectedSong] = useState<{title: string, artist: string, coverUrl: string} | null>(null);`;
code = code.replace(target, target + '\n\n' + effectCode);

fs.writeFileSync('src/components/ConfessionBoard.tsx', code);
