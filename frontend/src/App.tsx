import { useRef } from 'react';
import { useVideoScrub } from './hooks/useVideoScrub';
import { Navbar } from './components/Navbar';
import { Section1 } from './components/Section1';
import { Section2 } from './components/Section2';
import { Section3 } from './components/Section3';

const VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260821_114821_a8ca298f-be2c-4613-a4dd-51b69e16bbde.mp4';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { videoRef, canvasRef, scrollProgress, canvasLive } = useVideoScrub(
    VIDEO_URL,
    containerRef
  );

  const p = scrollProgress;

  // s1Opacity:
  // p < 0.20 → 1
  // else → max(0, 1 - (p - 0.20) / 0.08)
  const s1Opacity = p < 0.20 ? 1 : Math.max(0, 1 - (p - 0.20) / 0.08);

  // s2Opacity:
  // p < 0.32 → 0
  // p < 0.40 → (p - 0.32) / 0.08
  // p < 0.55 → 1
  // else → max(0, 1 - (p - 0.55) / 0.08)
  const s2Opacity =
    p < 0.32
      ? 0
      : p < 0.40
      ? (p - 0.32) / 0.08
      : p < 0.55
      ? 1
      : Math.max(0, 1 - (p - 0.55) / 0.08);

  // s3Opacity:
  // p < 0.67 → 0
  // p < 0.75 → (p - 0.67) / 0.08
  // else → 1
  const s3Opacity =
    p < 0.67
      ? 0
      : p < 0.75
      ? (p - 0.67) / 0.08
      : 1;

  return (
    <div ref={containerRef} className="relative h-[500vh]">
      <div className="sticky top-0 w-full h-screen overflow-hidden">
        {/* 1) Video full cover */}
        <video
          ref={videoRef}
          src={VIDEO_URL}
          muted
          playsInline
          preload="auto"
          className="w-full h-full object-cover"
        />

        {/* 2) Canvas 1920x1080 full cover */}
        <canvas
          ref={canvasRef}
          width={1920}
          height={1080}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            canvasLive ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* 3) Overlay containing Navbar + 3 sequential sections */}
        <div className="absolute inset-0 pointer-events-none">
          <Navbar scrollProgress={p} />
          <Section1 opacity={s1Opacity} />
          <Section2 opacity={s2Opacity} />
          <Section3 opacity={s3Opacity} />
        </div>
      </div>
    </div>
  );
}
