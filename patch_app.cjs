const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// I already have FadeIn imported in App.tsx. If I don't, I'll need to make sure. Let me check if it's there.
// Yes, 'import { FadeIn } from "./components/ui/FadeIn";' was left untouched earlier because I only removed the wrappers.

code = code.replace('<Countdown />', '<FadeIn><Countdown /></FadeIn>');
code = code.replace('<Roster />', '<FadeIn><Roster /></FadeIn>');
code = code.replace('<ConfessionBoard />', '<FadeIn><ConfessionBoard /></FadeIn>');
code = code.replace('<MemoryWall />', '<FadeIn><MemoryWall /></FadeIn>');
code = code.replace('<Timetable />', '<FadeIn><Timetable /></FadeIn>');
code = code.replace('<Polls />', '<FadeIn><Polls /></FadeIn>');
code = code.replace('<TimeCapsule />', '<FadeIn><TimeCapsule /></FadeIn>');

fs.writeFileSync('src/App.tsx', code);
