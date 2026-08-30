const fs = require('fs');
let code = fs.readFileSync('src/index.css', 'utf8');

const darkTheme = `
@layer base {
  .dark {
    --color-neo-bg: #111;
    --color-white: #111;
    --color-black: #FDFBF7;
  }
  .dark body {
    color: var(--color-black);
  }
  .dark .bg-white {
    background-color: var(--color-white) !important;
  }
  .dark .text-black {
    color: var(--color-black) !important;
  }
  .dark .border-black {
    border-color: var(--color-black) !important;
  }
  .dark .shadow-\\[3px_3px_0_0_\\#000\\] {
    box-shadow: 3px 3px 0 0 var(--color-black) !important;
  }
  .dark .shadow-\\[4px_4px_0_0_\\#000\\] {
    box-shadow: 4px 4px 0 0 var(--color-black) !important;
  }
  .dark .shadow-\\[6px_6px_0_0_\\#000\\] {
    box-shadow: 6px 6px 0 0 var(--color-black) !important;
  }
  .dark .shadow-\\[8px_8px_0_0_\\#000\\] {
    box-shadow: 8px 8px 0 0 var(--color-black) !important;
  }
  .dark .bg-black {
    background-color: var(--color-black) !important;
  }
  .dark .text-white {
    color: var(--color-white) !important;
  }
  .dark .border-white {
    border-color: var(--color-white) !important;
  }
}
`;

code = code + darkTheme;

fs.writeFileSync('src/index.css', code);
