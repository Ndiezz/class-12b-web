import { NeoButton } from "./ui/NeoButton";
import HeroShapes from "./HeroShapes";
import { motion, useScroll, useTransform } from "motion/react";

export default function Hero() {
  const { scrollY } = useScroll();
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);
  const y = useTransform(scrollY, [0, 300], [0, 50]);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      document.body.style.transition = 'filter 0.4s ease, transform 0.4s ease';
      document.body.style.filter = 'blur(10px)';
      document.body.style.transform = 'scale(0.95) translateY(20px)';
      
      setTimeout(() => {
        target.scrollIntoView({ behavior: 'auto' });
        document.body.style.filter = 'none';
        document.body.style.transform = 'none';
      }, 400);
    }
  };

  return (
    <section className="min-h-[80vh] flex flex-col justify-center px-4 py-12 sm:p-8 md:p-16 lg:p-32 relative overflow-hidden">
      <motion.div 
        style={{ opacity, y }}
        className="z-10 max-w-4xl flex flex-col items-start lg:ml-12"
      >
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-neo-blue text-white border-2 border-black px-3 py-1 font-bold uppercase text-[10px] sm:text-xs tracking-widest mb-4 sm:mb-6 inline-block rounded-full"
        >
          EST. 2025 — CLASS OF 2025-2027
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="font-black text-3xl sm:text-5xl md:text-7xl lg:text-[7rem] tracking-tight uppercase leading-[1.05] sm:leading-[0.95] mb-4 sm:mb-6 break-words max-w-full"
        >
          We Are<br />
          <span className="bg-neo-cyan px-2 sm:px-4 border-2 border-black inline-block mt-1 sm:mt-2 mb-1 shadow-[3px_3px_0_0_#000] sm:shadow-[4px_4px_0_0_#000]">Class 12-B</span><br />
          We Are<br />
          <span className="text-neo-pink whitespace-nowrap">Excellence.</span>
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="font-medium text-sm sm:text-base md:text-lg max-w-2xl mb-6 sm:mb-10 text-gray-900 leading-relaxed"
        >
          Too loud to be forgotten, too close to be strangers. Menutup babak terakhir masa SMA dengan tawa paling keras dan cerita paling membekas—selamat datang di kelas abadi 12-B.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-wrap gap-3 sm:gap-4 justify-start mt-2"
        >
          <a href="#roster" onClick={(e) => handleNavClick(e, 'roster')}>
            <NeoButton color="cyan" className="text-xs sm:text-sm py-2 px-3 sm:py-3 sm:px-6">SISWA SISWI ↓</NeoButton>
          </a>
          <a href="#board" onClick={(e) => handleNavClick(e, 'board')}>
            <NeoButton color="white" className="text-xs sm:text-sm py-2 px-3 sm:py-3 sm:px-6">💬 TINGGALKAN PESAN</NeoButton>
          </a>
        </motion.div>
      </motion.div>
      
      <HeroShapes />
    </section>
  );
}
