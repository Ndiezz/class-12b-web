import React, { useEffect, useRef, useState } from 'react';

export type EqualizerMode = 'bars' | 'wave' | 'mirror';

interface AudioEqualizerProps {
  isPlaying: boolean;
  isMuted?: boolean;
  audioElement?: HTMLAudioElement | null;
  currentTime?: number;
  trackSeed?: number;
  variant?: 'full' | 'mini';
  className?: string;
}

// WeakMap so we never call createMediaElementSource twice on the same HTMLAudioElement
const connectedElements = new WeakMap<
  HTMLAudioElement,
  { ctx: AudioContext; analyser: AnalyserNode }
>();

export const AudioEqualizer: React.FC<AudioEqualizerProps> = ({
  isPlaying,
  isMuted = false,
  audioElement = null,
  currentTime = 0,
  trackSeed = 0,
  variant = 'full',
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mode, setMode] = useState<EqualizerMode>('bars');
  const [rmsLevel, setRmsLevel] = useState<number>(0);

  const smoothBarsRef = useRef<number[]>(new Array(24).fill(0));
  const peakCapsRef = useRef<number[]>(new Array(24).fill(0));
  const peakVelRef = useRef<number[]>(new Array(24).fill(0));
  const currentTimeRef = useRef<number>(currentTime);
  const isPlayingRef = useRef<boolean>(isPlaying);
  const isMutedRef = useRef<boolean>(isMuted);
  const modeRef = useRef<EqualizerMode>(mode);
  const trackSeedRef = useRef<number>(trackSeed);

  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    trackSeedRef.current = trackSeed;
  }, [trackSeed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let analyser: AnalyserNode | null = null;
    let freqData: Uint8Array | null = null;

    // Attempt to hook into real Web Audio API AnalyserNode if HTMLAudioElement is active
    if (audioElement && audioElement.src) {
      try {
        let nodeBundle = connectedElements.get(audioElement);
        if (!nodeBundle) {
          const AudioCtx =
            window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          if (AudioCtx) {
            const audioCtx = new AudioCtx();
            const newAnalyser = audioCtx.createAnalyser();
            newAnalyser.fftSize = 64;
            newAnalyser.smoothingTimeConstant = 0.78;
            const source = audioCtx.createMediaElementSource(audioElement);
            source.connect(newAnalyser);
            newAnalyser.connect(audioCtx.destination);
            nodeBundle = { ctx: audioCtx, analyser: newAnalyser };
            connectedElements.set(audioElement, nodeBundle);
          }
        }
        if (nodeBundle) {
          if (nodeBundle.ctx.state === 'suspended' && isPlaying) {
            nodeBundle.ctx.resume().catch(() => {});
          }
          analyser = nodeBundle.analyser;
          freqData = new Uint8Array(analyser.frequencyBinCount);
        }
      } catch {
        // Fallback to synthesized acoustic telemetry if CORS or iframe prevents MediaElementSource
        analyser = null;
      }
    }

    const numBars = variant === 'mini' ? 5 : 24;
    if (smoothBarsRef.current.length !== numBars) {
      smoothBarsRef.current = new Array(numBars).fill(0);
      peakCapsRef.current = new Array(numBars).fill(0);
      peakVelRef.current = new Array(numBars).fill(0);
    }

    let lastRmsUpdate = 0;

    const render = (timestamp: number) => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const width = rect.width || (variant === 'mini' ? 20 : 256);
      const height = rect.height || (variant === 'mini' ? 16 : 44);

      if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const active = isPlayingRef.current && !isMutedRef.current;
      const t = timestamp * 0.001;
      const seed = trackSeedRef.current + 1;

      // Determine target amplitude for each frequency band (0..1)
      let realAudioActive = false;
      if (active && analyser && freqData) {
        analyser.getByteFrequencyData(freqData);
        const sum = freqData.reduce((acc, v) => acc + v, 0);
        if (sum > 0) {
          realAudioActive = true;
        }
      }

      let frameEnergySum = 0;

      for (let i = 0; i < numBars; i++) {
        let target = 0;

        if (active) {
          if (realAudioActive && freqData) {
            const binIndex = Math.min(
              freqData.length - 1,
              Math.floor((i / numBars) * (freqData.length * 0.75))
            );
            target = (freqData[binIndex] / 255) * 0.95;
          } else {
            // Dynamic acoustic model driven by track tempo, sub-bass kick pulse, vocal mids, and high-hat transients
            const normFreq = i / Math.max(1, numBars - 1); // 0 = sub-bass, 0.5 = mids, 1 = air/treble
            const bpm = 112 + ((seed * 17) % 28); // Track-specific BPM (112 - 140)
            const beatPhase = (t * (bpm / 60)) % 1;

            // Kick drum transient on beat
            const kickPulse = Math.pow(Math.max(0, 1 - beatPhase * 3.2), 2.4);
            // Snare / clap on off-beat
            const snarePhase = (beatPhase + 0.5) % 1;
            const snarePulse = Math.pow(Math.max(0, 1 - snarePhase * 4.0), 2.8);

            // Frequency-specific weighting
            const bassWeight = Math.exp(-normFreq * 3.2);
            const midWeight = Math.exp(-Math.pow((normFreq - 0.42) * 3.1, 2));
            const highWeight = Math.pow(normFreq, 1.4) * 0.75;

            // Harmonic vocal & melodic waves
            const harmonicA =
              0.5 +
              0.5 *
                Math.sin(
                  t * (3.8 + seed * 0.4) + i * 0.45 + Math.cos(t * 1.7 + i * 0.2)
                );
            const harmonicB =
              0.5 +
              0.5 *
                Math.sin(t * 7.2 - i * 0.65 + seed * 1.3);
            const microJitter =
              0.5 + 0.5 * Math.sin(t * 19.5 + i * 2.1);

            // Song phrase envelope so energy breathes naturally
            const phraseEnvelope =
              0.68 + 0.32 * Math.sin(t * 0.65 + seed + currentTimeRef.current * 0.12);

            const rawBand =
              bassWeight * (0.35 + kickPulse * 0.65) +
              midWeight * (0.25 + harmonicA * 0.45 + snarePulse * 0.3) +
              highWeight * (0.15 + harmonicB * 0.4 + microJitter * 0.35);

            target = Math.min(0.98, Math.max(0.08, rawBand * phraseEnvelope));
          }
        } else {
          // Idle breathing baseline when paused
          target = variant === 'mini' ? 0.15 : 0.06;
        }

        // Smooth attack & release physics
        const prev = smoothBarsRef.current[i] || 0;
        const smoothing = target > prev ? 0.36 : 0.14; // Fast attack, musical release
        const next = prev + (target - prev) * smoothing;
        smoothBarsRef.current[i] = next;
        frameEnergySum += next;

        // Peak-hold cap physics
        if (next >= peakCapsRef.current[i]) {
          peakCapsRef.current[i] = next;
          peakVelRef.current[i] = 0;
        } else {
          peakVelRef.current[i] += 0.0018;
          peakCapsRef.current[i] = Math.max(next, peakCapsRef.current[i] - peakVelRef.current[i]);
        }
      }

      const avgRms = frameEnergySum / numBars;
      if (timestamp - lastRmsUpdate > 90) {
        setRmsLevel(active ? Math.round(avgRms * 100) : 0);
        lastRmsUpdate = timestamp;
      }

      // Draw Mini Variant (used in minimized button or compact badges)
      if (variant === 'mini') {
        const gap = 2;
        const barWidth = (width - gap * (numBars - 1)) / numBars;
        for (let i = 0; i < numBars; i++) {
          const val = smoothBarsRef.current[i];
          const barH = Math.max(2, val * height);
          const x = i * (barWidth + gap);
          const y = (height - barH) / 2;

          ctx.fillStyle = active ? '#34d399' : '#71717a';
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barH, 1.5);
          ctx.fill();
        }
        ctx.restore();
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      // Full Equalizer Modes
      const currentMode = modeRef.current;

      // Subtle background grid lines for studio monitor feel
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      for (let g = 1; g <= 2; g++) {
        const gy = Math.round((height / 3) * g) + 0.5;
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(width, gy);
        ctx.stroke();
      }

      if (currentMode === 'bars') {
        const gap = 3;
        const barWidth = (width - gap * (numBars - 1)) / numBars;

        const grad = ctx.createLinearGradient(0, height, 0, 0);
        grad.addColorStop(0, '#10b981'); // emerald-500
        grad.addColorStop(0.6, '#34d399'); // emerald-400
        grad.addColorStop(1, '#a7f3d0'); // emerald-200

        for (let i = 0; i < numBars; i++) {
          const val = smoothBarsRef.current[i];
          const barH = Math.max(3, val * (height - 6));
          const x = i * (barWidth + gap);
          const y = height - barH;

          ctx.fillStyle = active ? grad : 'rgba(255, 255, 255, 0.14)';
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barH, [2, 2, 0, 0]);
          ctx.fill();

          // Floating peak-hold cap
          if (active) {
            const capY = Math.max(1, height - peakCapsRef.current[i] * (height - 6) - 2.5);
            ctx.fillStyle = peakCapsRef.current[i] > 0.78 ? '#fde047' : '#6ee7b7';
            ctx.fillRect(x, capY, barWidth, 1.8);
          }
        }
      } else if (currentMode === 'mirror') {
        const gap = 3;
        const barWidth = (width - gap * (numBars - 1)) / numBars;
        const centerY = height / 2;

        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#6ee7b7');
        grad.addColorStop(0.5, '#10b981');
        grad.addColorStop(1, '#6ee7b7');

        for (let i = 0; i < numBars; i++) {
          const val = smoothBarsRef.current[i];
          const barH = Math.max(3, val * (height - 4));
          const x = i * (barWidth + gap);
          const y = centerY - barH / 2;

          ctx.fillStyle = active ? grad : 'rgba(255, 255, 255, 0.14)';
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barH, 2);
          ctx.fill();
        }
      } else if (currentMode === 'wave') {
        const centerY = height / 2;

        // Secondary harmonic shadow wave
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        for (let i = 0; i < numBars; i++) {
          const x = (i / (numBars - 1)) * width;
          const amp = smoothBarsRef.current[i] * (height * 0.44);
          const waveY =
            centerY +
            Math.sin(t * 8 + i * 0.65) * amp * 0.75;
          if (i === 0) ctx.moveTo(x, waveY);
          else {
            const prevX = ((i - 1) / (numBars - 1)) * width;
            const cx = (prevX + x) / 2;
            ctx.quadraticCurveTo(prevX, waveY, cx, waveY);
          }
        }
        ctx.strokeStyle = active ? 'rgba(52, 211, 153, 0.35)' : 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Primary amplitude wave with glowing fill
        ctx.beginPath();
        const points: { x: number; y: number }[] = [];
        for (let i = 0; i < numBars; i++) {
          const x = (i / (numBars - 1)) * width;
          const sign = i % 2 === 0 ? 1 : -1;
          const amp = smoothBarsRef.current[i] * (height * 0.45);
          const y =
            centerY +
            sign * amp * Math.cos(t * 4.5 + i * 0.3);
          points.push({ x, y });
        }

        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          const xc = (points[i - 1].x + points[i].x) / 2;
          const yc = (points[i - 1].y + points[i].y) / 2;
          ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, xc, yc);
        }
        ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);

        ctx.strokeStyle = active ? '#34d399' : 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [audioElement, variant, isPlaying]);

  const cycleMode = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMode((prev) =>
      prev === 'bars' ? 'mirror' : prev === 'mirror' ? 'wave' : 'bars'
    );
  };

  if (variant === 'mini') {
    return (
      <canvas
        ref={canvasRef}
        className={`w-5 h-4 block ${className}`}
        aria-hidden="true"
      />
    );
  }

  return (
    <div
      onClick={cycleMode}
      title="Klik untuk ganti gaya visual equalizer (Bars / Mirror / Wave)"
      className={`group relative rounded-xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 px-2.5 pt-2 pb-1.5 cursor-pointer transition-colors select-none overflow-hidden ${className}`}
    >
      {/* Top telemetry bar */}
      <div className="flex items-center justify-between text-[9px] font-mono tracking-wider uppercase text-zinc-400 mb-1">
        <div className="flex items-center gap-1.5">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isPlaying && !isMuted
                ? 'bg-emerald-400 shadow-[0_0_6px_#34d399] animate-pulse'
                : 'bg-zinc-600'
            }`}
          />
          <span className="text-zinc-300 font-semibold">
            EQ • {mode.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-emerald-400/90 tabular-nums">
            {isPlaying && !isMuted ? `-${Math.max(1, 24 - Math.round(rmsLevel * 0.22))} dB` : 'IDLE'}
          </span>
          <span className="text-[8px] text-zinc-500 group-hover:text-zinc-300 transition-colors">
            MODE ↻
          </span>
        </div>
      </div>

      {/* Equalizer Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-9 block"
      />

      {/* Frequency Band Markers */}
      <div className="flex items-center justify-between text-[8px] font-mono text-zinc-500 mt-0.5 leading-none">
        <span>60Hz</span>
        <span>250Hz</span>
        <span>1kHz</span>
        <span>4kHz</span>
        <span>16kHz</span>
      </div>
    </div>
  );
};

export default AudioEqualizer;
