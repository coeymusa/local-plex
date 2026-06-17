import Link from "next/link";
import { Strawberry, Sparkle, Heart } from "@/components/Doodles";
import FlipBait from "@/components/FlipBait";

export const dynamic = "force-dynamic";

export default function GotchaPage() {
  return (
    <div className="relative flex min-h-[80vh] flex-col items-center justify-center overflow-hidden py-12 text-center">
      <Sparkle className="absolute left-[16%] top-[14%] h-10 w-10 opacity-70" />
      <Sparkle className="absolute right-[14%] top-[22%] h-7 w-7 opacity-60" />
      <Heart className="absolute left-[20%] bottom-[18%] h-8 w-8 -rotate-12 opacity-70" />

      <div className="rise">
        <Strawberry className="mx-auto h-20 w-20 -rotate-12" />
        <h1 className="font-display mt-5 text-7xl font-semibold tracking-tight text-cream sm:text-8xl">
          Gottem
        </h1>

        <FlipBait />

        <Link
          href="/"
          className="mt-10 inline-block rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-bg transition hover:bg-citrus active:scale-95"
        >
          ← back to your shows
        </Link>
      </div>
    </div>
  );
}
