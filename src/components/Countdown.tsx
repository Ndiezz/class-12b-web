import { useState, useEffect } from "react";
import { NeoCard } from "./ui/NeoCard";

export default function Countdown() {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  // Example: Graduation Date
  const targetDate = new Date("2027-05-21T00:00:00").getTime();

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = targetDate - now;

      if (distance < 0) {
        clearInterval(interval);
        return;
      }

      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000)
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  const pad = (num: number) => num.toString().padStart(2, "0");

  return (
    <section className="p-4 sm:p-8 max-w-7xl mx-auto relative z-10 my-12">
      <div className="mb-6 sm:mb-8 text-center">
        <h2 className="text-3xl sm:text-5xl md:text-7xl font-black uppercase mt-3 sm:mt-4 break-words">Graduation Countdown</h2>
        <p className="font-bold text-xs sm:text-sm mt-2 opacity-80 uppercase tracking-widest">Time left until we say goodbye</p>
      </div>

      <NeoCard color="white" className="p-4 sm:p-8 md:p-12 max-w-4xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8">
          {[
            { label: 'Days', value: pad(timeLeft.days) },
            { label: 'Hours', value: pad(timeLeft.hours) },
            { label: 'Minutes', value: pad(timeLeft.minutes) },
            { label: 'Seconds', value: pad(timeLeft.seconds) },
          ].map((item, idx) => (
            <div key={idx} className="flex flex-col items-center justify-center p-4 sm:p-6 border-4 border-black bg-gray-50 shadow-[4px_4px_0_0_#000] transform hover:-translate-y-1 transition-transform">
              <span className="font-black text-4xl sm:text-6xl md:text-7xl tracking-tighter text-black">{item.value}</span>
              <span className="font-bold text-[10px] sm:text-xs uppercase tracking-widest mt-2 bg-neo-pink text-white px-2 py-0.5 border-2 border-black">{item.label}</span>
            </div>
          ))}
        </div>
      </NeoCard>
    </section>
  );
}
