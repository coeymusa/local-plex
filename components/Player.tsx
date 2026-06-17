"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Hls from "hls.js";

type Sub = { track: string; label: string; lang: string };

export default function Player({
  id,
  src,
  mode,
  initialPosition,
  subs = [],
  nextId = null,
}: {
  id: string;
  src: string;
  mode: "direct" | "hls";
  initialPosition: number;
  subs?: Sub[];
  nextId?: string | null;
}) {
  const router = useRouter();
  const ref = useRef<HTMLVideoElement>(null);
  const lastSent = useRef(0);
  const [ended, setEnded] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  // On finish: auto-advance to the next episode (countdown), else the sad photo.
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const onEnded = () => {
      if (nextId) setCountdown(8);
      else setEnded(true);
    };
    const onPlay = () => {
      setEnded(false);
      setCountdown(null);
    };
    video.addEventListener("ended", onEnded);
    video.addEventListener("play", onPlay);
    return () => {
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("play", onPlay);
    };
  }, [nextId]);

  // Next-episode countdown tick.
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      router.push(`/watch/${nextId}`);
      return;
    }
    const t = setTimeout(() => setCountdown((c) => (c === null ? null : c - 1)), 1000);
    return () => clearTimeout(t);
  }, [countdown, nextId, router]);

  // Attach the source — native for direct play / Safari HLS, hls.js otherwise.
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    let hls: Hls | null = null;
    if (mode === "direct") {
      video.src = src;
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
    } else if (Hls.isSupported()) {
      hls = new Hls({ maxBufferLength: 30 });
      hls.loadSource(src);
      hls.attachMedia(video);
    } else {
      video.src = src;
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
      <video ref={ref} controls autoPlay playsInline className="aspect-video w-full bg-black">
        {subs.map((s) => (
          <track
            key={s.track}
            kind="subtitles"
            src={`/api/subs/${id}/${s.track}`}
            srcLang={s.lang}
            label={s.label}
          />
        ))}
      </video>

      {/* Next-episode autoplay */}
      {countdown !== null && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/85">
          <div className="px-6 text-center">
            <p className="text-sm uppercase tracking-widest text-white/50">Up next</p>
            <p className="mt-2 text-lg text-white">Next episode in {countdown}…</p>
            <div className="mt-4 flex justify-center gap-3">
              <button
                onClick={() => router.push(`/watch/${nextId}`)}
                className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black active:scale-95"
              >
                Play now
              </button>
              <button
                onClick={() => setCountdown(null)}
                className="rounded-full border border-white/20 px-5 py-2 text-sm text-white/80"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End-of-video gag (no next episode) */}
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
