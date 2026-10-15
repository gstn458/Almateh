import { useEffect, useRef } from "react";
import Hls from "hls.js";

type HlsVideoProps = {
  src: string;
  className?: string;
};

/** Muted, looping background video that streams an HLS (.m3u8) source. */
export default function HlsVideo({ src, className = "" }: HlsVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    const play = () => {
      video.play().catch(() => {
        // Autoplay can be blocked (e.g. low-power mode); the poster area just stays dark.
      });
    };

    let hls: Hls | null = null;

    if (Hls.isSupported()) {
      hls = new Hls({ capLevelToPlayerSize: true });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, play);
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      video.addEventListener("loadedmetadata", play, { once: true });
    }

    return () => {
      if (hls) {
        hls.destroy();
      } else {
        video.removeEventListener("loadedmetadata", play);
        video.removeAttribute("src");
        video.load();
      }
    };
  }, [src]);

  return (
    <video
      ref={videoRef}
      className={`absolute left-1/2 top-1/2 min-h-full min-w-full -translate-x-1/2 -translate-y-1/2 object-cover ${className}`}
      autoPlay
      muted
      loop
      playsInline
      aria-hidden="true"
    />
  );
}
