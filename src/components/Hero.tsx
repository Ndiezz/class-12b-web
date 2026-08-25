import { NeoButton } from "./ui/NeoButton";
import HeroShapes from "./HeroShapes";

export default function Hero() {
  return (
    <section className="min-h-[80vh] flex flex-col justify-center px-4 py-12 sm:p-8 md:p-16 lg:p-32 relative overflow-hidden">
      <div className="z-10 max-w-4xl flex flex-col items-start lg:ml-12">
        <div className="bg-neo-blue text-white border-2 border-black px-3 py-1 font-bold uppercase text-[10px] sm:text-xs tracking-widest mb-4 sm:mb-6 inline-block rounded-full">
          EST. 2025 — CLASS OF 2025-2027
        </div>
        
        <h1 className="font-black text-3xl sm:text-5xl md:text-7xl lg:text-[7rem] tracking-tight uppercase leading-[1.05] sm:leading-[0.95] mb-4 sm:mb-6 break-words max-w-full">
          We Are<br />
          <span className="bg-neo-cyan px-2 sm:px-4 border-2 border-black inline-block mt-1 sm:mt-2 mb-1 shadow-[3px_3px_0_0_#000] sm:shadow-[4px_4px_0_0_#000]">Class 12-B</span><br />
          We Are<br />
          <span className="text-neo-pink">Excellence.</span>
        </h1>
        
        <p className="font-medium text-sm sm:text-base md:text-lg max-w-2xl mb-6 sm:mb-10 text-gray-900 leading-relaxed">
          Too loud to be forgotten, too close to be strangers. Menutup babak terakhir masa SMA dengan tawa paling keras dan cerita paling membekas—selamat datang di kelas abadi 12-B.
        </p>

        <div className="flex flex-wrap gap-3 sm:gap-4 justify-start mt-2">
          <a href="#roster">
            <NeoButton color="cyan" className="text-xs sm:text-sm py-2 px-3 sm:py-3 sm:px-6">Meet the Class ↓</NeoButton>
          </a>
          <a href="#board">
            <NeoButton color="white" className="text-xs sm:text-sm py-2 px-3 sm:py-3 sm:px-6">💬 Drop a Message</NeoButton>
          </a>
        </div>
      </div>
      
      <HeroShapes />
    </section>
  );
}
