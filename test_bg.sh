sed -i 's/<section id="roster" className="p-4 sm:p-8 max-w-7xl mx-auto relative z-10">/<section id="roster" className="w-full relative z-10 bg-neo-yellow\/20">\n    <div className="p-4 sm:p-8 max-w-7xl mx-auto">/g' src/components/Roster.tsx

sed -i 's/    <\/section>/    <\/div>\n    <\/section>/g' src/components/Roster.tsx
