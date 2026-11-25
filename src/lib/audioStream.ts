import Hls from "hls.js";

export interface ResolvedAudioStream {
  streamUrl: string;
  streamType: "progressive" | "hls";
  duration: number;
  isFullTrack: boolean;
  fallbackPreviewUrl?: string;
  resolvedAt: number;
}

const STREAM_TTL_MS = 20 * 60 * 1000; // 20 minutes cache TTL for signed CDN URLs
const streamCache = new Map<string, ResolvedAudioStream>();
const inflightRequests = new Map<string, Promise<ResolvedAudioStream | null>>();
const activeHlsMap = new WeakMap<HTMLAudioElement, Hls>();

function getCacheKey(title: string, artist: string): string {
  return `${title.trim()} - ${artist.trim()}`.toLowerCase();
}

export function getCachedSongStream(
  title: string,
  artist: string
): ResolvedAudioStream | null {
  const key = getCacheKey(title, artist);
  const cached = streamCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.resolvedAt > STREAM_TTL_MS) {
    streamCache.delete(key);
    return null;
  }
  return cached;
}

export async function resolveSongStream(
  title: string,
  artist: string,
  previewUrl?: string,
  targetDurationSec?: number
): Promise<ResolvedAudioStream | null> {
  const cached = getCachedSongStream(title, artist);
  if (cached) return cached;

  const key = getCacheKey(title, artist);
  if (inflightRequests.has(key)) {
    return inflightRequests.get(key)!;
  }

  const promise = (async (): Promise<ResolvedAudioStream | null> => {
    const query = `${title} ${artist}`.trim();
    let fallbackUrl = previewUrl;

    // 1. Try server-side ad-free full-track audio resolver (/api/audio-resolve)
    try {
      const base = (import.meta as any).env?.BASE_URL || "/";
      const apiPath = `${
        base.endsWith("/") ? base : base + "/"
      }api/audio-resolve?q=${encodeURIComponent(query)}&duration=${
        targetDurationSec || 0
      }`;
      const res = await fetch(apiPath);
      if (res.ok) {
        const data = await res.json();
        if (data?.streamUrl) {
          const result: ResolvedAudioStream = {
            streamUrl: data.streamUrl,
            streamType: data.streamType === "progressive" ? "progressive" : "hls",
            duration: data.duration || targetDurationSec || 210,
            isFullTrack: true,
            fallbackPreviewUrl: fallbackUrl,
            resolvedAt: Date.now(),
          };
          streamCache.set(key, result);
          return result;
        }
      }
    } catch {
      // Fall through to iTunes fallback
    }

    // 2. Fallback to direct iTunes M4A preview if full stream isn't reachable
    if (!fallbackUrl) {
      try {
        const res = await fetch(
          `https://itunes.apple.com/search?term=${encodeURIComponent(
            query
          )}&entity=song&limit=1`
        );
        if (res.ok) {
          const data = await res.json();
          fallbackUrl = data?.results?.[0]?.previewUrl;
        }
      } catch {
        // Ignore network errors
      }
    }

    if (fallbackUrl) {
      const result: ResolvedAudioStream = {
        streamUrl: fallbackUrl,
        streamType: "progressive",
        duration: 30,
        isFullTrack: false,
        fallbackPreviewUrl: fallbackUrl,
        resolvedAt: Date.now(),
      };
      streamCache.set(key, result);
      return result;
    }

    return null;
  })();

  inflightRequests.set(key, promise);
  try {
    return await promise;
  } finally {
    inflightRequests.delete(key);
  }
}

export function preloadSongStream(
  title: string,
  artist: string,
  previewUrl?: string,
  targetDurationSec?: number
): void {
  if (!title) return;
  if (getCachedSongStream(title, artist)) return;
  void resolveSongStream(title, artist, previewUrl, targetDurationSec);
}

export function detachAudioStream(audio: HTMLAudioElement | null): void {
  if (!audio) return;
  const existingHls = activeHlsMap.get(audio);
  if (existingHls) {
    try {
      existingHls.destroy();
    } catch {}
    activeHlsMap.delete(audio);
  }
}

/**
 * Unlocks an HTMLAudioElement synchronously inside a user tap/click handler on mobile browsers.
 */
export function unlockAudioOnGesture(audio: HTMLAudioElement): void {
  try {
    audio.muted = false;
    if (!audio.src) {
      // Tiny silent WAV data URI to unlock mobile audio context synchronously on tap
      audio.src =
        "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
    }
    const p = audio.play();
    if (p && typeof p.catch === "function") {
      p.catch(() => {});
    }
  } catch {
    // Ignore synchronous unlock errors
  }
}

interface PlayStreamOptions {
  audio: HTMLAudioElement;
  stream: ResolvedAudioStream;
  startTime?: number;
  volume?: number;
  muted?: boolean;
  autoPlay?: boolean;
  onReady?: (duration: number, isFullTrack: boolean) => void;
  onPlayStateChange?: (playing: boolean) => void;
  onError?: () => void;
}

export function playResolvedStream({
  audio,
  stream,
  startTime = 0,
  volume = 0.9,
  muted = false,
  autoPlay = true,
  onReady,
  onPlayStateChange,
  onError,
}: PlayStreamOptions): () => void {
  let cancelled = false;
  detachAudioStream(audio);

  audio.volume = volume;
  audio.muted = muted;

  const fallbackToPreview = () => {
    if (cancelled) return;
    if (stream.fallbackPreviewUrl && stream.streamUrl !== stream.fallbackPreviewUrl) {
      detachAudioStream(audio);
      audio.src = stream.fallbackPreviewUrl;
      audio.onloadedmetadata = () => {
        if (cancelled) return;
        const dur = audio.duration && isFinite(audio.duration) ? audio.duration : 30;
        const safeStart = Math.min(startTime, Math.max(0, dur - 2));
        audio.currentTime = safeStart;
        onReady?.(dur, false);
        if (autoPlay) {
          audio
            .play()
            .then(() => {
              if (!cancelled) onPlayStateChange?.(true);
            })
            .catch(() => {
              if (!cancelled) onPlayStateChange?.(false);
            });
        }
      };
      audio.load();
    } else {
      onError?.();
    }
  };

  if (stream.streamType === "hls") {
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        startPosition: startTime > 0 ? startTime : -1,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
      });
      activeHlsMap.set(audio, hls);

      hls.loadSource(stream.streamUrl);
      hls.attachMedia(audio);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (cancelled) return;
        if (startTime > 0) {
          try {
            audio.currentTime = startTime;
          } catch {}
        }
        onReady?.(stream.duration || 210, stream.isFullTrack);
        if (autoPlay) {
          audio
            .play()
            .then(() => {
              if (!cancelled) onPlayStateChange?.(true);
            })
            .catch(() => {
              if (!cancelled) onPlayStateChange?.(false);
            });
        }
      });

      audio.onloadedmetadata = () => {
        if (cancelled) return;
        const dur =
          audio.duration && isFinite(audio.duration) && audio.duration > 0
            ? audio.duration
            : stream.duration || 210;
        onReady?.(dur, stream.isFullTrack);
      };

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (cancelled) return;
        if (data.fatal) {
          fallbackToPreview();
        }
      });

      return () => {
        cancelled = true;
        detachAudioStream(audio);
      };
    } else if (
      audio.canPlayType("application/vnd.apple.mpegurl") ||
      audio.canPlayType("audio/mpegurl")
    ) {
      // Native HLS playback on iOS Safari / macOS Safari
      audio.src = stream.streamUrl;
      audio.onloadedmetadata = () => {
        if (cancelled) return;
        const dur =
          audio.duration && isFinite(audio.duration) && audio.duration > 0
            ? audio.duration
            : stream.duration || 210;
        const safeStart = Math.min(startTime, Math.max(0, dur - 2));
        try {
          audio.currentTime = safeStart;
        } catch {}
        onReady?.(dur, stream.isFullTrack);
        if (autoPlay) {
          audio
            .play()
            .then(() => {
              if (!cancelled) onPlayStateChange?.(true);
            })
            .catch(() => {
              if (!cancelled) onPlayStateChange?.(false);
            });
        }
      };
      audio.onerror = () => {
        fallbackToPreview();
      };
      audio.load();

      return () => {
        cancelled = true;
      };
    }
  }

  // Progressive MP3 / M4A stream playback
  audio.src = stream.streamUrl;
  audio.onloadedmetadata = () => {
    if (cancelled) return;
    const dur =
      audio.duration && isFinite(audio.duration) && audio.duration > 0
        ? audio.duration
        : stream.duration || 30;
    const safeStart = Math.min(startTime, Math.max(0, dur - 2));
    try {
      audio.currentTime = safeStart;
    } catch {}
    onReady?.(dur, stream.isFullTrack);
    if (autoPlay) {
      audio
        .play()
        .then(() => {
          if (!cancelled) onPlayStateChange?.(true);
        })
        .catch(() => {
          if (!cancelled) onPlayStateChange?.(false);
        });
    }
  };
  audio.onerror = () => {
    fallbackToPreview();
  };
  audio.load();

  return () => {
    cancelled = true;
  };
}
