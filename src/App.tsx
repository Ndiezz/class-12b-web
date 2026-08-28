import { useState } from "react";
import Header from "./components/Header";
import Hero from "./components/Hero";
import MarqueeRibbon from "./components/MarqueeRibbon";
import Roster from "./components/Roster";
import Timetable from "./components/Timetable";
import MemoryWall from "./components/MemoryWall";
import ConfessionBoard from "./components/ConfessionBoard";
import Polls from "./components/Polls";
import Countdown from "./components/Countdown";
import TimeCapsule from "./components/TimeCapsule";
import Footer from "./components/Footer";
import BackgroundEffects from "./components/BackgroundEffects";
import MusicPlayer from "./components/MusicPlayer";
import { Toaster } from 'react-hot-toast';
import { FadeIn } from "./components/ui/FadeIn";

export default function App() {
  return (
    <div className="min-h-screen selection:bg-neo-pink selection:text-white pb-0 overflow-x-hidden max-w-[100vw] relative">
      <Toaster position="top-center" toastOptions={{
        style: {
          border: '2px solid black',
          padding: '16px',
          color: 'black',
          boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)',
          borderRadius: '0px',
          fontWeight: 'bold',
          fontFamily: 'var(--font-display)',
        },
      }} />
      <BackgroundEffects />
      <Header />
      
      <main className="overflow-x-hidden relative z-10">
        <Hero />
        <MarqueeRibbon />
        
        <div className="font-like-span">
          <FadeIn><Countdown /></FadeIn>
          <FadeIn><Roster /></FadeIn>
          <FadeIn><ConfessionBoard /></FadeIn>
          <FadeIn><MemoryWall /></FadeIn>
          <FadeIn><Timetable /></FadeIn>
          <FadeIn><Polls /></FadeIn>
          <FadeIn><TimeCapsule /></FadeIn>
        </div>
      </main>
      
      <Footer />
      <MusicPlayer />
    </div>
  );
}
