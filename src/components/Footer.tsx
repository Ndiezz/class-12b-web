import { useState } from "react";
import { NeoButton } from "./ui/NeoButton";
import { NeoCard } from "./ui/NeoCard";

export default function Footer() {
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSent(true);
    e.currentTarget.reset();
    setTimeout(() => setSent(false), 4000);
  };

  return (
    <footer className="border-t-4 border-black bg-white p-4 sm:p-8 md:p-16 flex flex-col md:flex-row justify-between items-start gap-8 sm:gap-12 relative z-10">
      <div className="flex-1 max-w-xl w-full">
        <h2 className="text-2xl sm:text-4xl md:text-6xl font-black uppercase mb-3 sm:mb-4 break-words">Contact the Class Rep</h2>
        <p className="font-medium text-xs sm:text-base md:text-lg mb-6 sm:mb-8 leading-relaxed">
          Got a question about the timetable, an issue with the site, or just want to say hi? Send a message directly to the class president.
        </p>
        
        {sent ? (
          <div className="bg-neo-green border-2 border-black p-4 font-bold text-sm shadow-[3px_3px_0_0_#000]">
            ✓ Message sent successfully (simulation)!
          </div>
        ) : (
          <form className="flex flex-col gap-3 sm:gap-4" onSubmit={handleSubmit}>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <input type="text" placeholder="Your Name" className="input-brutal text-xs sm:text-sm font-bold flex-1" required />
              <input type="email" placeholder="Your Email" className="input-brutal text-xs sm:text-sm font-bold flex-1" required />
            </div>
            <textarea placeholder="Your Message" className="input-brutal text-xs sm:text-sm font-bold h-28 resize-none" required></textarea>
            <NeoButton type="submit" color="pink" className="self-start text-xs sm:text-sm py-2 px-4">Send Message</NeoButton>
          </form>
        )}
      </div>

      <div className="flex-1 w-full md:w-auto flex flex-col gap-6">
        <NeoCard color="cyan" className="p-4 sm:p-8 text-center max-w-md mx-auto md:mr-0 w-full">
          <h3 className="font-black text-xl sm:text-2xl mb-2">Class 12-B</h3>
          <p className="font-bold text-xs sm:text-sm mb-4 sm:mb-6">Website maintained by the admin team.</p>
          <div className="text-[10px] sm:text-xs font-bold uppercase tracking-widest border-t-2 sm:border-t-4 border-black pt-3 sm:pt-4">
            © 2026 CLASS 12-B. ALL RIGHTS RESERVED.
          </div>
        </NeoCard>
      </div>
    </footer>
  );
}
