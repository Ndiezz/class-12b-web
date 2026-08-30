const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Remove FadeIn wrapping
code = code.replace(/<FadeIn><Countdown \/><\/FadeIn>/, '<Countdown />');
code = code.replace(/<FadeIn><Roster \/><\/FadeIn>/, '<Roster />');
code = code.replace(/<FadeIn><ConfessionBoard \/><\/FadeIn>/, '<ConfessionBoard />');
code = code.replace(/<FadeIn><MemoryWall \/><\/FadeIn>/, '<MemoryWall />');
code = code.replace(/<FadeIn><Timetable \/><\/FadeIn>/, '<Timetable />');
code = code.replace(/<FadeIn><Polls \/><\/FadeIn>/, '<Polls />');
code = code.replace(/<FadeIn><TimeCapsule \/><\/FadeIn>/, '<TimeCapsule />');

fs.writeFileSync('src/App.tsx', code);
