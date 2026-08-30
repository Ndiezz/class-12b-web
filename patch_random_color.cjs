const fs = require('fs');
let code = fs.readFileSync('src/components/ConfessionBoard.tsx', 'utf8');

const oldInit = `  const [newMessage, setNewMessage] = useState({ 
    nickname: "", 
    content: "", 
    color: COLORS[0] 
  });`;

const newInit = `  const [newMessage, setNewMessage] = useState({ 
    nickname: "", 
    content: "", 
    color: COLORS[Math.floor(Math.random() * COLORS.length)] 
  });`;

code = code.replace(oldInit, newInit);

code = code.replace(
  'setNewMessage({ nickname: "", content: "", color: COLORS[0] });',
  'setNewMessage({ nickname: "", content: "", color: COLORS[Math.floor(Math.random() * COLORS.length)] });'
);

fs.writeFileSync('src/components/ConfessionBoard.tsx', code);
