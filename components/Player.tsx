"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Hls from "hls.js";
import { Lemon } from "./Doodles";

type Sub = { track: string; label: string; lang: string };

export default function Player({
  id,
  src,
  mode,
  initialPosition,
  subs = [],
  nextId = null,
  binge = 0,
}: {
  id: string;
  src: string;
  mode: "direct" | "hls";
  initialPosition: number;
  subs?: Sub[];
  nextId?: string | null;
  /** How many episodes have been watched back-to-back before this one. */
  binge?: number;
}) {
  const router = useRouter();
  const ref = useRef<HTMLVideoElement>(null);
  const lastSent = useRef(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [wellness, setWellness] = useState(false);
  const streak = useRef(0);

  // On finish: if there's a next episode, either nudge (every 3rd) or auto-advance.
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const onEnded = () => {
      if (!nextId) return; // movie / last episode — just stop, no overlay
      const s = binge + 1;
      streak.current = s;
      if (s % 3 === 0) setWellness(true);
      else setCountdown(8);
    };
    const onPlay = () => {
      setCountdown(null);
      setWellness(false);
    };
    video.addEventListener("ended", onEnded);
    video.addEventListener("play", onPlay);
    return () => {
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("play", onPlay);
    };
  }, [nextId, binge]);

  // Next-episode countdown tick.
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      router.push(`/watch/${nextId}?binge=${streak.current}`);
      return;
    }
    const t = setTimeout(() => setCountdown((c) => (c === null ? null : c - 1)), 1000);
    return () => clearTimeout(t);
  }, [countdown, nextId, router]);

  // Attach the source.
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

  return (
    <div className="relative">
      <video ref={ref} controls autoPlay playsInline className="aspect-video w-full bg-black">
        {subs.map((s) => (
          <track key={s.track} kind="subtitles" src={`/api/subs/${id}/${s.track}`} srcLang={s.lang} label={s.label} />
        ))}
      </video>

      {/* Binge nudge — every 3rd episode */}
      {wellness && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-bg/90 backdrop-blur-sm">
          <div className="px-6 text-center">
            <Lemon className="mx-auto h-14 w-14" />
            <p className="mt-3 text-xs uppercase tracking-[0.22em] text-cream-dim">
              3 episodes in a row
            </p>
            <h2 className="font-display mt-1 text-2xl font-semibold text-cream">
              Drink water or fix posture
            </h2>
            <button
              onClick={() => router.push(`/watch/${nextId}?binge=0`)}
              className="mt-5 rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-bg transition hover:bg-citrus active:scale-95"
            >
              Okay, keep watching
            </button>
          </div>
        </div>
      )}

      {/* Next-episode autoplay countdown */}
      {countdown !== null && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-bg/85">
          <div className="px-6 text-center">
            <p className="text-sm uppercase tracking-[0.22em] text-cream-dim">Up next</p>
            <p className="font-display mt-2 text-xl text-cream">Next episode in {countdown}…</p>
            <div className="mt-4 flex justify-center gap-3">
              <button
                onClick={() => router.push(`/watch/${nextId}?binge=${streak.current}`)}
                className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-bg active:scale-95"
              >
                Play now
              </button>
              <button
                onClick={() => setCountdown(null)}
                className="rounded-full border border-line px-5 py-2 text-sm text-cream-dim"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
