import { useEffect, useRef, useState } from 'react';
import * as MP4BoxModule from 'mp4box';

const MP4Box = (MP4BoxModule as any).default || MP4BoxModule;

const LERP_TAU = 8;
const SNAP = 0.002;
const LRU_MAX = 24;
const LEAD = 24;
const WATCHDOG = 60000;

interface FrameItem {
  ts: number; // in microseconds
  blob: Blob;
}

export function useVideoScrub(videoSrc: string, containerRef: React.RefObject<HTMLElement>) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const bankRef = useRef<FrameItem[]>([]);
  const lruRef = useRef<Map<number, ImageBitmap | null>>(new Map());
  const lruOrderRef = useRef<number[]>([]);
  const loadingBitmapsRef = useRef<Set<number>>(new Set());

  const currentRef = useRef<number>(0);
  const targetRef = useRef<number>(0);
  const durRef = useRef<number>(0);

  const readyRef = useRef<boolean>(false);
  const revertedRef = useRef<boolean>(false);
  const paintedRef = useRef<boolean>(false);
  const buildingRef = useRef<boolean>(false);

  const [canvasLive, setCanvasLive] = useState<boolean>(false);
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);

  // Helper to extract codec description
  function getTrackDescription(track: any): Uint8Array | undefined {
    try {
      if (!track?.mdia?.minf?.stbl?.stsd?.entries) return undefined;
      for (const entry of track.mdia.minf.stbl.stsd.entries) {
        const box = entry.avcC || entry.hvcC || entry.vpcC || entry.av1C;
        if (box) {
          const stream = new MP4Box.DataStream(undefined, 0, MP4Box.DataStream.BIG_ENDIAN);
          box.write(stream);
          return new Uint8Array(stream.buffer, 8); // strip box header
        }
      }
    } catch (e) {
      console.warn('Error reading track description box:', e);
    }
    return undefined;
  }

  // Binary search on timestamps
  function findNearestIndex(bank: FrameItem[], targetUs: number): number {
    let low = 0;
    let high = bank.length - 1;
    if (high < 0) return -1;
    while (low <= high) {
      const mid = (low + high) >> 1;
      if (bank[mid].ts < targetUs) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    if (low >= bank.length) return bank.length - 1;
    if (high < 0) return 0;
    return Math.abs(bank[low].ts - targetUs) < Math.abs(bank[high].ts - targetUs) ? low : high;
  }

  // LRU warming
  function warmLRU(bank: FrameItem[], index: number) {
    const start = Math.max(0, index - 1);
    const end = Math.min(bank.length - 1, index + 2);
    for (let i = start; i <= end; i++) {
      if (!lruRef.current.has(i) && !loadingBitmapsRef.current.has(i) && bank[i]) {
        loadingBitmapsRef.current.add(i);
        createImageBitmap(bank[i].blob)
          .then((bitmap) => {
            loadingBitmapsRef.current.delete(i);
            lruRef.current.set(i, bitmap);
            lruOrderRef.current.push(i);
            while (lruRef.current.size > LRU_MAX) {
              const oldest = lruOrderRef.current.shift();
              if (oldest !== undefined && oldest !== index) {
                const oldBm = lruRef.current.get(oldest);
                if (oldBm) oldBm.close?.();
                lruRef.current.delete(oldest);
              }
            }
          })
          .catch(() => {
            loadingBitmapsRef.current.delete(i);
          });
      }
    }
  }

  // Compute scroll progress p
  const getProgress = (): number => {
    if (!containerRef.current) return 0;
    const container = containerRef.current;
    const scrollY = window.scrollY || window.pageYOffset || 0;
    const totalScroll = container.offsetHeight - window.innerHeight;
    if (totalScroll <= 0) return 0;
    return Math.max(0, Math.min(1, scrollY / totalScroll));
  };

  // Video duration listener
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      if (video.duration && !isNaN(video.duration)) {
        durRef.current = video.duration;
        setDuration(video.duration);
      }
    };

    if (video.readyState >= 1 && video.duration) {
      handleLoadedMetadata();
    } else {
      video.addEventListener('loadedmetadata', handleLoadedMetadata);
    }

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, []);

  // Frame Bank construction via MP4Box & WebCodecs
  useEffect(() => {
    let watchdogTimer: any = null;
    let decoder: VideoDecoder | null = null;
    let cancelled = false;

    async function buildFrameBank(accel: 'prefer-hardware' | 'prefer-software' = 'prefer-hardware') {
      if (
        typeof VideoDecoder === 'undefined' ||
        typeof window === 'undefined' ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ) {
        return;
      }

      buildingRef.current = true;

      watchdogTimer = setTimeout(() => {
        if (!paintedRef.current && !cancelled) {
          console.warn('Watchdog expired, reverting to video element fallback.');
          revertedRef.current = true;
          setCanvasLive(false);
        }
      }, WATCHDOG);

      try {
        const res = await fetch(videoSrc, { mode: 'cors' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const arrayBuffer = await res.arrayBuffer();
        if (cancelled) return;

        const mp4boxfile = MP4Box.createFile();
        let videoTrack: any = null;
        const offscreen = typeof OffscreenCanvas !== 'undefined'
          ? new OffscreenCanvas(1920, 1080)
          : document.createElement('canvas');

        if (!(offscreen instanceof OffscreenCanvas)) {
          offscreen.width = 1920;
          offscreen.height = 1080;
        }

        const offCtx = offscreen.getContext('2d') as (OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null);
        const sampleQueue: any[] = [];
        let decodingDone = false;
        let pendingBlobCount = 0;

        mp4boxfile.onReady = (info: any) => {
          if (cancelled) return;
          videoTrack = info.videoTracks[0];
          if (!videoTrack) throw new Error('No video track found in MP4');

          if (info.duration && info.timescale && durRef.current === 0) {
            const calculatedDur = info.duration / info.timescale;
            durRef.current = calculatedDur;
            setDuration(calculatedDur);
          }

          if (videoTrack.track_width && videoTrack.track_height) {
            offscreen.width = videoTrack.track_width;
            offscreen.height = videoTrack.track_height;
            if (canvasRef.current) {
              canvasRef.current.width = videoTrack.track_width;
              canvasRef.current.height = videoTrack.track_height;
            }
          }

          const description = getTrackDescription(videoTrack);

          decoder = new VideoDecoder({
            output: async (frame: VideoFrame) => {
              if (cancelled) {
                frame.close();
                return;
              }
              pendingBlobCount++;
              const ts = frame.timestamp;
              try {
                if (offCtx) {
                  offCtx.drawImage(frame, 0, 0, offscreen.width, offscreen.height);
                  let blob: Blob | null = null;
                  if ('convertToBlob' in offscreen) {
                    blob = await (offscreen as OffscreenCanvas).convertToBlob({
                      type: 'image/webp',
                      quality: 0.82,
                    });
                  } else {
                    blob = await new Promise<Blob | null>((resolve) => {
                      (offscreen as HTMLCanvasElement).toBlob(resolve, 'image/webp', 0.82);
                    });
                  }
                  if (blob && !cancelled) {
                    bankRef.current.push({ ts, blob });
                  }
                }
              } catch (e) {
                console.warn('Frame conversion error', e);
              } finally {
                frame.close();
                pendingBlobCount--;
                processSamples();
              }
            },
            error: (e) => {
              console.warn('VideoDecoder error', e);
              if (accel === 'prefer-hardware' && !cancelled) {
                try {
                  decoder?.close();
                } catch {
                  // ignore
                }
                buildFrameBank('prefer-software');
              } else {
                revertedRef.current = true;
              }
            },
          });

          decoder.configure({
            codec: videoTrack.codec.startsWith('vp08') ? 'vp8' : videoTrack.codec,
            description,
            hardwareAcceleration: accel,
          });

          mp4boxfile.setExtractionOptions(videoTrack.id, null, { nbSamples: 1000 });
          mp4boxfile.start();
        };

        const processSamples = () => {
          if (cancelled || !decoder || decoder.state !== 'configured') return;
          while (sampleQueue.length > 0 && decoder.decodeQueueSize < LEAD) {
            const sample = sampleQueue.shift();
            if (sample) {
              const chunk = new EncodedVideoChunk({
                type: sample.is_sync ? 'key' : 'delta',
                timestamp: (sample.cts * 1e6) / sample.timescale,
                duration: (sample.duration * 1e6) / sample.timescale,
                data: sample.data,
              });
              decoder.decode(chunk);
            }
          }

          if (sampleQueue.length === 0 && decodingDone && pendingBlobCount === 0) {
            bankRef.current.sort((a, b) => a.ts - b.ts);
            readyRef.current = true;
            if (watchdogTimer) clearTimeout(watchdogTimer);
          }
        };

        mp4boxfile.onSamples = (_id: number, _user: any, samples: any[]) => {
          if (cancelled) return;
          for (const sample of samples) {
            sampleQueue.push(sample);
          }
          processSamples();
        };

        const buffer = arrayBuffer as any;
        buffer.fileStart = 0;
        mp4boxfile.appendBuffer(buffer);
        mp4boxfile.flush();
        decodingDone = true;
        processSamples();
      } catch (err) {
        console.warn('WebCodecs frame extraction failed, using fallback seeking:', err);
        if (accel === 'prefer-hardware' && !cancelled) {
          buildFrameBank('prefer-software');
        } else {
          revertedRef.current = true;
        }
      }
    }

    // Build after window load or mount
    if (document.readyState === 'complete') {
      buildFrameBank('prefer-hardware');
    } else {
      const handleLoad = () => buildFrameBank('prefer-hardware');
      window.addEventListener('load', handleLoad);
      return () => {
        cancelled = true;
        window.removeEventListener('load', handleLoad);
        if (watchdogTimer) clearTimeout(watchdogTimer);
        try {
          decoder?.close();
        } catch {
          // ignore
        }
      };
    }

    return () => {
      cancelled = true;
      if (watchdogTimer) clearTimeout(watchdogTimer);
      try {
        decoder?.close();
      } catch {
        // ignore
      }
    };
  }, [videoSrc]);

  // Main rAF loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const renderLoop = (now: number) => {
      const deltaSeconds = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(0.1, deltaSeconds);

      const p = getProgress();
      setScrollProgress(p);

      const dur = durRef.current;
      if (dur > 0) {
        const target = p * dur;
        targetRef.current = target;

        if (prefersReducedMotion) {
          currentRef.current = target;
        } else {
          currentRef.current += (target - currentRef.current) * (1 - Math.exp(-dt * LERP_TAU));
          if (Math.abs(target - currentRef.current) < SNAP) {
            currentRef.current = target;
          }
        }

        const current = currentRef.current;

        // Ready and bank available: draw to canvas
        if (readyRef.current && bankRef.current.length > 0 && !revertedRef.current) {
          const nearestIdx = findNearestIndex(bankRef.current, current * 1e6);
          if (nearestIdx >= 0) {
            warmLRU(bankRef.current, nearestIdx);
            const bitmap = lruRef.current.get(nearestIdx);
            if (bitmap && canvasRef.current) {
              const ctx = canvasRef.current.getContext('2d');
              if (ctx) {
                ctx.drawImage(bitmap, 0, 0, canvasRef.current.width, canvasRef.current.height);
                if (!paintedRef.current) {
                  paintedRef.current = true;
                  setCanvasLive(true);
                }
              }
            }
          }
        } else {
          // Fallback: video seeking
          const video = videoRef.current;
          if (video && !video.seeking && Math.abs(video.currentTime - current) > 0.01) {
            video.currentTime = Math.min(dur, Math.max(0, current));
          }
        }
      }

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);

    const handleResize = () => {
      const p = getProgress();
      setScrollProgress(p);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return {
    videoRef,
    canvasRef,
    scrollProgress,
    canvasLive,
    duration,
  };
}
