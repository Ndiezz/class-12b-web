const fs = require('fs');
let code = fs.readFileSync('src/components/Roster.tsx', 'utf8');

// Update labels and placeholders
code = code.replace(
  '<label className="font-bold text-xs sm:text-sm">Instagram Handle/Link</label>',
  '<label className="font-bold text-xs sm:text-sm">Instagram Link</label>'
);
code = code.replace(
  'placeholder="@username" value={newStudent.instagram}',
  'placeholder="https://instagram.com/..." value={newStudent.instagram}'
);

code = code.replace(
  '<label className="font-bold text-xs sm:text-sm">TikTok Handle</label>',
  '<label className="font-bold text-xs sm:text-sm">TikTok Link</label>'
);
code = code.replace(
  'placeholder="@username" value={newStudent.tiktok}',
  'placeholder="https://tiktok.com/..." value={newStudent.tiktok}'
);

// Update link generation for polaroid card
code = code.replace(
  /\<a href=\{student\.instagram\.startsWith\('http'\) \? student\.instagram : `https:\/\/instagram\.com\/\$\{student\.instagram\.replace\('@', ''\)\}`\}/g,
  '<a href={student.instagram.startsWith("http") ? student.instagram : `https://${student.instagram}`}'
);

// Update link generation for modal IG
code = code.replace(
  /\<a href=\{selectedStudent\.instagram\.startsWith\('http'\) \? selectedStudent\.instagram : `https:\/\/instagram\.com\/\$\{selectedStudent\.instagram\.replace\('@', ''\)\}`\}/g,
  '<a href={selectedStudent.instagram.startsWith("http") ? selectedStudent.instagram : `https://${selectedStudent.instagram}`}'
);

// Update link generation for modal TikTok
code = code.replace(
  /\<a href=\{selectedStudent\.tiktok\.startsWith\('http'\) \? selectedStudent\.tiktok : `https:\/\/tiktok\.com\/\$\{selectedStudent\.tiktok\.startsWith\('@'\) \? '' : '@'\}\$\{selectedStudent\.tiktok\.replace\('@', ''\)\}`\}/g,
  '<a href={selectedStudent.tiktok.startsWith("http") ? selectedStudent.tiktok : `https://${selectedStudent.tiktok}`}'
);

fs.writeFileSync('src/components/Roster.tsx', code);
