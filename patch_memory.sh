sed -i 's/{selectedImg && (/{selectedImg \&\& typeof document !== "undefined" \&\& createPortal(/g' src/components/MemoryWall.tsx
sed -i 's/        <\/div>\n      )}/        <\/div>,\n        document.body\n      )}/g' src/components/MemoryWall.tsx
