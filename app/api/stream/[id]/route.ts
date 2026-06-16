import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { resolveSafePath } from "@/lib/library";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  ".mp4": "video/mp4",
  ".m4v": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".mkv": "video/x-matroska",
  ".avi": "video/x-msvideo",
  ".ts": "video/mp2t",
};

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const filePath = resolveSafePath(id);
  if (!filePath) {
    return new Response("Bad id", { status: 400 });
  }

  let size: number;
  try {
    size = (await stat(filePath)).size;
  } catch {
    return new Response("Not found (is the NAS connected?)", { status: 404 });
  }

  const contentType = MIME[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";
  const range = req.headers.get("range");

  // No Range header → send the whole file (used for download / non-seeking play).
  if (!range) {
    const stream = createReadStream(filePath);
    return new Response(Readable.toWeb(stream) as ReadableStream, {
      status: 200,
      headers: {
        "Content-Length": String(size),
        "Content-Type": contentType,
        "Accept-Ranges": "bytes",
      },
    });
  }

  // Parse "bytes=START-END"
  const match = /bytes=(\d*)-(\d*)/.exec(range);
  if (!match) {
    return new Response("Invalid range", { status: 416 });
  }
  const start = match[1] ? parseInt(match[1], 10) : 0;
  const end = match[2] ? parseInt(match[2], 10) : size - 1;

  if (start >= size || end >= size || start > end) {
    return new Response("Range not satisfiable", {
      status: 416,
      headers: { "Content-Range": `bytes */${size}` },
    });
  }

  const stream = createReadStream(filePath, { start, end });
  return new Response(Readable.toWeb(stream) as ReadableStream, {
    status: 206,
    headers: {
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Accept-Ranges": "bytes",
      "Content-Length": String(end - start + 1),
      "Content-Type": contentType,
    },
  });
}
