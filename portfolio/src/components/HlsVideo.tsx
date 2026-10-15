import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";

type HlsVideoProps = {
  src: string;
  className?: string;
  /** Wait until the video is near the viewport before loading anything. */
  lazy?: boolean;
};

/**
 * Muted, looping background video that streams an HLS (.m3u8) source. hls.js is
 * loaded on demand so it never delays the first paint, and the video stays
 * paused for visitors who prefer reduced motion.
 */
export default function HlsVideo({ src, className = "", lazy = false }: HlsVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const [inView, setInView] = useState(!lazy);

  useEffect(() => {
    if (inView) return;
    const video = videoRef.current;
    if (!video) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [inView]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !inView || reducedMotion) return;

    video.muted = true;
    let cancelled = false;
    let destroy = () => {};
    const play = () => {
      video.play().catch(() => {
        // Autoplay can be blocked (e.g. low-power mode); the area just stays dark.
      });
    };

    import("hls.js").then(({ default: Hls }) => {
      if (cancelled) return;
      if (Hls.isSupported()) {
        const hls = new Hls({ capLevelToPlayerSize: true });
        hls.loadSource(src);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, play);
        destroy = () => hls.destroy();
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = src;
        video.addEventListener("loadedmetadata", play, { once: true });
        destroy = () => {
          video.removeEventListener("loadedmetadata", play);
          video.removeAttribute("src");
          video.load();
        };
      }
    });

    return () => {
      cancelled = true;
      destroy();
    };
  }, [src, inView, reducedMotion]);

  return (
    <video
      ref={videoRef}
      className={`absolute left-1/2 top-1/2 min-h-full min-w-full -translate-x-1/2 -translate-y-1/2 object-cover ${className}`}
      muted
      loop
      playsInline
      preload="none"
      aria-hidden="true"
      tabIndex={-1}
    />
  );
}
