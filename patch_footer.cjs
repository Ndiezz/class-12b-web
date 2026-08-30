const fs = require('fs');
let code = fs.readFileSync('src/components/Footer.tsx', 'utf8');

if (!code.includes('import { Moon, Sun }')) {
  code = code.replace(
    'import { NeoCard } from "./ui/NeoCard";',
    'import { NeoCard } from "./ui/NeoCard";\nimport { Moon, Sun } from "lucide-react";\nimport { useEffect, useState as useState2 } from "react";'
  );
}

// Inside the component:
const stateHook = `  const [sent, setSent] = useState(false);
  const [isDark, setIsDark] = useState2(false);

  useEffect(() => {
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
      setIsDark(true);
    }
  };`;

code = code.replace('  const [sent, setSent] = useState(false);', stateHook);

// Add the button near the "Website maintained by" area
const buttonCode = `
          <button 
            onClick={toggleTheme} 
            className="mt-4 flex items-center justify-center gap-2 mx-auto bg-black text-white px-4 py-2 font-bold text-xs sm:text-sm uppercase tracking-wide border-2 border-black hover:bg-white hover:text-black transition-colors"
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
            {isDark ? 'Light Mode' : 'Dark Mode'}
          </button>
          <div className="text-[10px] sm:text-xs`;

code = code.replace('<div className="text-[10px] sm:text-xs', buttonCode);

fs.writeFileSync('src/components/Footer.tsx', code);
