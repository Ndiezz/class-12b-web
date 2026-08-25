/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Header from "./components/Header";
import Hero from "./components/Hero";
import MarqueeRibbon from "./components/MarqueeRibbon";
import Roster from "./components/Roster";
import Timetable from "./components/Timetable";
import MemoryWall from "./components/MemoryWall";
import ConfessionBoard from "./components/ConfessionBoard";
import Polls from "./components/Polls";
import Footer from "./components/Footer";

export default function App() {
  return (
    <div className="min-h-screen selection:bg-neo-pink selection:text-white pb-0 overflow-x-hidden max-w-[100vw]">
      <Header />
      <main className="overflow-x-hidden">
        <Hero />
        <MarqueeRibbon />
        <Roster />
        <ConfessionBoard />
        <MemoryWall />
        <Timetable />
        <Polls />
      </main>
      <Footer />
    </div>
  );
}

