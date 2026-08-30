const fs = require('fs');

const files = [
  'src/components/TimeCapsule.tsx',
  'src/components/ConfessionBoard.tsx',
  'src/components/MemoryWall.tsx',
  'src/components/Polls.tsx'
];

const toastOptions = ", { id: 'app-toast', duration: 3000 }";

for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');
  
  // Replace and translate
  code = code.replace(/toast\.success\("Pesan berhasil disegel!"\);/g, "toast.success(\"Pesan berhasil disegel!\"" + toastOptions + ");");
  code = code.replace(/toast\.error\("Gagal menyegel pesan"\);/g, "toast.error(\"Gagal menyegel pesan\"" + toastOptions + ");");
  
  code = code.replace(/toast\.success\("Note sent successfully!"\);/g, "toast.success(\"Pesan berhasil dikirim!\"" + toastOptions + ");");
  code = code.replace(/toast\.error\("Failed to send note!"\);/g, "toast.error(\"Gagal mengirim pesan!\"" + toastOptions + ");");
  
  code = code.replace(/toast\.error\("Maksimal 3 emoji per foto untuk satu perangkat!"\);/g, "toast.error(\"Maksimal 3 emoji per foto untuk satu perangkat!\"" + toastOptions + ");");
  
  code = code.replace(/toast\.success\("Poll created successfully!"\);/g, "toast.success(\"Poling berhasil dibuat!\"" + toastOptions + ");");
  code = code.replace(/toast\.error\("Failed to create poll"\);/g, "toast.error(\"Gagal membuat poling!\"" + toastOptions + ");");
  code = code.replace(/toast\.error\("You have already voted on this poll!"\);/g, "toast.error(\"Kamu sudah memilih pada poling ini!\"" + toastOptions + ");");
  code = code.replace(/toast\.success\("Vote cast successfully!"\);/g, "toast.success(\"Suara berhasil diberikan!\"" + toastOptions + ");");
  code = code.replace(/toast\.error\("Failed to cast vote"\);/g, "toast.error(\"Gagal memberikan suara!\"" + toastOptions + ");");

  // Fix Poll progress bar z-index issue
  if (file.includes('Polls.tsx')) {
    code = code.replace(
      'className="w-full text-left p-2 sm:p-3 bg-white border-2 border-black hover:translate-x-1 transition-transform relative overflow-hidden group"',
      'className="w-full text-left p-2 sm:p-3 bg-white border-2 border-black hover:translate-x-1 transition-transform relative overflow-hidden group z-0"'
    );
    code = code.replace(
      'className={`absolute top-0 left-0 h-full ${colorClass} progress-energy -z-10 border-r-2 sm:border-r-4 border-black`}',
      'className={`absolute top-0 left-0 h-full ${colorClass} progress-energy z-0 border-r-2 sm:border-r-4 border-black opacity-50`}'
    );
    code = code.replace(
      'className="flex justify-between items-center z-10 gap-2"',
      'className="flex justify-between items-center relative z-10 gap-2"'
    );
  }

  fs.writeFileSync(file, code);
}
