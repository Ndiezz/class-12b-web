const fs = require('fs');
let code = fs.readFileSync('src/components/ConfessionBoard.tsx', 'utf8');

const oldMap = `      <div className="columns-3 sm:columns-3 md:columns-4 lg:columns-6 gap-2 sm:gap-4">
        {messages.map((msg) => {
          const date = new Date(msg.createdAt);
          const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const dateString = date.toLocaleDateString([], { day: '2-digit', month: 'short' }).toUpperCase();
          const bgClass = COLOR_CLASSES[msg.color] || "bg-neo-yellow";
          
          return (
            <div 
              key={msg.id} 
              className={\`p-2 sm:p-3 mb-2 sm:mb-4 relative group border sm:border-2 border-black shadow-[2px_2px_0_0_#000] flex flex-col break-inside-avoid \${bgClass}\`}
            >
              {isAdmin && (
                <div className="absolute top-1 right-1 sm:top-2 sm:right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <button onClick={() => {
                    setEditingMessage({ id: msg.id!, content: msg.content, editReason: msg.editReason || "" });
                    setShowEditModal(true);
                  }} className="text-black hover:text-blue-500 bg-white border border-black rounded-full p-0.5 sm:p-1 shadow-[1px_1px_0_0_#000]">
                    <Pencil size={11} className="sm:w-3.5 sm:h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(msg.id!)} className="text-black hover:text-red-500 bg-white border border-black rounded-full p-0.5 sm:p-1 shadow-[1px_1px_0_0_#000]">
                    <Trash2 size={11} className="sm:w-3.5 sm:h-3.5" />
                  </button>
                </div>
              )}
              
              {msg.to && (
                <div className="font-bold text-[7px] sm:text-[10px] uppercase tracking-wide border-b border-black/20 pb-0.5 mb-1 sm:mb-2 truncate">
                  To: {msg.to}
                </div>
              )}
              
              <p className="font-medium text-[9px] sm:text-xs mb-1.5 sm:mb-2 leading-tight sm:leading-relaxed whitespace-pre-wrap break-words">
                {msg.content}
              </p>
              
              {msg.isEdited && (
                <div className="mb-1 sm:mb-2 inline-block bg-black text-white text-[6px] sm:text-[8px] font-bold uppercase px-1 py-0.2 shadow-[1px_1px_0_0_rgba(0,0,0,0.5)] self-start max-w-full truncate">
                  EDITED: {msg.editReason}
                </div>
              )}
              
              {msg.song && (
                <div className="flex items-center gap-1 bg-white/50 border border-black p-1 mb-1.5 sm:mb-2">
                  <img src={msg.song.coverUrl} alt="Album Art" className="w-4 h-4 sm:w-6 sm:h-6 border border-black shrink-0" />
                  <div className="overflow-hidden min-w-0">
                    <p className="font-bold text-[7px] sm:text-[9px] truncate uppercase leading-none">{msg.song.title}</p>
                    <p className="text-[6px] sm:text-[8px] truncate font-body leading-none text-gray-700">{msg.song.artist}</p>
                  </div>
                </div>
              )}
              
              <div className="font-bold uppercase text-[7px] sm:text-[9px] flex justify-between items-end mt-auto pt-1 sm:pt-1.5 border-t border-black/20">
                <span className="truncate mr-1 max-w-[55%]">— {msg.nickname}</span>
                <span className="text-[6px] sm:text-[8px] opacity-75 text-right font-body tracking-tight shrink-0">{timeString}<br/>{dateString}</span>
              </div>
            </div>
          );
        })}
      </div>`;

const newMap = `      <div className="columns-3 sm:columns-3 md:columns-4 lg:columns-6 gap-2 sm:gap-4">
        {messages.map((msg) => {
          const date = new Date(msg.createdAt);
          const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const dateString = date.toLocaleDateString([], { day: '2-digit', month: 'short' }).toUpperCase();
          const bgClass = COLOR_CLASSES[msg.color] || "bg-neo-yellow";
          const isRevealed = revealedNotes.has(msg.id!);
          
          return (
            <div 
              key={msg.id} 
              onClick={() => handleReveal(msg)}
              className={\`p-2 sm:p-3 mb-2 sm:mb-4 relative group border sm:border-2 border-black shadow-[2px_2px_0_0_#000] flex flex-col break-inside-avoid cursor-pointer hover:-translate-y-1 hover:shadow-[3px_3px_0_0_#000] transition-all \${bgClass}\`}
            >
              {isAdmin && (
                <div className="absolute top-1 right-1 sm:top-2 sm:right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <button onClick={(e) => {
                    e.stopPropagation();
                    setEditingMessage({ id: msg.id!, content: msg.content, editReason: msg.editReason || "" });
                    setShowEditModal(true);
                  }} className="text-black hover:text-blue-500 bg-white border border-black rounded-full p-0.5 sm:p-1 shadow-[1px_1px_0_0_#000]">
                    <Pencil size={11} className="sm:w-3.5 sm:h-3.5" />
                  </button>
                  <button onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(msg.id!);
                  }} className="text-black hover:text-red-500 bg-white border border-black rounded-full p-0.5 sm:p-1 shadow-[1px_1px_0_0_#000]">
                    <Trash2 size={11} className="sm:w-3.5 sm:h-3.5" />
                  </button>
                </div>
              )}
              
              {!isRevealed ? (
                <div className="flex-1 flex flex-col items-center justify-center py-4 sm:py-6 gap-1 sm:gap-2 opacity-80 pointer-events-none">
                  <Eye size={16} className="sm:w-5 sm:h-5" />
                  <span className="font-bold text-[7px] sm:text-[9px] uppercase text-center leading-tight">Secret Note<br/>Tap to open</span>
                </div>
              ) : (
                <>
                  {msg.to && (
                    <div className="font-bold text-[7px] sm:text-[10px] uppercase tracking-wide border-b border-black/20 pb-0.5 mb-1 sm:mb-2 truncate">
                      To: {msg.to}
                    </div>
                  )}
                  
                  <p className="font-medium text-[9px] sm:text-xs mb-1.5 sm:mb-2 leading-tight sm:leading-relaxed whitespace-pre-wrap break-words">
                    {msg.content}
                  </p>
                  
                  {msg.isEdited && (
                    <div className="mb-1 sm:mb-2 inline-block bg-black text-white text-[6px] sm:text-[8px] font-bold uppercase px-1 py-0.2 shadow-[1px_1px_0_0_rgba(0,0,0,0.5)] self-start max-w-full truncate">
                      EDITED: {msg.editReason}
                    </div>
                  )}
                  
                  {msg.song && (
                    <div className="flex items-center gap-1 bg-white/50 border border-black p-1 mb-1.5 sm:mb-2">
                      <img src={msg.song.coverUrl} alt="Album Art" className="w-4 h-4 sm:w-6 sm:h-6 border border-black shrink-0" />
                      <div className="overflow-hidden min-w-0">
                        <p className="font-bold text-[7px] sm:text-[9px] truncate uppercase leading-none">{msg.song.title}</p>
                        <p className="text-[6px] sm:text-[8px] truncate font-body leading-none text-gray-700">{msg.song.artist}</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="font-bold uppercase text-[7px] sm:text-[9px] flex justify-between items-end mt-auto pt-1 sm:pt-1.5 border-t border-black/20">
                    <span className="truncate mr-1 max-w-[55%]">— {msg.nickname}</span>
                    <span className="text-[6px] sm:text-[8px] opacity-75 text-right font-body tracking-tight shrink-0">{timeString}<br/>{dateString}</span>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>`;

// Insert the NGL Modal right after the map div closing
const nglModal = `
      {/* NGL Style IG Story Modal */}
      {selectedNglNote && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 bg-black/80 z-[100] flex flex-col items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedNglNote(null)}>
          <div className="w-full max-w-sm relative flex flex-col gap-4 items-center">
            <div className="flex gap-2 mb-2">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  const node = document.getElementById('ngl-sticker');
                  if (node) {
                    html2canvas(node, { scale: 3, backgroundColor: null }).then(canvas => {
                      const link = document.createElement('a');
                      link.download = \`confession-\${selectedNglNote.id}.png\`;
                      link.href = canvas.toDataURL('image/png');
                      link.click();
                      toast.success("Image downloaded!");
                    });
                  }
                }}
                className="bg-white text-black font-bold text-xs uppercase px-4 py-2 border-2 border-black flex items-center gap-2 hover:bg-neo-cyan hover:-translate-y-1 transition-all shadow-[2px_2px_0_0_#000]"
              >
                <Download size={14} /> Download Story
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedNglNote(null);
                }}
                className="bg-white text-black font-bold p-2 border-2 border-black hover:bg-neo-pink hover:-translate-y-1 transition-all shadow-[2px_2px_0_0_#000]"
              >
                <X size={14} />
              </button>
            </div>
            
            {/* The actual exportable sticker */}
            <div 
              id="ngl-sticker"
              className="w-full aspect-[9/16] sm:aspect-auto sm:min-h-[500px] flex items-center justify-center p-6 bg-gradient-to-br from-[#ff0a54] via-[#ff477e] to-[#ff99ac] rounded-3xl overflow-hidden relative shadow-[8px_8px_0_0_#000] border-4 border-black"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent"></div>
              
              <div className="bg-white/95 backdrop-blur-md rounded-2xl w-full max-w-[300px] flex flex-col overflow-hidden shadow-2xl border-2 border-black relative z-10 transform -rotate-1">
                {/* Header */}
                <div className="bg-[#EFEFEF] p-4 text-center border-b-2 border-black relative">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] font-black uppercase px-3 py-1 rounded-full border-2 border-black whitespace-nowrap z-20 shadow-[2px_2px_0_0_#fff]">
                    ANONYMOUS
                  </div>
                  <h4 className="font-black text-sm uppercase mt-1 text-black">
                    {selectedNglNote.to ? \`To: \${selectedNglNote.to}\` : "Send me anonymous messages!"}
                  </h4>
                </div>
                
                {/* Content */}
                <div className="p-6 flex-1 flex flex-col items-center justify-center min-h-[150px]">
                  <p className="text-center font-bold text-lg sm:text-xl text-black leading-snug break-words whitespace-pre-wrap w-full">
                    {selectedNglNote.content}
                  </p>
                </div>
                
                {selectedNglNote.song && (
                  <div className="mx-4 mb-4 p-2 bg-gray-100 rounded-lg flex items-center gap-3 border-2 border-black border-dashed">
                     <img src={selectedNglNote.song.coverUrl} alt="Cover" className="w-10 h-10 border border-black rounded" />
                     <div className="overflow-hidden min-w-0">
                       <p className="font-black text-[10px] text-neo-pink uppercase tracking-widest leading-none mb-1">Attached Song</p>
                       <p className="font-bold text-xs truncate uppercase leading-none">{selectedNglNote.song.title}</p>
                     </div>
                  </div>
                )}
                
                {/* Footer */}
                <div className="p-3 bg-white border-t-2 border-black flex justify-between items-center text-[10px] font-bold uppercase text-gray-500">
                  <span>Class 12-B</span>
                  <span>{new Date(selectedNglNote.createdAt).toLocaleDateString([], {day:'numeric', month:'short'})}</span>
                </div>
                
                {/* Send message fake bar */}
                <div className="bg-black text-white p-4 flex justify-between items-center cursor-default">
                  <span className="font-bold text-xs">Send a message...</span>
                  <div className="bg-white/20 p-1.5 rounded-full"><Send size={12} className="text-white" /></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      , document.body)}
`;

code = code.replace(oldMap, newMap + '\n' + nglModal);

fs.writeFileSync('src/components/ConfessionBoard.tsx', code);
