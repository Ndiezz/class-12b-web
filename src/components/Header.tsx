import { LogIn, LogOut, GraduationCap, X } from "lucide-react";
import { useState } from "react";
import { useRole } from "../hooks/useRole";
import { NeoButton } from "./ui/NeoButton";

export default function Header() {
  const { role, setRole, isAdmin, isMember } = useRole();
  const [showLogin, setShowLogin] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === "adminkelasbuyoyo" && password === "wafagibranaamlida") {
      setRole("admin");
      setShowLogin(false);
      setUsername("");
      setPassword("");
      setError("");
    } else if (username === "anggotakelasburoro" && password === "tigapuluhlimasiswawow") {
      setRole("member");
      setShowLogin(false);
      setUsername("");
      setPassword("");
      setError("");
    } else {
      setError("Username atau password salah!");
    }
  };

  const handleLogout = () => {
    setRole("none");
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-white border-b-4 border-black p-3 sm:p-4 flex justify-between items-center">
        <div className="flex items-center gap-1.5 sm:gap-2 font-black text-lg sm:text-2xl uppercase tracking-tighter shrink-0">
          <div className="bg-neo-cyan border-2 border-black p-0.5 sm:p-1">
            <GraduationCap size={20} className="sm:w-6 sm:h-6" strokeWidth={3} />
          </div>
          CLASS 12-B
        </div>

        <nav className="hidden md:flex gap-6 font-bold uppercase text-sm tracking-wide">
          <a href="#roster" className="hover:underline underline-offset-4">Roster</a>
          <a href="#board" className="hover:underline underline-offset-4">Board</a>
          <a href="#gallery" className="hover:underline underline-offset-4">Gallery</a>
          <a href="#timetable" className="hover:underline underline-offset-4">Timetable</a>
          <a href="#polls" className="hover:underline underline-offset-4">Polls</a>
        </nav>

        {role !== 'none' ? (
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="font-bold text-xs hidden sm:inline-block">
              {isAdmin ? 'Admin' : 'Member'}
            </span>
            <NeoButton color="pink" className="py-1.5 px-2.5 sm:py-2 sm:px-4 text-xs sm:text-sm flex items-center gap-1.5" onClick={handleLogout}>
              <LogOut size={14} className="sm:w-4 sm:h-4" /> Logout
            </NeoButton>
          </div>
        ) : (
          <NeoButton color="cyan" className="py-1.5 px-3 sm:py-2 sm:px-4 text-xs sm:text-sm flex items-center gap-1.5" onClick={() => setShowLogin(true)}>
            <LogIn size={14} className="sm:w-4 sm:h-4" /> Login
          </NeoButton>
        )}
      </header>

      {showLogin && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white border-4 border-black p-8 w-full max-w-sm shadow-[8px_8px_0_0_#000]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-black text-2xl uppercase">Login Area</h2>
              <button onClick={() => setShowLogin(false)} className="p-1 hover:bg-gray-200 border-2 border-black rounded-full">
                <X size={20} />
              </button>
            </div>
            
            {error && (
              <div className="bg-neo-red text-white p-3 font-bold mb-4 border-2 border-black text-sm">
                {error}
              </div>
            )}
            
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <div>
                <label className="font-bold text-sm uppercase block mb-1">Username</label>
                <input 
                  type="text" 
                  className="input-brutal w-full" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="font-bold text-sm uppercase block mb-1">Password</label>
                <input 
                  type="password" 
                  className="input-brutal w-full" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn-brutal bg-neo-yellow hover:bg-yellow-400 mt-2">
                Login
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
