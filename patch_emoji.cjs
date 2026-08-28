const fs = require('fs');
let code = fs.readFileSync('src/components/MemoryWall.tsx', 'utf8');

const emojis = `
              <div className="flex flex-wrap items-center gap-2 mt-2 px-1">
                {['❤️', '😂', '🔥', '👏', '😢'].map(emoji => (
                  <button 
                    key={emoji} 
                    onClick={(e) => handleReaction(e, img, emoji)}
                    className="text-xs sm:text-sm bg-gray-100 hover:bg-gray-200 border border-black rounded-full px-2 py-0.5 shadow-[1px_1px_0_0_#000] active:translate-y-px active:shadow-none transition-all flex items-center gap-1"
                  >
                    <span>{emoji}</span>
                    <span className="font-bold text-[10px]">{img.reactions?.[emoji] || 0}</span>
                  </button>
                ))}
              </div>
`;

code = code.replace(
  '              {img.caption && (',
  emojis + '              {img.caption && ('
);

fs.writeFileSync('src/components/MemoryWall.tsx', code);
