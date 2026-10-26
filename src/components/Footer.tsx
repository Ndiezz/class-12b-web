import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { collection, addDoc, onSnapshot, deleteDoc, doc, setDoc } from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import { useRole } from "@/src/hooks/useRole";
import { ContactMessage } from "@/src/types";
import { NeoButton } from "./ui/NeoButton";
import { NeoCard } from "./ui/NeoCard";
import { Trash2, Inbox, Send } from "lucide-react";

export default function Footer() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [inboxMessages, setInboxMessages] = useState<ContactMessage[]>([]);
  const { isAdmin } = useRole();

  useEffect(() => {
    if (!isAdmin) {
      setInboxMessages([]);
      return;
    }
    const unsub = onSnapshot(collection(db, "contact_messages"), (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ContactMessage));
      setInboxMessages(data.sort((a, b) => b.createdAt - a.createdAt));
    });
    return unsub;
  }, [isAdmin]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "contact_messages"), {
        name: name.trim(),
        email: email.trim(),
        message: message.trim(),
        createdAt: Date.now(),
      });
      setName("");
      setEmail("");
      setMessage("");
      setSent(true);
      toast.success("Pesan berhasil dikirim ke Admin!", { id: "app-toast", duration: 3000 });
      setTimeout(() => setSent(false), 4000);
    } catch (err) {
      console.error("Error sending contact message:", err);
      toast.error("Gagal mengirim pesan. Coba lagi ya!", { id: "app-toast", duration: 3000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const msgToDel = inboxMessages.find(m => m.id === id);
    if (!msgToDel) return;
    try {
      await deleteDoc(doc(db, "contact_messages", id));
      toast((t) => (
        <div className="flex items-center gap-3">
          <span className="font-bold text-sm">Pesan dihapus</span>
          <button
            onClick={() => {
              toast.dismiss(t.id);
              const { id: docId, ...rest } = msgToDel;
              setDoc(doc(db, "contact_messages", docId!), rest);
              toast.success("Pesan dikembalikan!");
            }}
            className="bg-neo-cyan px-2 py-1 font-bold border-2 border-[#000] shadow-[2px_2px_0_0_#000] text-xs"
          >
            BATAL
          </button>
        </div>
      ), { duration: 4000 });
    } catch (err) {
      console.error("Error deleting contact message:", err);
      toast.error("Gagal menghapus pesan");
    }
  };

  return (
    <footer className="border-t-4 border-black bg-white p-4 sm:p-8 md:p-16 flex flex-col gap-10 relative z-10">
      <div className="flex flex-col md:flex-row justify-between items-start gap-8 sm:gap-12 w-full">
        <div className="flex-1 max-w-xl w-full">
          <h2 className="text-2xl sm:text-4xl md:text-6xl font-black uppercase mb-3 sm:mb-4 break-words">Hubungi Admin</h2>
          <p className="font-medium text-xs sm:text-base md:text-lg mb-6 sm:mb-8 leading-relaxed">
            Punya pertanyaan soal jadwal pelajaran, kendala di website, atau cuma mau menyapa? Kirim pesan langsung ke admin kelas.
          </p>
          
          {sent ? (
            <div className="bg-neo-green border-2 border-black p-4 font-bold text-sm shadow-[3px_3px_0_0_#000]">
              ✓ Pesan berhasil dikirim! Terima kasih sudah menghubungi Admin.
            </div>
          ) : (
            <form className="flex flex-col gap-3 sm:gap-4" onSubmit={handleSubmit}>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <input
                  type="text"
                  placeholder="Nama Kamu"
                  className="input-brutal text-xs sm:text-sm font-bold flex-1"
                  value={name}
                  maxLength={100}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <input
                  type="text"
                  placeholder="Email / Kontak Kamu (WA/IG)"
                  className="input-brutal text-xs sm:text-sm font-bold flex-1"
                  value={email}
                  maxLength={100}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <textarea
                placeholder="Tulis pesanmu di sini..."
                className="input-brutal text-xs sm:text-sm font-bold h-28 resize-none"
                value={message}
                maxLength={1000}
                onChange={(e) => setMessage(e.target.value)}
                required
              ></textarea>
              <NeoButton
                type="submit"
                color="pink"
                disabled={isSubmitting}
                className="self-start text-xs sm:text-sm py-2 px-4 flex items-center gap-2"
              >
                <Send size={14} />
                {isSubmitting ? "Mengirim..." : "Kirim Pesan"}
              </NeoButton>
            </form>
          )}
        </div>

        <div className="flex-1 w-full md:w-auto flex flex-col gap-6">
          <NeoCard color="cyan" className="p-4 sm:p-8 text-center max-w-md mx-auto md:mr-0 w-full">
            <h3 className="font-black text-xl sm:text-2xl mb-2">Kelas 12-B</h3>
            <p className="font-bold text-xs sm:text-sm mb-4 sm:mb-6">Website dikelola oleh tim admin.</p>
            
            <div className="text-[10px] sm:text-xs font-bold uppercase tracking-widest border-t-2 sm:border-t-4 border-black pt-3 sm:pt-4">
              © 2026 KELAS 12-B. HAK CIPTA DILINDUNGI.
            </div>
          </NeoCard>
        </div>
      </div>

      {isAdmin && (
        <div className="w-full border-t-4 border-dashed border-black pt-8">
          <NeoCard color="yellow" className="p-4 sm:p-6">
            <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Inbox size={22} />
                <h3 className="font-black text-lg sm:text-2xl uppercase">Kotak Masuk Admin</h3>
              </div>
              <span className="bg-black text-white font-black text-xs sm:text-sm px-2.5 py-1">
                {inboxMessages.length} Pesan
              </span>
            </div>

            {inboxMessages.length === 0 ? (
              <p className="font-bold text-xs sm:text-sm text-center py-8 opacity-70">
                Belum ada pesan masuk dari pengunjung.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[420px] overflow-y-auto pr-1">
                {inboxMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="bg-white border-2 border-black p-4 shadow-[3px_3px_0_0_#000] flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 border-b-2 border-black pb-2 mb-2">
                        <div className="min-w-0">
                          <p className="font-black text-xs sm:text-sm uppercase truncate">{msg.name}</p>
                          <p className="font-bold text-[10px] sm:text-xs text-gray-600 break-all">{msg.email}</p>
                        </div>
                        <button
                          onClick={() => handleDelete(msg.id!)}
                          className="p-1.5 bg-white hover:bg-red-500 hover:text-white border border-black rounded-full transition-colors shrink-0"
                          title="Hapus Pesan"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <p className="font-medium text-xs sm:text-sm whitespace-pre-wrap break-words leading-relaxed">
                        {msg.message}
                      </p>
                    </div>
                    <div className="text-[10px] font-bold text-gray-500 text-right border-t border-black/20 pt-1.5">
                      {new Date(msg.createdAt).toLocaleString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </NeoCard>
        </div>
      )}
    </footer>
  );
}

