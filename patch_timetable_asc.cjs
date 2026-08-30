const fs = require('fs');

const code = `import React, { useEffect, useState } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import { useRole } from "@/src/hooks/useRole";

type Block = {
  id: string;
  span: number;
  subject: string;
  teacher: string;
  color: string;
};

type ScheduleData = {
  Senin: Block[];
  Selasa: Block[];
  Rabu: Block[];
  Kamis: Block[];
  Jumat: Block[];
};

const DEFAULT_SCHEDULE: ScheduleData = {
  Senin: [
    { id: 'mon-1', span: 1, subject: '', teacher: '', color: '#FFFFFF' },
    { id: 'mon-2', span: 2, subject: 'Pend.\\nPancasila', teacher: 'Annisa Nasution', color: '#FF7F7F' },
    { id: 'mon-3', span: 3, subject: 'B. Ing', teacher: 'Afidah Rahayu', color: '#FFB366' },
    { id: 'mon-4', span: 1, subject: 'BK', teacher: 'Rumi Murtini', color: '#33CCFF' },
    { id: 'mon-5', span: 3, subject: 'Biologi TL', teacher: 'Ely Rahmah', color: '#008080' }
  ],
  Selasa: [
    { id: 'tue-1', span: 3, subject: 'PJOK', teacher: 'Syafriansyah', color: '#FFFFFF' },
    { id: 'tue-2', span: 3, subject: 'Kimia TL', teacher: 'Darnimiyati', color: '#99FF99' },
    { id: 'tue-3', span: 2, subject: 'Prakarya', teacher: 'Titi Sugiharti', color: '#FFFFCC' },
    { id: 'tue-4', span: 2, subject: 'PABP', teacher: 'Yusral Inayah', color: '#00CC44' }
  ],
  Rabu: [
    { id: 'wed-1', span: 3, subject: 'Informatika TL', teacher: 'Ari Herdiansyah', color: '#A52A2A' },
    { id: 'wed-2', span: 1, subject: 'Sholat\\nDhuha', teacher: 'Yusral Inayah', color: '#00CC44' },
    { id: 'wed-3', span: 2, subject: 'Fisika TL', teacher: 'Harun Al Rasyid', color: '#BDB76B' },
    { id: 'wed-4', span: 2, subject: 'Seni Budaya', teacher: 'Siti Asiah', color: '#FFCC00' },
    { id: 'wed-5', span: 2, subject: 'Bhs Indonesia', teacher: 'Rr Nopi Putri Pertiwi', color: '#FFCC00' }
  ],
  Kamis: [
    { id: 'thu-1', span: 2, subject: 'Biologi TL', teacher: 'Ely Rahmah', color: '#008080' },
    { id: 'thu-2', span: 2, subject: 'Bhs Indonesia', teacher: 'Rr Nopi Putri Pertiwi', color: '#FFCC00' },
    { id: 'thu-3', span: 2, subject: 'Matematika', teacher: 'Andrei Hidayat', color: '#3366FF' },
    { id: 'thu-4', span: 2, subject: 'Informatika TL', teacher: 'Ari Herdiansyah', color: '#A52A2A' },
    { id: 'thu-5', span: 2, subject: 'Kimia TL', teacher: 'Darnimiyati', color: '#99FF99' }
  ],
  Jumat: [
    { id: 'fri-1', span: 2, subject: 'Sejarah', teacher: 'Sri Sumiyat', color: '#99FF99' },
    { id: 'fri-2', span: 2, subject: 'Matematika', teacher: 'Andrei Hidayat', color: '#3366FF' },
    { id: 'fri-3', span: 1, subject: 'Pend.\\nAl Qur\\'an', teacher: 'Siti Aminah', color: '#3366FF' },
    { id: 'fri-4', span: 3, subject: 'Fisika TL', teacher: 'Harun Al Rasyid', color: '#BDB76B' },
    { id: 'fri-5', span: 2, subject: '', teacher: '', color: '#FFFFFF' }
  ]
};

const TIME_SLOTS = [
  { p: "1", time: "7:30 - 8:10" },
  { p: "2", time: "8:10 - 8:50" },
  { p: "3", time: "8:50 - 9:30" },
  { p: "4", time: "9:45 - 10:25" },
  { p: "5", time: "10:25 - 11:05" },
  { p: "6", time: "11:05 - 11:45" },
  { p: "7", time: "13:00 - 13:35" },
  { p: "8", time: "13:35 - 14:10" },
  { p: "9", time: "14:10 - 14:45" },
  { p: "10", time: "14:45 - 15:20" }
];

const COLORS = [
  '#FF7F7F', '#FFB366', '#33CCFF', '#008080', '#99FF99', 
  '#00CC44', '#A52A2A', '#FFCC00', '#FFFFCC', '#3366FF', 
  '#BDB76B', '#FFFFFF'
];

export default function Timetable() {
  const [schedule, setSchedule] = useState<ScheduleData | null>(null);
  const [activeColorPicker, setActiveColorPicker] = useState<string | null>(null);
  const { isAdmin } = useRole();

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "timetable_asc"), (snapshot) => {
      if (snapshot.exists()) {
        setSchedule(snapshot.data() as ScheduleData);
      } else {
        setSchedule(DEFAULT_SCHEDULE);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const handleClickOutside = () => setActiveColorPicker(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const saveToFirebase = async (newData: ScheduleData) => {
    try {
      await setDoc(doc(db, "settings", "timetable_asc"), newData);
    } catch (err) {
      console.error("Failed to save timetable", err);
    }
  };

  const handleTextBlur = (dayKey: keyof ScheduleData, blockId: string, field: "subject" | "teacher", newText: string) => {
    if (!schedule) return;
    const updated = { ...schedule };
    const dayArray = [...updated[dayKey]];
    const blockIndex = dayArray.findIndex(b => b.id === blockId);
    
    if (blockIndex > -1 && dayArray[blockIndex][field] !== newText) {
      dayArray[blockIndex] = { ...dayArray[blockIndex], [field]: newText };
      updated[dayKey] = dayArray;
      setSchedule(updated);
      saveToFirebase(updated);
    }
  };

  const handleColorChange = (dayKey: keyof ScheduleData, blockId: string, newColor: string) => {
    if (!schedule) return;
    const updated = { ...schedule };
    const dayArray = [...updated[dayKey]];
    const blockIndex = dayArray.findIndex(b => b.id === blockId);
    
    if (blockIndex > -1) {
      dayArray[blockIndex] = { ...dayArray[blockIndex], color: newColor };
      updated[dayKey] = dayArray;
      setSchedule(updated);
      saveToFirebase(updated);
    }
  };

  if (!schedule) return <div className="p-12 text-center font-bold">Memuat Jadwal...</div>;

  return (
    <section id="timetable" className="w-full bg-[#fdfbf7] py-10 px-2 sm:px-4 border-t-4 border-black border-dashed">
      <style dangerouslySetInnerHTML={{__html: \`
        .asc-container {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          background: white;
          padding: clamp(10px, 2vw, 20px);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .asc-header {
          text-align: center;
          margin-bottom: clamp(10px, 2vw, 20px);
          font-family: Arial, sans-serif;
          color: black;
        }
        .asc-header h2 {
          font-size: clamp(1rem, 2.5vw, 1.5rem);
          font-weight: normal;
          margin: 0;
        }
        .asc-header h1 {
          font-size: clamp(1.5rem, 4vw, 2.5rem);
          font-weight: bold;
          margin: 0;
        }
        .asc-header h3 {
          font-size: clamp(0.9rem, 2vw, 1.2rem);
          font-weight: normal;
          margin: 0;
        }
        .asc-table-wrapper {
          width: 100%;
        }
        .asc-table {
          table-layout: fixed;
          width: 100%;
          border-collapse: collapse;
          font-family: Arial, sans-serif;
          color: black;
        }
        .asc-table th, .asc-table td {
          border: 1px solid black;
          box-sizing: border-box;
          background-clip: padding-box;
          text-align: center;
          padding: 0;
        }
        .asc-th-time {
          padding: 2px 0;
        }
        .asc-th-time .num {
          font-size: clamp(0.9rem, 2.5vw, 1.5rem);
          display: block;
        }
        .asc-th-time .time {
          font-size: clamp(0.4rem, 1vw, 0.6rem);
          display: block;
        }
        .asc-td-day {
          font-size: clamp(1rem, 3vw, 2rem);
          width: 6%; /* Adjust based on preference */
        }
        .asc-td-cell {
          position: relative;
          height: clamp(50px, 12vw, 90px);
          vertical-align: middle;
        }
        .asc-subject {
          font-size: clamp(0.6rem, 1.8vw, 1.4rem);
          line-height: 1.2;
          width: 100%;
          display: inline-block;
          white-space: pre-wrap;
          outline: none;
        }
        .asc-teacher {
          position: absolute;
          right: 2px;
          bottom: 2px;
          font-size: clamp(0.35rem, 1vw, 0.75rem);
          outline: none;
          text-align: right;
          max-width: 90%;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        /* Make sure white text is visible if color is dark */
        .color-dark { color: white; }
        .color-light { color: black; }
      \`}} />

      <div className="asc-container border-2 border-black">
        <div className="asc-header">
          <h2>Jadwal Pelajaran Semester 1 TP 2026-2027</h2>
          <h1>XII B</h1>
          <h3>SMAN 1 Kusan Hilir</h3>
        </div>

        <div className="asc-table-wrapper">
          <table className="asc-table">
            <thead>
              <tr>
                <th className="asc-td-day border-black"></th>
                {TIME_SLOTS.map(slot => (
                  <th key={slot.p} className="asc-th-time border-black">
                    <span className="num">{slot.p}</span>
                    <span className="time">{slot.time}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(schedule).map(([day, blocks]) => (
                <tr key={day}>
                  <td className="asc-td-day border-black">
                    {day === 'Senin' ? 'Se' : day === 'Selasa' ? 'Sel' : day === 'Rabu' ? 'Ra' : day === 'Kamis' ? 'Ka' : 'Ju'}
                  </td>
                  {blocks.map((block) => {
                    // Determine text color based on background (simple heuristic)
                    const isDark = ['#008080', '#00CC44', '#A52A2A', '#3366FF'].includes(block.color);
                    
                    return (
                      <td 
                        key={block.id}
                        colSpan={block.span}
                        className="asc-td-cell border-black cursor-pointer"
                        style={{ backgroundColor: block.color, color: isDark ? 'white' : 'black' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isAdmin) setActiveColorPicker(block.id);
                        }}
                      >
                        {activeColorPicker === block.id && isAdmin && (
                          <div 
                            className="absolute top-0 left-0 w-full h-full min-w-[150px] min-h-[60px] bg-white border-2 border-black shadow-lg p-1 z-50 flex flex-wrap gap-1 justify-center items-center rounded"
                            onClick={e => e.stopPropagation()}
                            style={{ transform: 'translateY(-100%)' }}
                          >
                            {COLORS.map(c => (
                              <button 
                                key={c}
                                className="w-5 h-5 sm:w-6 sm:h-6 border border-gray-400 hover:scale-110"
                                style={{ backgroundColor: c }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleColorChange(day as keyof ScheduleData, block.id, c);
                                  setActiveColorPicker(null);
                                }}
                              />
                            ))}
                          </div>
                        )}
                        <div 
                          className="asc-subject"
                          contentEditable={isAdmin}
                          suppressContentEditableWarning
                          onBlur={(e) => handleTextBlur(day as keyof ScheduleData, block.id, 'subject', e.currentTarget.innerText)}
                          onClick={e => isAdmin && e.stopPropagation()}
                        >
                          {block.subject}
                        </div>
                        <div 
                          className="asc-teacher"
                          contentEditable={isAdmin}
                          suppressContentEditableWarning
                          onBlur={(e) => handleTextBlur(day as keyof ScheduleData, block.id, 'teacher', e.currentTarget.innerText)}
                          onClick={e => isAdmin && e.stopPropagation()}
                        >
                          {block.teacher}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
`

fs.writeFileSync('src/components/Timetable.tsx', code);
