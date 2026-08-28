# Add useEffect for scroll lock
sed -i '/const \[commentNickname/a\  useEffect(() => {\n    if (selectedImg) document.body.style.overflow = "hidden";\n    else document.body.style.overflow = "";\n    return () => { document.body.style.overflow = ""; };\n  }, [selectedImg]);' src/components/MemoryWall.tsx

# Update handleReaction
sed -i '/const handleLike/i\  const handleReaction = async (e: React.MouseEvent, img: GalleryImage, emoji: string) => {\n    e.stopPropagation();\n    if (!img.id) return;\n    try {\n      const currentReactions = img.reactions || {};\n      await updateDoc(doc(db, "gallery", img.id), {\n        [`reactions.${emoji}`]: (currentReactions[emoji] || 0) + 1\n      });\n    } catch (err) {\n      console.error("Error reacting:", err);\n    }\n  };\n' src/components/MemoryWall.tsx

