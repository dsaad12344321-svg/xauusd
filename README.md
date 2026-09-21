# XAUUSD Research Lab

Local-first Next.js application for analyzing large XAUUSD tick data and developing a hedging strategy before producing an MT5 EA.

## V1

- Streams the CSV on the Node.js server.
- Does not load the 1.5 GB file into the browser.
- Reports dataset size, row count, time range, Bid/Ask coverage, price range, spread statistics, and flag distribution.

## Run

Use Node.js 20.9+.

Set the CSV path before starting Next.js.

PowerShell:
```powershell
$env:XAUUSD_CSV_PATH="C:\path\to\XAUUSD.csv"
npm install
npm run dev
```

Then open http://localhost:3000 and click **Analyze CSV**.

The CSV is intentionally ignored by Git. It should remain on the local machine.

## Roadmap

V2: sampled tick chart and date/time range queries.
V3: Parquet/DuckDB data engine.
V4: strategy research and tick-level backtester.
V5: MT5 hedging EA.
