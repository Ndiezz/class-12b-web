const fs = require('fs');
let code = fs.readFileSync('src/components/Footer.tsx', 'utf8');

code = code.replace('import { Moon, Sun } from "lucide-react";\nimport { useEffect, useState as useState2 } from "react";', '');
code = code.replace(/  const \[isDark\, setIsDark\] = useState2\(false\);[\s\S]*?const toggleTheme = \(\) => \{[\s\S]*?  \};/, '');
code = code.replace(/<button \s*onClick=\{toggleTheme\}[\s\S]*?<\/button>/, '');

fs.writeFileSync('src/components/Footer.tsx', code);
