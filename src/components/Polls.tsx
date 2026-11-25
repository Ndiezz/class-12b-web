import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { collection, onSnapshot, addDoc, deleteDoc, doc, runTransaction } from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import { getOrCreateClientId } from "@/src/lib/clientId";
import { useRole } from "@/src/hooks/useRole";
import { Poll } from "@/src/types";
import { NeoCard } from "./ui/NeoCard";
import { NeoButton } from "./ui/NeoButton";
import { Trash2, Check } from "lucide-react";
import { motion } from "motion/react";

const PROGRESS_COLORS = [
  "bg-neo-cyan",
  "bg-neo-pink",
  "bg-neo-green",
  "bg-neo-yellow",
  "bg-neo-purple",
  "bg-neo-orange",
  "bg-neo-lime",
  "bg-neo-red"
];

export default function Polls() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const { isAdmin } = useRole();
  const [newPollQuestion, setNewPollQuestion] = useState("");
  const [newPollOptions, setNewPollOptions] = useState(["", ""]);
  const [pendingPolls, setPendingPolls] = useState<Record<string, boolean>>({});
  const pendingLocksRef = useRef<Set<string>>(new Set());
  const clientId = getOrCreateClientId();

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "polls"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Poll));
      setPolls(data.sort((a, b) => b.createdAt - a.createdAt));
    });
    return unsub;
  }, []);

  const handleAddOption = () => {
    if (newPollOptions.length < 5) setNewPollOptions([...newPollOptions, ""]);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const validOptions = newPollOptions.filter(o => o.trim() !== "");
    if (!newPollQuestion || validOptions.length < 2) return;
    
    try {
      await addDoc(collection(db, "polls"), {
        question: newPollQuestion,
        options: validOptions.map(text => ({ text, votes: 0 })),
        voters: {},
        createdAt: Date.now()
      });
      toast.success("Poling berhasil dibuat!", { id: 'app-toast', duration: 3000 });
      setNewPollQuestion("");
      setNewPollOptions(["", ""]);
    } catch (err) {
      console.error(err);
      toast.error("Gagal membuat poling!", { id: 'app-toast', duration: 3000 });
    }
  };

  const getUserVotedIndex = (poll: Poll): number | null => {
    if (poll.voters && typeof poll.voters[clientId] === "number") {
      return poll.voters[clientId];
    }
    if (poll.id) {
      try {
        const savedChoice = localStorage.getItem(`voted_poll_choice_${poll.id}`);
        if (savedChoice !== null) {
          const parsed = parseInt(savedChoice, 10);
          if (!Number.isNaN(parsed)) return parsed;
        }
      } catch {
        return null;
      }
    }
    return null;
  };

  const handleVote = async (poll: Poll, optionIndex: number) => {
    if (!poll.id) return;

    const lockKey = `vote_${poll.id}`;
    if (pendingLocksRef.current.has(lockKey)) return;

    pendingLocksRef.current.add(lockKey);
    setPendingPolls(prev => ({ ...prev, [poll.id!]: true }));

    const choiceStorageKey = `voted_poll_choice_${poll.id}`;
    const legacyVotedKey = `voted_poll_${poll.id}`;

    try {
      const pollRef = doc(db, "polls", poll.id);

      const actionResult = await runTransaction(
        db,
        async (transaction): Promise<"voted" | "switched" | "unvoted"> => {
          const snap = await transaction.get(pollRef);
          if (!snap.exists()) return "voted";

          const data = snap.data() as Poll;
          const options = (data.options || []).map(opt => ({ ...opt }));
          const voters: Record<string, number> = { ...(data.voters || {}) };

          if (optionIndex < 0 || optionIndex >= options.length) return "voted";

          let previousIndex: number | undefined =
            typeof voters[clientId] === "number" ? voters[clientId] : undefined;

          if (previousIndex === undefined) {
            try {
              const savedChoice = localStorage.getItem(choiceStorageKey);
              if (savedChoice !== null) {
                const parsed = parseInt(savedChoice, 10);
                if (!Number.isNaN(parsed) && parsed >= 0 && parsed < options.length && options[parsed].votes > 0) {
                  previousIndex = parsed;
                }
              }
            } catch {
              // ignore storage errors
            }
          }

          let result: "voted" | "switched" | "unvoted" = "voted";
          if (previousIndex === optionIndex) {
            options[optionIndex].votes = Math.max(0, options[optionIndex].votes - 1);
            delete voters[clientId];
            result = "unvoted";
          } else if (
            typeof previousIndex === "number" &&
            previousIndex >= 0 &&
            previousIndex < options.length
          ) {
            options[previousIndex].votes = Math.max(0, options[previousIndex].votes - 1);
            options[optionIndex].votes = (options[optionIndex].votes || 0) + 1;
            voters[clientId] = optionIndex;
            result = "switched";
          } else {
            options[optionIndex].votes = (options[optionIndex].votes || 0) + 1;
            voters[clientId] = optionIndex;
            result = "voted";
          }

          transaction.update(pollRef, {
            options,
            voters
          });
          return result;
        }
      );

      try {
        if (actionResult === "unvoted") {
          localStorage.removeItem(choiceStorageKey);
          localStorage.removeItem(legacyVotedKey);
          toast.success("Pilihan suara dibatalkan!", { id: "app-toast", duration: 2500 });
        } else if (actionResult === "switched") {
          localStorage.setItem(choiceStorageKey, optionIndex.toString());
          localStorage.setItem(legacyVotedKey, "true");
          toast.success("Pilihan suara berhasil diganti!", { id: "app-toast", duration: 2500 });
        } else {
          localStorage.setItem(choiceStorageKey, optionIndex.toString());
          localStorage.setItem(legacyVotedKey, "true");
          toast.success("Suara berhasil diberikan!", { id: "app-toast", duration: 2500 });
        }
      } catch {
        // ignore storage errors
      }
    } catch (err) {
      console.error(err);
      toast.error("Gagal memberikan suara!", { id: 'app-toast', duration: 3000 });
    } finally {
      pendingLocksRef.current.delete(lockKey);
      setPendingPolls(prev => {
        const next = { ...prev };
        delete next[poll.id!];
        return next;
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "polls", id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <section id="polls" className="w-full border-t-4 border-black bg-[#FF9E00]/20 relative z-10">
    <div className="p-4 sm:p-8 max-w-7xl mx-auto">
      <div className="mb-6 sm:mb-8">
        <span className="bg-neo-cyan border-2 border-black px-2.5 sm:px-3 py-0.5 sm:py-1 font-bold text-[10px] sm:text-xs uppercase tracking-widest text-black shadow-[2px_2px_0_0_#000] sm:shadow-[3px_3px_0_0_#000]">CHAPTER 05</span>
        <h2 className="text-3xl sm:text-5xl md:text-7xl font-black uppercase mt-3 sm:mt-4 break-words">Polls & Voting</h2>
      </div>

      {isAdmin && (
        <NeoCard color="white" className="p-4 sm:p-6 mb-6 sm:mb-12">
          <h3 className="font-bold text-lg sm:text-xl mb-4 uppercase">Admin: Create Poll</h3>
          <form onSubmit={handleAdd} className="flex flex-col gap-3 sm:gap-4 max-w-2xl">
            <input 
              type="text" 
              className="input-brutal text-sm sm:text-base font-bold" 
              placeholder="Question..." 
              value={newPollQuestion} 
              onChange={e => setNewPollQuestion(e.target.value)} 
              required 
            />
            {newPollOptions.map((opt, i) => (
              <input 
                key={i}
                type="text" 
                className="input-brutal text-xs sm:text-sm" 
                placeholder={`Option ${i + 1}`} 
                value={opt} 
                onChange={e => {
                  const newOpts = [...newPollOptions];
                  newOpts[i] = e.target.value;
                  setNewPollOptions(newOpts);
                }} 
              />
            ))}
            <div className="flex gap-2 sm:gap-4">
              {newPollOptions.length < 5 && (
                <NeoButton type="button" color="cyan" className="py-2 text-xs sm:text-sm" onClick={handleAddOption}>+ Option</NeoButton>
              )}
              <NeoButton type="submit" color="pink" className="py-2 text-xs sm:text-sm">Create Poll</NeoButton>
            </div>
          </form>
        </NeoCard>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
        {polls.map((poll) => {
          const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes, 0);
          const userVotedIndex = getUserVotedIndex(poll);
          const isPollPending = !!(poll.id && pendingPolls[poll.id]);

          return (
            <NeoCard key={poll.id} color="white" className="p-4 sm:p-6 relative group">
              {isAdmin && (
                <button onClick={() => handleDelete(poll.id!)} className="absolute top-3 right-3 sm:top-4 sm:right-4 text-black hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-black p-1 rounded-full">
                  <Trash2 size={16} className="sm:w-5 sm:h-5" />
                </button>
              )}
              <h3 className="font-black text-lg sm:text-2xl mb-4 sm:mb-6 pr-6 sm:pr-8 break-words">{poll.question}</h3>
              <div className="flex flex-col gap-2.5 sm:gap-4">
                {poll.options.map((opt, i) => {
                  const percentage = totalVotes === 0 ? 0 : Math.round((opt.votes / totalVotes) * 100);
                  const colorClass = PROGRESS_COLORS[i % PROGRESS_COLORS.length];
                  const isSelected = userVotedIndex === i;

                  return (
                    <button 
                      key={i}
                      type="button"
                      disabled={isPollPending}
                      onClick={() => handleVote(poll, i)}
                      title={isSelected ? "Klik untuk batalkan pilihan" : userVotedIndex !== null ? "Klik untuk pindah pilihan ke opsi ini" : "Klik untuk memilih opsi ini"}
                      className={`relative w-full border-2 sm:border-4 border-black p-2 sm:p-3 text-left font-bold overflow-hidden group/btn transition-all text-xs sm:text-base ${
                        isSelected
                          ? "shadow-[3px_3px_0_0_#000] -translate-y-0.5 bg-white"
                          : "hover:bg-gray-100"
                      } ${isPollPending ? "opacity-60 cursor-wait" : ""}`}
                    >
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.45, ease: "easeOut" }}
                        className={`absolute top-0 left-0 h-full ${colorClass} progress-energy z-0 ${percentage > 0 ? "border-r-2 sm:border-r-4 border-black" : ""}`} 
                      />
                      <div className="flex justify-between items-center relative z-10 gap-2">
                        <span className="truncate flex items-center gap-1.5">
                          {isSelected && (
                            <span className="inline-flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 bg-black text-white rounded-full shrink-0">
                              <Check size={12} strokeWidth={3} />
                            </span>
                          )}
                          <span className="truncate">{opt.text}</span>
                        </span>
                        <span className="shrink-0 text-xs sm:text-sm tabular-nums">{percentage}% ({opt.votes})</span>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 sm:mt-4 flex items-center justify-between text-xs sm:text-sm font-bold uppercase text-gray-500 tabular-nums">
                <span>Total Votes: {totalVotes}</span>
                {userVotedIndex !== null && (
                  <span className="text-[10px] sm:text-xs text-black bg-neo-yellow border border-black px-2 py-0.5 shadow-[1px_1px_0_0_#000]">
                    Klik lagi untuk batal / ganti
                  </span>
                )}
              </div>
            </NeoCard>
          );
        })}
        {polls.length === 0 && (
          <div className="col-span-full text-center p-8 sm:p-12 border-2 sm:border-4 border-black border-dashed font-bold text-sm sm:text-xl">
            No polls active.
          </div>
        )}
      </div>
    </div>
    </section>
  );
}
