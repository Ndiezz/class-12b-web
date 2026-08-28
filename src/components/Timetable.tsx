import { useEffect, useState } from "react";
import { collection, onSnapshot, addDoc, deleteDoc, doc } from "firebase/firestore";
import { useRole } from "@/src/hooks/useRole";
import { db } from "@/src/lib/firebase";
import { TimetableEntry } from "@/src/types";
import { NeoCard } from "./ui/NeoCard";
import { NeoButton } from "./ui/NeoButton";
import { Trash2, Calendar } from "lucide-react";

const DAYS = [
  { key: "monday", label: "Senin" },
  { key: "tuesday", label: "Selasa" },
  { key: "wednesday", label: "Rabu" },
  { key: "thursday", label: "Kamis" },
  { key: "friday", label: "Jumat" }
] as const;

const getCurrentDayKey = () => {
  const day = new Date().getDay();
  if (day >= 1 && day <= 5) {
    return ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][day] as "monday" | "tuesday" | "wednesday" | "thursday" | "friday";
  }
  return "monday";
};

const DEFAULT_TIMETABLE: TimetableEntry[] = [
  { id: "1", period: "1", time: "07:30 - 08:10", monday: "-", tuesday: "Sholat Dhuha", wednesday: "PJOK", thursday: "Matematika", friday: "Kimia TL" },
  { id: "2", period: "2", time: "08:10 - 08:50", monday: "Informatika TL", tuesday: "Kimia TL", wednesday: "PJOK", thursday: "Matematika", friday: "Kimia TL" },
  { id: "3", period: "3", time: "08:50 - 09:30", monday: "Informatika TL", tuesday: "Kimia TL", wednesday: "PJOK", thursday: "Pend. Al Qur'an", friday: "Kimia TL" },
  { id: "4", period: "4", time: "09:45 - 10:25", monday: "Fisika TL", tuesday: "BK", wednesday: "Biologi TL", thursday: "Prakarya", friday: "B. Ing" },
  { id: "5", period: "5", time: "10:25 - 11:05", monday: "Fisika TL", tuesday: "Biologi TL", wednesday: "Biologi TL", thursday: "Prakarya", friday: "B. Ing" },
  { id: "6", period: "6", time: "11:05 - 11:45", monday: "Fisika TL", tuesday: "Biologi TL", wednesday: "Biologi TL", thursday: "Pend. Pancasila", friday: "B. Ing" },
  { id: "7", period: "7", time: "13:00 - 13:35", monday: "Matematika", tuesday: "Sejarah", wednesday: "Fisika TL", thursday: "Pend. Pancasila", friday: "Seni Budaya" },
  { id: "8", period: "8", time: "13:35 - 14:10", monday: "Matematika", tuesday: "Sejarah", wednesday: "Fisika TL", thursday: "Informatika TL", friday: "Seni Budaya" },
  { id: "9", period: "9", time: "14:10 - 14:45", monday: "PABP", tuesday: "Bhs Indonesia", wednesday: "Bhs Indonesia", thursday: "Informatika TL", friday: "Seni Budaya" },
  { id: "10", period: "10", time: "14:45 - 15:20", monday: "PABP", tuesday: "Bhs Indonesia", wednesday: "Bhs Indonesia", thursday: "Informatika TL", friday: "-" }
];

export default function Timetable() {
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const { isAdmin } = useRole();
  const currentDay = getCurrentDayKey();
  const [activeDay, setActiveDay] = useState<"monday" | "tuesday" | "wednesday" | "thursday" | "friday">(currentDay);
  const [newEntry, setNewEntry] = useState({ period: "", time: "", monday: "", tuesday: "", wednesday: "", thursday: "", friday: "" });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "timetable"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TimetableEntry));
      setEntries(data.sort((a, b) => parseInt(a.period) - parseInt(b.period)));
    });
    return unsub;
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntry.period || !newEntry.time) return;
    try {
      await addDoc(collection(db, "timetable"), newEntry);
      setNewEntry({ period: "", time: "", monday: "", tuesday: "", wednesday: "", thursday: "", friday: "" });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "timetable", id));
    } catch (err) {
      console.error(err);
    }
  };

  const displayEntries = entries.length > 0 ? entries : DEFAULT_TIMETABLE;

  return (
    <section id="timetable" className="w-full border-t-4 border-black bg-[#AEEA00]/20 relative z-10">
    <div className="p-4 sm:p-8 max-w-7xl mx-auto">
      <div className="mb-6 sm:mb-8">
        <span className="bg-neo-cyan border-2 border-black px-2.5 sm:px-3 py-0.5 sm:py-1 font-bold text-[10px] sm:text-xs uppercase tracking-widest text-black shadow-[2px_2px_0_0_#000] sm:shadow-[3px_3px_0_0_#000]">CHAPTER 04</span>
        <h2 className="text-3xl sm:text-5xl md:text-7xl font-black uppercase mt-3 sm:mt-4 break-words">Jadwal Pelajaran</h2>
      </div>

      {isAdmin && (
        <NeoCard color="white" className="p-4 sm:p-6 mb-6 sm:mb-12">
          <h3 className="font-bold text-lg sm:text-xl mb-4 uppercase">Admin: Tambah Periode</h3>
          <form onSubmit={handleAdd} className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 items-end">
            <div className="flex flex-col">
              <label className="font-bold text-xs sm:text-sm">Periode (mis. P1)</label>
              <input type="text" className="input-brutal text-xs sm:text-sm" maxLength={5} value={newEntry.period} onChange={e => setNewEntry({...newEntry, period: e.target.value.toUpperCase()})} required />
            </div>
            <div className="flex flex-col">
              <label className="font-bold text-xs sm:text-sm">Waktu</label>
              <input type="text" className="input-brutal text-xs sm:text-sm" placeholder="07:00 - 08:30" value={newEntry.time} onChange={e => setNewEntry({...newEntry, time: e.target.value})} required />
            </div>
            <div className="flex flex-col">
              <label className="font-bold text-xs sm:text-sm">Senin</label>
              <input type="text" className="input-brutal text-xs sm:text-sm" value={newEntry.monday} onChange={e => setNewEntry({...newEntry, monday: e.target.value})} />
            </div>
            <div className="flex flex-col">
              <label className="font-bold text-xs sm:text-sm">Selasa</label>
              <input type="text" className="input-brutal text-xs sm:text-sm" value={newEntry.tuesday} onChange={e => setNewEntry({...newEntry, tuesday: e.target.value})} />
            </div>
            <div className="flex flex-col">
              <label className="font-bold text-xs sm:text-sm">Rabu</label>
              <input type="text" className="input-brutal text-xs sm:text-sm" value={newEntry.wednesday} onChange={e => setNewEntry({...newEntry, wednesday: e.target.value})} />
            </div>
            <div className="flex flex-col">
              <label className="font-bold text-xs sm:text-sm">Kamis</label>
              <input type="text" className="input-brutal text-xs sm:text-sm" value={newEntry.thursday} onChange={e => setNewEntry({...newEntry, thursday: e.target.value})} />
            </div>
            <div className="flex flex-col">
              <label className="font-bold text-xs sm:text-sm">Jumat</label>
              <input type="text" className="input-brutal text-xs sm:text-sm" value={newEntry.friday} onChange={e => setNewEntry({...newEntry, friday: e.target.value})} />
            </div>
            <NeoButton type="submit" color="yellow" className="h-[44px] text-xs sm:text-sm">Add</NeoButton>
          </form>
        </NeoCard>
      )}

      {/* Mobile View: Day Tabs and Vertical List (Zero Scroll Required) */}
      <div className="block md:hidden">
        {/* Day Selector Tabs */}
        <div className="flex gap-1 mb-3 overflow-x-auto pb-1">
          {DAYS.map(day => (
            <button
              key={day.key}
              onClick={() => setActiveDay(day.key)}
              className={`flex-1 py-1.5 px-2 border-2 border-black font-black text-xs uppercase tracking-wider text-center transition-all ${
                activeDay === day.key
                  ? "bg-neo-cyan shadow-[2px_2px_0_0_#000] -translate-y-0.5"
                  : "bg-white opacity-80"
              }`}
            >
              {day.label}
            </button>
          ))}
        </div>

        {/* Daily Schedule Cards */}
        <div className="space-y-2">
          {displayEntries.map((entry) => {
            const subject = entry[activeDay] || "-";
            return (
              <div 
                key={entry.id} 
                className="bg-white border-2 border-black p-2.5 flex items-center justify-between shadow-[2px_2px_0_0_#000]"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="bg-black text-white px-2 py-1 border border-black text-center shrink-0">
                    <div className="font-black text-xs">{entry.period}</div>
                    <div className="text-[9px] text-gray-300 whitespace-nowrap">{entry.time}</div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] text-gray-500 font-bold uppercase">Mata Pelajaran</div>
                    <div className="font-black text-xs truncate">{subject}</div>
                  </div>
                </div>
                {isAdmin && entries.length > 0 && (
                  <button 
                    onClick={() => handleDelete(entry.id!)} 
                    className="text-red-500 hover:text-red-700 p-1 border border-black rounded-full bg-gray-50 shrink-0 ml-2"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            );
          })}
          {displayEntries.length === 0 && (
            <div className="p-6 bg-white border-2 border-black text-center font-bold text-xs">
              No timetable entries yet.
            </div>
          )}
        </div>
      </div>

      {/* Desktop / Tablet View: Full Table */}
      <div className="hidden md:block border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white overflow-hidden max-w-5xl mx-auto">
        <table className="w-full text-left font-bold border-collapse">
          <thead>
            <tr className="border-b-4 border-black bg-white">
              <th className="p-2 lg:p-3 border-r-4 border-black w-24 uppercase text-[10px] lg:text-xs">Periode</th>
              <th className={`p-2 lg:p-3 border-r-4 border-black uppercase text-[10px] lg:text-xs ${currentDay === 'monday' ? 'bg-neo-cyan' : ''}`}>Senin</th>
              <th className={`p-2 lg:p-3 border-r-4 border-black uppercase text-[10px] lg:text-xs ${currentDay === 'tuesday' ? 'bg-neo-cyan' : ''}`}>Selasa</th>
              <th className={`p-2 lg:p-3 border-r-4 border-black uppercase text-[10px] lg:text-xs ${currentDay === 'wednesday' ? 'bg-neo-cyan' : ''}`}>Rabu</th>
              <th className={`p-2 lg:p-3 border-r-4 border-black uppercase text-[10px] lg:text-xs ${currentDay === 'thursday' ? 'bg-neo-cyan' : ''}`}>Kamis</th>
              <th className={`p-2 lg:p-3 uppercase text-[10px] lg:text-xs ${currentDay === 'friday' ? 'bg-neo-cyan' : ''}`}>Jumat</th>
            </tr>
          </thead>
          <tbody>
            {displayEntries.map((entry) => (
              <tr key={entry.id} className="border-b-2 lg:border-b-4 border-black last:border-b-0 bg-white hover:bg-gray-50 relative group">
                <td className="p-2 lg:p-3 border-r-4 border-black bg-black text-white relative">
                  <div className="font-black text-xs lg:text-sm">{entry.period}</div>
                  <div className="text-[9px] lg:text-[10px] text-gray-400 font-medium whitespace-nowrap">{entry.time}</div>
                  {isAdmin && entries.length > 0 && (
                    <button onClick={() => handleDelete(entry.id!)} className="absolute top-1 right-1 text-white hover:text-red-500 opacity-0 group-hover:opacity-100 p-1">
                      <Trash2 size={12} />
                    </button>
                  )}
                </td>
                <td className={`p-2 lg:p-3 border-r-4 border-black text-[10px] lg:text-xs break-words ${currentDay === 'monday' ? 'bg-neo-cyan/20' : ''}`}>{entry.monday || "-"}</td>
                <td className={`p-2 lg:p-3 border-r-4 border-black text-[10px] lg:text-xs break-words ${currentDay === 'tuesday' ? 'bg-neo-cyan/20' : ''}`}>{entry.tuesday || "-"}</td>
                <td className={`p-2 lg:p-3 border-r-4 border-black text-[10px] lg:text-xs break-words ${currentDay === 'wednesday' ? 'bg-neo-cyan/20' : ''}`}>{entry.wednesday || "-"}</td>
                <td className={`p-2 lg:p-3 border-r-4 border-black text-[10px] lg:text-xs break-words ${currentDay === 'thursday' ? 'bg-neo-cyan/20' : ''}`}>{entry.thursday || "-"}</td>
                <td className={`p-2 lg:p-3 text-[10px] lg:text-xs break-words ${currentDay === 'friday' ? 'bg-neo-cyan/20' : ''}`}>{entry.friday || "-"}</td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-xs lg:text-sm border-dashed">No timetable entries yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
    </section>
  );
}
