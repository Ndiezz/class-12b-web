const fs = require('fs');
let code = fs.readFileSync('src/components/MemoryWall.tsx', 'utf8');

// The user wants 3 actions MAX for emojis.
// Current limit check:
// const spamKey = \`emoji_spam_\${img.id}\`;
// Let's make it global for emojis:
code = code.replace(
  'const spamKey = `emoji_spam_${img.id}`;',
  'const spamKey = `emoji_spam_global`;'
);
// Also update the toast message if needed
code = code.replace(
  'toast.error("Maksimal 3 emoji per foto untuk satu perangkat!"',
  'toast.error("Maksimal 3 emoji per perangkat!"'
);

// iOS Emoji UI:
const oldEmojiButton = `className="text-xs sm:text-sm bg-gray-100 hover:bg-gray-200 border border-black rounded-full px-2 py-0.5 shadow-[1px_1px_0_0_#000] active:translate-y-px active:shadow-none transition-all flex items-center gap-1"`;

const newEmojiButton = `className="text-[13px] bg-white/70 backdrop-blur-md border border-gray-300 rounded-full px-2.5 py-1 shadow-sm hover:bg-gray-100 active:bg-gray-200 transition-colors flex items-center gap-1" style={{ WebkitBackdropFilter: 'blur(10px)' }}`;

code = code.replace(oldEmojiButton, newEmojiButton);

// Also remove brutalist styles from the container of emojis to make it look floating?
// Wait, the iOS style is usually grey/blur pill. The text should be a bit lighter.
code = code.replace(
  '<span className="font-bold text-[10px]">{img.reactions?.[emoji] || 0}</span>',
  '<span className="font-medium text-[11px] text-gray-500">{img.reactions?.[emoji] || 0}</span>'
);

fs.writeFileSync('src/components/MemoryWall.tsx', code);
