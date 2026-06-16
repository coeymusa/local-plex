"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CardItem } from "@/lib/catalog";
import PosterCard from "./PosterCard";

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
          <h2 className="text-2xl font-semibold tracking-tight">Library</h2>
          <p className="mt-1 text-sm text-white/50">
            {items.length} of {total} {total === 1 ? "title" : "titles"}
          </p>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search…"
          className="w-56 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-accent/60"
        />
      </div>

      {items.length === 0 ? (
        <p className="mt-10 text-center text-sm text-white/40">
          {loading ? "Searching…" : `Nothing matches “${query}”.`}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {items.map((item) => (
              <PosterCard key={item.id} item={item} />
            ))}
          </div>

          {items.length < total && (
            <div className="mt-8 text-center">
              <button
                onClick={() => fetchPage(query, items.length)}
                disabled={loading}
                className="rounded-lg border border-white/10 bg-white/5 px-5 py-2.5 text-sm hover:border-accent/50 disabled:opacity-50"
              >
                {loading ? "Loading…" : `Load more (${total - items.length} left)`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
