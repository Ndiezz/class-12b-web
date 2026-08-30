const fs = require('fs');

let css = fs.readFileSync('src/index.css', 'utf8');
if (!css.includes('--color-neo-mahogany')) {
  css = css.replace(
    '--color-neo-red: #FF1744;',
    '--color-neo-red: #FF1744;\n  --color-neo-mahogany: #C04000;'
  );
  fs.writeFileSync('src/index.css', css);
}

let board = fs.readFileSync('src/components/ConfessionBoard.tsx', 'utf8');
if (!board.includes('"mahogany"')) {
  board = board.replace(
    'const COLORS: string[] = ["yellow", "cyan", "green", "pink", "orange", "purple", "blue", "lime", "red"];',
    'const COLORS: string[] = ["yellow", "cyan", "green", "pink", "orange", "purple", "blue", "lime", "red", "mahogany"];'
  );
  board = board.replace(
    'red: "bg-neo-red",',
    'red: "bg-neo-red",\n  mahogany: "bg-neo-mahogany",'
  );
  fs.writeFileSync('src/components/ConfessionBoard.tsx', board);
}

let roster = fs.readFileSync('src/components/Roster.tsx', 'utf8');
if (!roster.includes('"mahogany"')) {
  roster = roster.replace(
    'const COLORS = ["white", "yellow", "cyan", "green", "pink", "orange", "purple", "blue", "lime", "red"] as const;',
    'const COLORS = ["white", "yellow", "cyan", "green", "pink", "orange", "purple", "blue", "lime", "red", "mahogany"] as const;'
  );
  roster = roster.replace(
    'red: "bg-neo-red",',
    'red: "bg-neo-red",\n  mahogany: "bg-neo-mahogany",'
  );
  fs.writeFileSync('src/components/Roster.tsx', roster);
}
