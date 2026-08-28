# ConfessionBoard
sed -i 's/<section id="board" className="p-4 sm:p-8 max-w-7xl mx-auto border-t-4 border-black graph-paper-pink relative">/<section id="board" className="w-full border-t-4 border-black graph-paper-pink relative z-10">\n    <div className="p-4 sm:p-8 max-w-7xl mx-auto">/g' src/components/ConfessionBoard.tsx
sed -i 's/    <\/section>/    <\/div>\n    <\/section>/g' src/components/ConfessionBoard.tsx

# MemoryWall
sed -i 's/<section id="gallery" className="p-4 sm:p-8 max-w-7xl mx-auto border-t-4 border-black border-dashed relative z-10">/<section id="gallery" className="w-full border-t-4 border-black border-dashed bg-[#2962FF]\/10 relative z-10">\n    <div className="p-4 sm:p-8 max-w-7xl mx-auto">/g' src/components/MemoryWall.tsx
sed -i 's/    <\/section>/    <\/div>\n    <\/section>/g' src/components/MemoryWall.tsx

# Timetable
sed -i 's/<section id="timetable" className="p-4 sm:p-8 max-w-7xl mx-auto border-t-4 border-black relative z-10">/<section id="timetable" className="w-full border-t-4 border-black bg-[#AEEA00]\/20 relative z-10">\n    <div className="p-4 sm:p-8 max-w-7xl mx-auto">/g' src/components/Timetable.tsx
sed -i 's/    <\/section>/    <\/div>\n    <\/section>/g' src/components/Timetable.tsx

# Polls
sed -i 's/<section id="polls" className="p-4 sm:p-8 max-w-7xl mx-auto border-t-4 border-black relative z-10">/<section id="polls" className="w-full border-t-4 border-black bg-[#FF9E00]\/20 relative z-10">\n    <div className="p-4 sm:p-8 max-w-7xl mx-auto">/g' src/components/Polls.tsx
sed -i 's/    <\/section>/    <\/div>\n    <\/section>/g' src/components/Polls.tsx

# TimeCapsule
sed -i 's/<section id="capsule" className="p-4 sm:p-8 max-w-7xl mx-auto relative z-10 my-12">/<section id="capsule" className="w-full bg-[#B800FF]\/10 relative z-10 py-12 border-t-4 border-black">\n    <div className="p-4 sm:p-8 max-w-7xl mx-auto">/g' src/components/TimeCapsule.tsx
sed -i 's/    <\/section>/    <\/div>\n    <\/section>/g' src/components/TimeCapsule.tsx

