import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { collection, onSnapshot, addDoc } from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import { useRole } from "@/src/hooks/useRole";
import { CapsuleMessage } from "@/src/types";
import { NeoCard } from "./ui/NeoCard";
import { NeoButton } from "./ui/NeoButton";
import { Lock, Unlock, Clock, Send } from "lucide-react";

export default function TimeCapsule() {
  const [messages, setMessages] = useState<CapsuleMessage[]>([]);
  const [newMsg, setNewMsg] = useState({ nickname: "", content: "" });
  const [isLocked, setIsLocked] = useState(true);
  const { role, isAdmin } = useRole();

  const isMemberOrAdmin = role === 'admin' || role === 'member';

  // Time capsule unlocks in 2031 (5 years from now basically, or just a fixed date)
  const unlockDate = new Date("2031-05-01T00:00:00").getTime();
  const now = new Date().getTime();
  const canUnlock = now >= unlockDate;

  useEffect(() => {
    if (!isAdmin) return;
    const unsub = onSnapshot(collection(db, "capsules"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CapsuleMessage));
      setMessages(data.sort((a, b) => b.createdAt - a.createdAt));
    });
    return unsub;
  }, [isAdmin]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.content) return;

    try {
      await addDoc(collection(db, "capsules"), {
        ...newMsg,
        nickname: newMsg.nickname || "ANONYMOUS",
        unlockDate,
        createdAt: Date.now()
      });
      toast.success("Pesan berhasil disegel!", { id: 'app-toast', duration: 3000 });
      setNewMsg({ nickname: "", content: "" });
    } catch (err) {
      console.error(err);
      toast.error("Gagal menyegel pesan", { id: 'app-toast', duration: 3000 });
    }
  };

  if (!isMemberOrAdmin) {
    return null;
  }

  return (
    <section id="capsule" className="w-full bg-[#B800FF]/10 relative z-10 py-12 border-t-4 border-black">
    <div className="p-4 sm:p-8 max-w-7xl mx-auto">
      <div className="mb-6 sm:mb-8 text-center">
        <span className="bg-neo-purple border-2 border-black px-2.5 sm:px-3 py-0.5 sm:py-1 font-bold text-[10px] sm:text-xs uppercase tracking-widest text-white shadow-[2px_2px_0_0_#000] sm:shadow-[3px_3px_0_0_#000]">CHAPTER 06</span>
        <h2 className="text-3xl sm:text-5xl md:text-7xl font-black uppercase mt-3 sm:mt-4 break-words">Time Capsule</h2>
        <p className="font-bold text-xs sm:text-sm mt-2 opacity-80 uppercase tracking-widest">Terkunci hingga 1 Mei 2031</p>
      </div>

      <div className={`grid gap-8 max-w-5xl mx-auto ${isAdmin ? 'md:grid-cols-2' : 'max-w-xl'}`}>
        <NeoCard color="white" className="p-4 sm:p-6 flex flex-col justify-center items-center text-center">
          {canUnlock ? (
            <Unlock size={64} className="mb-4 text-neo-green" />
          ) : (
            <Lock size={64} className="mb-4 text-black" />
          )}
          <h3 className="font-black text-2xl uppercase mb-2">
            {canUnlock ? "Kapsul Waktu Telah Dibuka!" : "Kapsul Waktu Telah Disegel"}
          </h3>
          <p className="font-medium text-sm mb-6 max-w-sm">
            {canUnlock 
              ? "Baca pesan yang ditinggalkan oleh dirimu di masa lalu." 
              : "Tinggalkan pesan untuk masa depan. Tidak ada yang bisa membaca pesan ini sampai tanggal pembukaan."}
          </p>

          {!canUnlock && (
            <form onSubmit={handleAdd} className="w-full flex flex-col gap-3 text-left">
              <input 
                type="text" 
                placeholder="Nama Panggilan (Kosong = Anonim)" 
                className="input-brutal text-sm"
                value={newMsg.nickname}
                onChange={e => setNewMsg({...newMsg, nickname: e.target.value.toUpperCase()})}
              />
              <textarea 
                placeholder="Tulis pesan untuk dirimu di masa depan..." 
                className="input-brutal text-sm h-32 resize-none"
                value={newMsg.content}
                onChange={e => setNewMsg({...newMsg, content: e.target.value})}
                required
              />
              <NeoButton type="submit" color="purple" className="flex items-center justify-center gap-2 text-white">
                <Send size={16} /> Segel Pesan
              </NeoButton>
            </form>
          )}
        </NeoCard>

        {isAdmin && (
          <NeoCard color="blue" className="p-4 sm:p-6 overflow-hidden flex flex-col h-[500px]">
            <h3 className="font-black text-xl uppercase mb-4 sticky top-0 bg-neo-blue z-10 pb-2 border-b-2 border-black flex items-center justify-between">
              <span>Brankas</span>
              <span className="text-sm px-2 py-1 bg-black text-white">{messages.length}</span>
            </h3>
            <div className="overflow-y-auto pr-2 space-y-3 flex-1 flex-col flex">
              {messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center opacity-50">
                  <Clock size={48} className="mb-2" />
                  <p className="font-bold text-sm">Brankas kosong.</p>
                </div>
              ) : (
                messages.map(msg => (
                  <div key={msg.id} className="bg-white border-2 border-black p-3 shadow-[2px_2px_0_0_#000]">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-xs uppercase bg-neo-cyan px-1 border border-black">{msg.nickname}</span>
                      <span className="text-[10px] font-bold text-gray-500">{new Date(msg.createdAt).toLocaleDateString()}</span>
                    </div>
                    {canUnlock ? (
                      <p className="font-medium text-sm leading-relaxed">{msg.content}</p>
                    ) : (
                      <div className="bg-gray-100 text-gray-400 p-2 font-mono text-[10px] break-all">
                        {msg.content.replace(/./g, '*')}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </NeoCard>
        )}
      </div>
    </div>
    </section>
  );
}
