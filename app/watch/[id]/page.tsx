import Link from "next/link";
import { notFound } from "next/navigation";
import { getEnrichedItem } from "@/lib/catalog";
import { resolveSafePath } from "@/lib/library";
import { probe, canDirectPlay } from "@/lib/ffmpeg";
import { formatBytes } from "@/lib/format";
import Player from "@/components/Player";

export const dynamic = "force-dynamic";

export default async function WatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await getEnrichedItem(id);
  if (!item) notFound();

  // Probe the actual codecs to decide direct play vs. transcoding. Falls back
  // to the extension-based guess if the file can't be probed (e.g. NAS offline).
  let mode: "direct" | "hls" = item.directPlay ? "direct" : "hls";
  const file = resolveSafePath(id);
  if (file) {
    try {
      mode = canDirectPlay(file, await probe(file)) ? "direct" : "hls";
    } catch {
      /* keep extension-based guess */
    }
  }

  const src = mode === "direct" ? `/api/stream/${id}` : `/api/hls/${id}/index.m3u8`;
  const title = item.meta?.title || item.title;
  const meta = item.meta;

  return (
    <div className="relative">
      {meta?.backdrop_url && (
        <div className="pointer-events-none absolute inset-x-0 -top-8 -z-10 h-80 overflow-hidden opacity-25">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={meta.backdrop_url} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
        </div>
      )}

      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1 text-sm text-white/60 hover:text-white"
      >
        ← Back to library
      </Link>

      <div className="overflow-hidden rounded-xl bg-black ring-1 ring-white/10">
        <Player
          id={item.id}
          src={src}
          mode={mode}
          initialPosition={item.progress?.position ?? 0}
        />
      </div>

      <div className="mt-5 flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/50">
            {meta?.year && <span>{meta.year}</span>}
            {typeof meta?.rating === "number" && meta.rating > 0 && (
              <span className="text-accent">★ {meta.rating.toFixed(1)}</span>
            )}
            <span>{item.ext.replace(".", "").toUpperCase()}</span>
            <span>{formatBytes(item.sizeBytes)}</span>
            {mode === "hls" && (
              <span className="rounded bg-accent/20 px-1.5 py-0.5 text-xs text-accent">
                transcoding live
              </span>
            )}
          </p>
          {meta?.overview && (
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/70">
              {meta.overview}
            </p>
          )}
        </div>
      </div>

      {mode === "hls" && (
        <p className="mt-6 max-w-2xl text-xs text-white/40">
          This file isn&apos;t natively browser-playable, so it&apos;s being
          transcoded to H.264 on the fly with ffmpeg. Playback starts within a few
          seconds and you can still seek anywhere.
        </p>
      )}
    </div>
  );
}
