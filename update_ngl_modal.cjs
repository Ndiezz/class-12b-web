const fs = require('fs');
let code = fs.readFileSync('src/components/ConfessionBoard.tsx', 'utf8');

const modalStart = '{/* NGL Style IG Story Modal */}';
const modalEnd = ', document.body)}';

const startIndex = code.indexOf(modalStart);
let endIndex = code.indexOf(modalEnd, startIndex);

if (startIndex !== -1 && endIndex !== -1) {
  endIndex += modalEnd.length;
  
  const newModal = `      {/* NGL Style IG Story Modal */}
      {selectedNglNote && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 bg-black/80 z-[100] flex flex-col items-center justify-start sm:justify-center p-4 backdrop-blur-sm overflow-y-auto pt-16 pb-24" onClick={() => setSelectedNglNote(null)}>
          
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setSelectedNglNote(null);
            }}
            className="fixed top-4 right-4 bg-white text-black font-bold p-2 border-2 border-black hover:bg-neo-pink hover:-translate-y-1 transition-all shadow-[2px_2px_0_0_#000] z-[110]"
          >
            <X size={20} />
          </button>

          <motion.div initial={{ scale: 0.8, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 25 }} className="w-full max-w-md relative flex flex-col gap-6 items-center my-auto">
            
            {/* The actual exportable sticker */}
            <div 
              id="ngl-sticker"
              className="w-full shrink-0 flex items-center justify-center p-8 sm:p-12 bg-gradient-to-br from-[#ff0a54] via-[#ff477e] to-[#ff99ac] rounded-3xl overflow-hidden relative shadow-[8px_8px_0_0_#000] border-4 border-black"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent"></div>
              
              <div className="bg-white/95 backdrop-blur-md rounded-2xl w-full max-w-[340px] flex flex-col shadow-2xl border-2 border-black relative z-10 transform -rotate-1 h-auto min-h-[350px]">
                {/* Header */}
                <div className="bg-[#EFEFEF] p-5 text-center border-b-2 border-black relative rounded-t-2xl">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] font-black uppercase px-4 py-1.5 rounded-full border-2 border-black whitespace-nowrap z-20 shadow-[2px_2px_0_0_#fff]">
                    FROM: {selectedNglNote.nickname}
                  </div>
                  <h4 className="font-black text-base uppercase mt-2 text-black">
                    {selectedNglNote.to ? \`TO: \${selectedNglNote.to}\` : "SECRET CONFESSION"}
                  </h4>
                </div>
                
                {/* Content */}
                <div className="p-6 sm:p-8 flex-1 flex flex-col items-center justify-center min-h-[200px]">
                  <p className="text-center font-bold text-lg sm:text-xl text-black leading-snug break-words whitespace-pre-wrap w-full">
                    {selectedNglNote.content}
                  </p>
                </div>
                
                {/* Footer */}
                <div className="p-3 bg-white border-t-2 border-black flex justify-between items-center text-[10px] font-bold uppercase text-gray-500">
                  <span>Class 12-B</span>
                  <span>{new Date(selectedNglNote.createdAt).toLocaleDateString([], {day:'numeric', month:'short'})}</span>
                </div>
                
                {/* Send message fake bar */}
                <div className="bg-black text-white p-4 flex justify-between items-center cursor-default rounded-b-2xl">
                  <span className="font-bold text-xs">Send a message...</span>
                  <div className="bg-white/20 p-1.5 rounded-full"><Send size={12} className="text-white" /></div>
                </div>
              </div>
            </div>

            <button 
              onClick={(e) => {
                e.stopPropagation();
                const node = document.getElementById('ngl-sticker');
                if (node) {
                  const originalTransform = node.style.transform;
                  node.style.transform = 'none'; // reset transform for better capture if needed
                  html2canvas(node, { scale: 3, backgroundColor: null, useCORS: true, allowTaint: true }).then(canvas => {
                    node.style.transform = originalTransform;
                    const link = document.createElement('a');
                    link.download = \`confession-\${selectedNglNote.id}.png\`;
                    link.href = canvas.toDataURL('image/png');
                    link.click();
                    toast.success("Image downloaded!");
                  }).catch(err => {
                    node.style.transform = originalTransform;
                    toast.error("Failed to download image");
                    console.error(err);
                  });
                }
              }}
              className="bg-neo-cyan text-black font-black text-base sm:text-lg uppercase px-8 py-4 border-4 border-black flex items-center justify-center gap-3 hover:bg-neo-yellow hover:-translate-y-1 transition-all shadow-[6px_6px_0_0_#000] w-full max-w-sm"
            >
              <Download size={24} /> Download Story
            </button>

          </motion.div>
        </div>
      , document.body)}`;

  code = code.substring(0, startIndex) + newModal + code.substring(endIndex);
  fs.writeFileSync('src/components/ConfessionBoard.tsx', code);
}
