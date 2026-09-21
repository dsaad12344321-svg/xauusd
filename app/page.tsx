"use client";

import { useState } from "react";

type Analysis = {
  file: string; sizeBytes: number; firstTick: string | null; lastTick: string | null;
  rows: number; bidAskRows: number; bidOnlyRows: number; askOnlyRows: number;
  lastRows: number; volumeRows: number; flagCounts: Record<string, number>;
  minBid: number | null; maxBid: number | null; minAsk: number | null; maxAsk: number | null;
  minSpread: number | null; maxSpread: number | null; avgSpread: number | null;
};

const fmt = (n: number | null | undefined, digits = 3) => n == null ? "—" : n.toLocaleString(undefined, { maximumFractionDigits: digits });
const bytes = (n: number) => n >= 1e9 ? (n/1e9).toFixed(2)+" GB" : (n/1e6).toFixed(1)+" MB";

export default function Home() {
  const [data, setData] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function analyze() {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/analyze", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Analysis failed");
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally { setLoading(false); }
  }

  return (
    <main className="container">
      <header className="header">
        <div>
          <div className="eyebrow">XAUUSD • Research Lab • V1</div>
          <h1>Tick Data Analyzer</h1>
          <p className="subtitle">
            Local-first workspace for the 1.5 GB XAUUSD tick file. V1 streams the CSV on the server,
            so the browser never loads the whole dataset into memory.
          </p>
        </div>
        <button className="btn" onClick={analyze} disabled={loading}>{loading ? "Analyzing…" : "Analyze CSV"}</button>
      </header>

      <section className="panel">
        <div className="label">Data source</div>
        <div className="path">XAUUSD_CSV_PATH → your local XAUUSD.csv</div>
        <p className="note">The CSV stays on your PC. We will not commit the 1.5 GB file to GitHub.</p>
        {error && <p className="error">{error}</p>}
        {data && <p className="good">Analysis completed.</p>}
      </section>

      {data && <>
        <section className="section">
          <h2>Dataset</h2>
          <div className="grid">
            <div className="card"><div className="label">File size</div><div className="value">{bytes(data.sizeBytes)}</div></div>
            <div className="card"><div className="label">Rows</div><div className="value">{fmt(data.rows, 0)}</div></div>
            <div className="card"><div className="label">First tick</div><div className="value" style={{fontSize:15}}>{data.firstTick ?? "—"}</div></div>
            <div className="card"><div className="label">Last tick</div><div className="value" style={{fontSize:15}}>{data.lastTick ?? "—"}</div></div>
          </div>
        </section>

        <section className="section">
          <h2>Bid / Ask</h2>
          <div className="grid">
            <div className="card"><div className="label">Bid + Ask rows</div><div className="value">{fmt(data.bidAskRows,0)}</div></div>
            <div className="card"><div className="label">Bid-only rows</div><div className="value">{fmt(data.bidOnlyRows,0)}</div></div>
            <div className="card"><div className="label">Ask-only rows</div><div className="value">{fmt(data.askOnlyRows,0)}</div></div>
            <div className="card"><div className="label">LAST / Volume rows</div><div className="value">{fmt(data.lastRows,0)} / {fmt(data.volumeRows,0)}</div></div>
          </div>
        </section>

        <section className="section">
          <h2>Price & spread</h2>
          <div className="grid">
            <div className="card"><div className="label">Bid range</div><div className="value">{fmt(data.minBid)} — {fmt(data.maxBid)}</div></div>
            <div className="card"><div className="label">Ask range</div><div className="value">{fmt(data.minAsk)} — {fmt(data.maxAsk)}</div></div>
            <div className="card"><div className="label">Min / max spread</div><div className="value">{fmt(data.minSpread)} — {fmt(data.maxSpread)}</div></div>
            <div className="card"><div className="label">Average spread</div><div className="value">{fmt(data.avgSpread)}</div></div>
          </div>
        </section>

        <section className="section">
          <h2>Flags</h2>
          <div className="panel">
            <table className="table">
              <thead><tr><th>FLAG</th><th>COUNT</th><th>SHARE</th></tr></thead>
              <tbody>
                {Object.entries(data.flagCounts).sort((a,b)=>b[1]-a[1]).map(([flag,count]) =>
                  <tr key={flag}><td>{flag}</td><td>{count.toLocaleString()}</td><td>{((count/data.rows)*100).toFixed(2)}%</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </>}
    </main>
  );
}