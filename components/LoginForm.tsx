"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Mode = "choose" | "lollipop" | "pasta" | "nyc" | "greatness" | "password";

const LOLLIPOPS = ["Cola", "Cherry", "Strawberry"];
const PASTAS = ["Lemon", "Tomato", "Beans"];
const NYC_MOVIES = ["Harry Potter", "The Matrix", "Twilight"];

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";

  const [mode, setMode] = useState<Mode>("choose");
  const [lollipop, setLollipop] = useState<string>("");
  const [pasta, setPasta] = useState<string>("");
  const [nyc, setNyc] = useState<string>("");
  const [greatness, setGreatness] = useState(1);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [celebrate, setCelebrate] = useState(false);

  function succeed() {
    router.replace(next);
    router.refresh();
  }

  async function submitQuiz() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lollipop: lollipop.toLowerCase(),
        pasta: pasta.toLowerCase(),
        nyc: nyc.toLowerCase(),
        greatness,
      }),
    });
    if (res.ok) {
      // Funny gag: flash the orange-sunset photo before dropping into the app.
      setCelebrate(true);
      setTimeout(() => succeed(), 2000);
      return;
    }
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (data.reason === "lollipop") {
      setError("Hmm, that's not the one. Try again.");
      setMode("lollipop");
    } else if (data.reason === "pasta") {
      setError("Not quite — think back to Zurich.");
      setMode("pasta");
    } else if (data.reason === "nyc") {
      setError("Nope — remember New York?");
      setMode("nyc");
    } else if (data.reason === "greatness") {
      setError("Try again.");
    } else {
      setError(data.error || "That didn't work.");
    }
  }

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      succeed();
    } else {
      setError("Incorrect password.");
      setBusy(false);
    }
  }

  if (celebrate) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/julia/m3.jpeg" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />
        <div className="relative px-6 text-center">
          <p className="text-3xl font-extrabold text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
            Correct
          </p>
          <p className="mt-1 text-lg text-white/90 drop-shadow-lg">You&apos;re in.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-16 w-full max-w-sm px-2">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-lg bg-accent/20 text-2xl text-accent">
          ▶
        </div>
        <h1 className="text-xl font-semibold tracking-tight">
          Home<span className="text-accent">Home</span>
        </h1>
      </div>

      {/* Step: choose path */}
      {mode === "choose" && (
        <div className="space-y-3 text-center">
          <p className="mb-5 text-lg font-medium">Are you Julia?</p>
          <button
            onClick={() => {
              setError(null);
              setMode("lollipop");
            }}
            className="w-full rounded-xl bg-accent px-4 py-4 text-base font-semibold text-black active:scale-[.98]"
          >
            Yes, it&apos;s me
          </button>
          <button
            onClick={() => {
              setError(null);
              setMode("password");
            }}
            className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-4 text-base font-medium text-white/80 active:scale-[.98]"
          >
            No — I have a password
          </button>
        </div>
      )}

      {/* Step: lollipop question */}
      {mode === "lollipop" && (
        <div className="space-y-3">
          <p className="mb-4 text-center text-lg font-medium">
            What flavour lollypops did I used to bring you?
          </p>
          {LOLLIPOPS.map((flavour) => (
            <button
              key={flavour}
              onClick={() => {
                setLollipop(flavour);
                setError(null);
                setMode("pasta");
              }}
              className={`w-full rounded-xl border px-4 py-4 text-base font-medium active:scale-[.98] ${
                lollipop === flavour
                  ? "border-accent bg-accent/15 text-white"
                  : "border-white/15 bg-white/5 text-white/80"
              }`}
            >
              {flavour}
            </button>
          ))}
          {error && <p className="pt-1 text-center text-sm text-amber-300">{error}</p>}
          <button
            onClick={() => setMode("choose")}
            className="w-full pt-2 text-center text-sm text-white/40"
          >
            ← back
          </button>
        </div>
      )}

      {/* Step: pasta question */}
      {mode === "pasta" && (
        <div className="space-y-3">
          <p className="mb-4 text-center text-lg font-medium">
            What pasta did you make when Drew came to Zurich?
          </p>
          {PASTAS.map((kind) => (
            <button
              key={kind}
              onClick={() => {
                setPasta(kind);
                setError(null);
                setMode("nyc");
              }}
              className={`w-full rounded-xl border px-4 py-4 text-base font-medium active:scale-[.98] ${
                pasta === kind
                  ? "border-accent bg-accent/15 text-white"
                  : "border-white/15 bg-white/5 text-white/80"
              }`}
            >
              {kind}
            </button>
          ))}
          {error && <p className="pt-1 text-center text-sm text-amber-300">{error}</p>}
          <button
            onClick={() => setMode("lollipop")}
            className="w-full pt-2 text-center text-sm text-white/40"
          >
            ← back
          </button>
        </div>
      )}

      {/* Step: New York movie question */}
      {mode === "nyc" && (
        <div className="space-y-3">
          <p className="mb-4 text-center text-lg font-medium">
            What movie did we watch in New York?
          </p>
          {NYC_MOVIES.map((movie) => (
            <button
              key={movie}
              onClick={() => {
                setNyc(movie);
                setError(null);
                setMode("greatness");
              }}
              className={`w-full rounded-xl border px-4 py-4 text-base font-medium active:scale-[.98] ${
                nyc === movie
                  ? "border-accent bg-accent/15 text-white"
                  : "border-white/15 bg-white/5 text-white/80"
              }`}
            >
              {movie}
            </button>
          ))}
          {error && <p className="pt-1 text-center text-sm text-amber-300">{error}</p>}
          <button
            onClick={() => setMode("pasta")}
            className="w-full pt-2 text-center text-sm text-white/40"
          >
            ← back
          </button>
        </div>
      )}

      {/* Step: greatness slider */}
      {mode === "greatness" && (
        <div className="space-y-6">
          <p className="text-center text-lg font-medium">How great is Corey?</p>
          <div className="text-center">
            <span className="text-6xl font-bold text-accent">{greatness}</span>
            <span className="text-2xl text-white/40">/10</span>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={greatness}
            onChange={(e) => setGreatness(Number(e.target.value))}
            className="h-3 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-accent"
          />
          {error && <p className="text-center text-sm text-amber-300">{error}</p>}
          <button
            onClick={submitQuiz}
            disabled={busy}
            className="w-full rounded-xl bg-accent px-4 py-4 text-base font-semibold text-black active:scale-[.98] disabled:opacity-50"
          >
            {busy ? "Checking…" : "Let me in"}
          </button>
          <button
            onClick={() => {
              setError(null);
              setMode("nyc");
            }}
            className="w-full text-center text-sm text-white/40"
          >
            ← back
          </button>
        </div>
      )}

      {/* Step: password */}
      {mode === "password" && (
        <form onSubmit={submitPassword} className="space-y-3">
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-base outline-none focus:border-accent/60"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-accent px-4 py-3.5 text-base font-medium text-black disabled:opacity-50"
          >
            {busy ? "Checking…" : "Sign in"}
          </button>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setMode("choose");
            }}
            className="w-full text-center text-sm text-white/40"
          >
            ← back
          </button>
        </form>
      )}
    </div>
  );
}
