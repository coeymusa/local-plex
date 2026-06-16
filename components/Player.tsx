"use client";

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

export default function Player({
  id,
  src,
  mode,
  initialPosition,
}: {
  id: string;
  src: string;
  mode: "direct" | "hls";
  initialPosition: number;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const lastSent = useRef(0);
  const [ended, setEnded] = useState(false);

  // Funny gag: when a video finishes, the sad-face photo turns up.
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const onEnded = () => setEnded(true);
    const onPlay = () => setEnded(false);
    video.addEventListener("ended", onEnded);
    video.addEventListener("play", onPlay);
    return () => {
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("play", onPlay);
    };
  }, []);

  // Attach the source — native for direct play / Safari HLS, hls.js otherwise.
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    let hls: Hls | null = null;

    if (mode === "direct") {
      video.src = src;
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src; // Safari plays HLS natively
    } else if (Hls.isSupported()) {
      hls = new Hls({ maxBufferLength: 30 });
      hls.loadSource(src);
      hls.attachMedia(video);
    } else {
      video.src = src; // last resort
    }

    return () => {
      hls?.destroy();
    };
  }, [src, mode]);

  // Resume position + progress saving.
  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    function onLoaded() {
      const v = ref.current!;
      if (initialPosition > 0 && v.duration && initialPosition < v.duration * 0.97) {
        v.currentTime = initialPosition;
      }
    }

    function save() {
      const v = ref.current;
      if (!v || !v.duration) return;
      const body = JSON.stringify({ id, position: v.currentTime, duration: v.duration });
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/progress", new Blob([body], { type: "application/json" }));
      } else {
        fetch("/api/progress", { method: "POST", body, keepalive: true });
      }
    }

    function onTime() {
      const now = Date.now();
      if (now - lastSent.current > 5000) {
        lastSent.current = now;
        save();
      }
    }

    video.addEventListener("loadedmetadata", onLoaded);
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("pause", save);
    window.addEventListener("beforeunload", save);

    return () => {
      save();
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("pause", save);
      window.removeEventListener("beforeunload", save);
    };
  }, [id, initialPosition]);

  function watchAgain() {
    const v = ref.current;
    if (!v) return;
    v.currentTime = 0;
    v.play();
    setEnded(false);
  }

  return (
    <div className="relative">
      <video
        ref={ref}
        controls
        autoPlay
        playsInline
        className="aspect-video w-full bg-black"
      />
      {ended && (
        <div className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/julia/m2.jpeg" alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative px-6 text-center">
            <p className="text-2xl font-bold text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
              It&apos;s over.
            </p>
            <button
              onClick={watchAgain}
              className="mt-4 rounded-full bg-white px-5 py-2 text-sm font-semibold text-black active:scale-95"
            >
              Watch again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
