"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CardItem } from "@/lib/catalog";
import PosterCard from "./PosterCard";
import { Cherry, TartSlice } from "./Doodles";

const PAGE = 60;

export default function LibraryBrowser({
  initialItems,
  initialTotal,
}: {
  initialItems: CardItem[];
  initialTotal: number;
}) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<CardItem[]>(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const reqId = useRef(0);

  const fetchPage = useCallback(async (q: string, offset: number) => {
    const id = ++reqId.current;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/library?q=${encodeURIComponent(q)}&offset=${offset}&limit=${PAGE}`
      );
      const data: { total: number; items: CardItem[] } = await res.json();
      if (id !== reqId.current) return; // a newer request superseded this one
      setTotal(data.total);
      setItems((prev) => (offset === 0 ? data.items : [...prev, ...data.items]));
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, []);

  // Debounced search whenever the query changes (skip the initial empty query,
  // which is already server-rendered).
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const t = setTimeout(() => fetchPage(query, 0), 250);
    return () => clearTimeout(t);
  }, [query, fetchPage]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 font-display text-3xl font-semibold tracking-tight">
            Library
            <Cherry className="h-8 w-8" />
          </h2>
          <p className="mt-1 text-sm text-cream-dim">
            {items.length} of {total} {total === 1 ? "title" : "titles"}
          </p>
        </div>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-cream-dim">⌕</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="w-56 rounded-full border border-line bg-bg-soft/60 py-2.5 pl-9 pr-4 text-sm text-cream outline-none transition focus:border-accent/70 focus:bg-bg-soft"
          />
        </div>
      </div>

      {items.length === 0 ? (
        <div className="mt-12 flex flex-col items-center gap-3 text-center">
          <TartSlice className="h-16 w-16 opacity-80" />
          <p className="text-sm text-cream-dim">
            {loading ? "Searching…" : `Nothing matches “${query}”.`}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {items.map((item, i) => (
              <div key={item.id} className="rise" style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}>
                <PosterCard item={item} />
              </div>
            ))}
          </div>

          {items.length < total && (
            <div className="mt-10 text-center">
              <button
                onClick={() => fetchPage(query, items.length)}
                disabled={loading}
                className="rounded-full border border-accent/40 bg-accent/10 px-6 py-2.5 text-sm font-medium text-accent transition hover:bg-accent/20 disabled:opacity-50"
              >
                {loading ? "Loading…" : `Load more · ${total - items.length} left`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
