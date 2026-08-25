import { useEffect, useState } from "react";
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import { useRole } from "@/src/hooks/useRole";
import { Poll } from "@/src/types";
import { NeoCard } from "./ui/NeoCard";
import { NeoButton } from "./ui/NeoButton";
import { Trash2 } from "lucide-react";

export default function Polls() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const { isAdmin } = useRole();
  const [newPollQuestion, setNewPollQuestion] = useState("");
  const [newPollOptions, setNewPollOptions] = useState(["", ""]);

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
        createdAt: Date.now()
      });
      setNewPollQuestion("");
      setNewPollOptions(["", ""]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleVote = async (poll: Poll, optionIndex: number) => {
    // In a real app we'd track who voted to prevent double voting. For now it's a simple free-for-all.
    try {
      const newOptions = [...poll.options];
      newOptions[optionIndex].votes += 1;
      await updateDoc(doc(db, "polls", poll.id!), { options: newOptions });
    } catch (err) {
      console.error(err);
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
    <section id="polls" className="p-4 sm:p-8 max-w-7xl mx-auto border-t-4 border-black">
      <div className="mb-6 sm:mb-8">
        <span className="bg-neo-cyan border-2 sm:border-4 border-black px-2 sm:px-3 py-0.5 sm:py-1 font-bold text-xs sm:text-sm uppercase text-black">Chapter 05</span>
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
                  return (
                    <button 
                      key={i} 
                      onClick={() => handleVote(poll, i)}
                      className="relative w-full border-2 sm:border-4 border-black p-2 sm:p-3 text-left font-bold overflow-hidden group/btn hover:bg-gray-100 transition-colors text-xs sm:text-base"
                    >
                      <div 
                        className="absolute top-0 left-0 h-full bg-neo-cyan -z-10 transition-all duration-500 border-r-2 sm:border-r-4 border-black" 
                        style={{ width: `${percentage}%` }}
                      ></div>
                      <div className="flex justify-between items-center z-10 gap-2">
                        <span className="truncate">{opt.text}</span>
                        <span className="shrink-0 text-xs sm:text-sm">{percentage}% ({opt.votes})</span>
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 sm:mt-4 text-xs sm:text-sm font-bold uppercase text-gray-500">Total Votes: {totalVotes}</p>
            </NeoCard>
          );
        })}
        {polls.length === 0 && (
          <div className="col-span-full text-center p-8 sm:p-12 border-2 sm:border-4 border-black border-dashed font-bold text-sm sm:text-xl">
            No polls active.
          </div>
        )}
      </div>
    </section>
  );
}
