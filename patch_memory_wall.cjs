const fs = require('fs');
let code = fs.readFileSync('src/components/MemoryWall.tsx', 'utf8');

// 1. Add loading state
if (!code.includes('const [loading, setLoading] = useState(true);')) {
  code = code.replace(
    'const [selectedImg, setSelectedImg] = useState<GalleryImage | null>(null);',
    'const [selectedImg, setSelectedImg] = useState<GalleryImage | null>(null);\n  const [loading, setLoading] = useState(true);'
  );
}

// 2. Set loading to false when snapshot triggers
code = code.replace(
  'setImages(data.sort((a, b) => b.createdAt - a.createdAt));',
  'setImages(data.sort((a, b) => b.createdAt - a.createdAt));\n      setLoading(false);'
);

// 3. Add skeleton when loading
const skeletonHtml = `
      {loading && (
        <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 sm:gap-6 space-y-3 sm:space-y-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="break-inside-avoid border-2 sm:border-4 border-black bg-white p-1.5 sm:p-2 shadow-[3px_3px_0_0_var(--color-black)] sm:shadow-[6px_6px_0_0_var(--color-black)]">
              <div className="border-2 sm:border-4 border-black aspect-[3/4] bg-gray-200 animate-pulse"></div>
              <div className="mt-2 h-4 bg-gray-200 animate-pulse w-1/3"></div>
              <div className="mt-2 flex gap-1"><div className="h-4 bg-gray-200 animate-pulse w-8 rounded-full"></div></div>
            </div>
          ))}
        </div>
      )}
`;

code = code.replace(
  '{images.map((img) => {',
  skeletonHtml + '\n        {!loading && images.map((img) => {'
);
code = code.replace(
  '{images.length === 0 && (',
  '{!loading && images.length === 0 && ('
);

fs.writeFileSync('src/components/MemoryWall.tsx', code);
