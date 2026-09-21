import fs from "node:fs";
import readline from "node:readline";

export type Analysis = {
  file: string;
  sizeBytes: number;
  firstTick: string | null;
  lastTick: string | null;
  rows: number;
  bidAskRows: number;
  bidOnlyRows: number;
  askOnlyRows: number;
  lastRows: number;
  volumeRows: number;
  flagCounts: Record<string, number>;
  minBid: number | null;
  maxBid: number | null;
  minAsk: number | null;
  maxAsk: number | null;
  minSpread: number | null;
  maxSpread: number | null;
  avgSpread: number | null;
};

function num(value: string | undefined) {
  if (!value || value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function analyzeCsv(filePath: string): Promise<Analysis> {
  const stat = await fs.promises.stat(filePath);
  const stream = fs.createReadStream(filePath, { encoding: "utf8" });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let header: string[] | null = null;
  let rows = 0;
  let firstTick: string | null = null;
  let lastTick: string | null = null;
  let bidAskRows = 0, bidOnlyRows = 0, askOnlyRows = 0, lastRows = 0, volumeRows = 0;
  const flagCounts: Record<string, number> = {};
  let minBid: number | null = null, maxBid: number | null = null;
  let minAsk: number | null = null, maxAsk: number | null = null;
  let minSpread: number | null = null, maxSpread: number | null = null;
  let spreadSum = 0, spreadCount = 0;

  for await (const raw of rl) {
    const line = String(raw).trim();
    if (!line) continue;
    const parts = line.split(/\s+/);
    if (!header) {
      header = parts.map(x => x.replace(/^</, "").replace(/>$/, "").toUpperCase());
      continue;
    }
    if (parts.length < 2) continue;

    const date = parts[0];
    const time = parts[1];
    const bid = num(parts[2]);
    const ask = num(parts[3]);
    const last = num(parts[4]);
    const volume = num(parts[5]);
    const flags = parts[6] ?? "";
    rows++;

    const timestamp = date + " " + time;
    if (!firstTick) firstTick = timestamp;
    lastTick = timestamp;

    if (bid !== null && ask !== null) {
      bidAskRows++;
      const spread = ask - bid;
      spreadSum += spread;
      spreadCount++;
      minSpread = minSpread === null ? spread : Math.min(minSpread, spread);
      maxSpread = maxSpread === null ? spread : Math.max(maxSpread, spread);
    } else if (bid !== null) {
      bidOnlyRows++;
    } else if (ask !== null) {
      askOnlyRows++;
    }

    if (last !== null) lastRows++;
    if (volume !== null) volumeRows++;
    if (bid !== null) {
      minBid = minBid === null ? bid : Math.min(minBid, bid);
      maxBid = maxBid === null ? bid : Math.max(maxBid, bid);
    }
    if (ask !== null) {
      minAsk = minAsk === null ? ask : Math.min(minAsk, ask);
      maxAsk = maxAsk === null ? ask : Math.max(maxAsk, ask);
    }
    if (flags) flagCounts[flags] = (flagCounts[flags] ?? 0) + 1;
  }

  return {
    file: filePath,
    sizeBytes: stat.size,
    firstTick, lastTick, rows, bidAskRows, bidOnlyRows, askOnlyRows, lastRows, volumeRows,
    flagCounts, minBid, maxBid, minAsk, maxAsk, minSpread, maxSpread,
    avgSpread: spreadCount ? spreadSum / spreadCount : null,
  };
}