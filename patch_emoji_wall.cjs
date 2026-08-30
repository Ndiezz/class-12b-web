const fs = require('fs');
let code = fs.readFileSync('src/components/MemoryWall.tsx', 'utf8');

code = code.replace(
  'const spamKey = `emoji_spam_global`;',
  'const spamKey = `emoji_spam_${img.id}`;'
);

code = code.replace(
  'toast.error("Maksimal 3 emoji per perangkat!"',
  'toast.error("Maksimal 3 emoji untuk foto ini!"'
);

// We can just use string matching with indexOf or regex for the class
code = code.replace(
  /className="text-\[13px\] bg-white\/70 backdrop-blur-md[^>]+>/,
  'className="text-[14px] bg-[#E5E5EA] border border-[#D1D1D6] rounded-full px-3 py-1 shadow-sm hover:bg-[#D1D1D6] active:bg-[#C7C7CC] transition-colors flex items-center gap-1.5">'
);

code = code.replace(
  '<span className="font-medium text-[11px] text-gray-500">{img.reactions?.[emoji] || 0}</span>',
  '<span className="font-semibold text-[12px] text-[#8E8E93]">{img.reactions?.[emoji] || 0}</span>'
);

fs.writeFileSync('src/components/MemoryWall.tsx', code);
