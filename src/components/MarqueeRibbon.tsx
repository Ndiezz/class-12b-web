import Marquee from "react-fast-marquee";
import { Star } from "lucide-react";

const ITEMS = ["BEST CLASS EVER", "CLASS OF 2025-2027", "ABSOLUTE CLASS", "TWELVE B", "KELAS PENGHARADNYA", "BEST CLASS EVER", "CLASS OF 2025-2027", "ABSOLUTE CLASS", "TWELVE B", "KELAS PENGHARADNYA"];

export default function MarqueeRibbon({ bg = "bg-neo-cyan" }: { bg?: string }) {
  return (
    <div className={`border-y-2 border-black ${bg} py-4 overflow-hidden`} data-testid="marquee-ribbon">
      <Marquee speed={40} gradient={false}>
        {ITEMS.map((item, index) => (
          <span key={index} className="flex items-center gap-6 mx-6 font-display font-bold uppercase tracking-wide text-lg md:text-xl whitespace-nowrap">
            {item}
            <Star size={20} strokeWidth={3} fill="#000" />
          </span>
        ))}
      </Marquee>
    </div>
  );
}
