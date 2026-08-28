const fs = require('fs');

function updateColors(filePath) {
  let code = fs.readFileSync(filePath, 'utf8');
  code = code.replace(
    'color?: "white" | "yellow" | "pink" | "cyan" | "green"',
    'color?: "white" | "yellow" | "pink" | "cyan" | "green" | "blue" | "purple" | "red" | "orange" | "lime" | string'
  );
  code = code.replace(
    '  green: "bg-neo-green",\n}',
    '  green: "bg-neo-green",\n  blue: "bg-neo-blue",\n  purple: "bg-neo-purple",\n  red: "bg-neo-red",\n  orange: "bg-neo-orange",\n  lime: "bg-neo-lime",\n}'
  );
  fs.writeFileSync(filePath, code);
}

updateColors('src/components/ui/NeoCard.tsx');
updateColors('src/components/ui/NeoButton.tsx');
