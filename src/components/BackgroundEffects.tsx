import { motion } from "motion/react";
import { useEffect, useState } from "react";

export default function BackgroundEffects() {
  const [blobs, setBlobs] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);

  useEffect(() => {
    // Generate random blobs
    const newBlobs = Array.from({ length: 6 }).map((_, i) => ({
      id: `blob-${i}`,
      size: Math.random() * 200 + 150,
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: Math.random() * 20 + 20,
      delay: Math.random() * -20,
      color: ['#ff90e8', '#ffc900', '#23a094', '#90a8ed'][Math.floor(Math.random() * 4)]
    }));

    // Generate random floating notes
    const newNotes = Array.from({ length: 15 }).map((_, i) => ({
      id: `note-${i}`,
      size: Math.random() * 20 + 15,
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: Math.random() * 15 + 15,
      delay: Math.random() * -15,
      rotate: Math.random() * 360,
      color: ['#ff90e8', '#ffc900', '#23a094', '#90a8ed'][Math.floor(Math.random() * 4)]
    }));

    setBlobs(newBlobs);
    setNotes(newNotes);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Lava Lamp Blobs */}
      <div className="absolute inset-0" style={{ filter: 'blur(60px) opacity(0.4)' }}>
        {blobs.map(blob => (
          <motion.div
            key={blob.id}
            className="absolute rounded-full mix-blend-multiply"
            style={{
              width: blob.size,
              height: blob.size,
              backgroundColor: blob.color,
              left: `${blob.x}%`,
              top: `${blob.y}%`,
            }}
            animate={{
              x: [0, Math.random() * 200 - 100, 0],
              y: [0, Math.random() * 200 - 100, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: blob.duration,
              repeat: Infinity,
              ease: "easeInOut",
              delay: blob.delay,
            }}
          />
        ))}
      </div>

      {/* Floating Notes */}
      <div className="absolute inset-0 opacity-40">
        {notes.map(note => (
          <motion.div
            key={note.id}
            className="absolute border border-black shadow-[2px_2px_0_0_rgba(0,0,0,0.5)]"
            style={{
              width: note.size,
              height: note.size,
              backgroundColor: note.color,
              left: `${note.x}%`,
              top: `${note.y}%`,
            }}
            animate={{
              y: ['-10vh', '110vh'],
              x: [0, Math.random() * 100 - 50],
              rotate: [note.rotate, note.rotate + 360],
            }}
            transition={{
              duration: note.duration,
              repeat: Infinity,
              ease: "linear",
              delay: note.delay,
            }}
          />
        ))}
      </div>
    </div>
  );
}
