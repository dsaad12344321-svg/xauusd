#!/usr/bin/env python3
"""
XAUUSD CSV Analyzer V1

Reads a large XAUUSD tick CSV without loading the whole file into memory.
No pandas, numpy, DuckDB, or Parquet are required.

Expected columns:
<DATE> <TIME> <BID> <ASK> <LAST> <VOLUME> <FLAGS>

Usage:
    python python/analyze_xauusd.py "data/XAUUSD.csv"
"""

from __future__ import annotations

import csv
import os
import sys
from collections import Counter
from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class Stats:
    rows: int = 0
    bid_rows: int = 0
    ask_rows: int = 0
    bid_ask_rows: int = 0
    last_rows: int = 0
    volume_rows: int = 0
    min_bid: Optional[float] = None
    max_bid: Optional[float] = None
    min_ask: Optional[float] = None
    max_ask: Optional[float] = None
    min_spread: Optional[float] = None
    max_spread: Optional[float] = None
    spread_sum: float = 0.0
    spread_count: int = 0
    first_timestamp: Optional[str] = None
    last_timestamp: Optional[str] = None
    flags: Counter[str] = None

    def __post_init__(self) -> None:
        self.flags = Counter()


def to_float(value: str) -> Optional[float]:
    value = value.strip()
    if not value:
        return None
    try:
        return float(value)
    except ValueError:
        return None


def normalize_header(value: str) -> str:
    return value.strip().strip("<>").upper()


def detect_delimiter(line: str) -> str:
    if "\t" in line:
        return "\t"
    if "," in line:
        return ","
    return "whitespace"


def update_min_max(stats: Stats, bid: Optional[float], ask: Optional[float]) -> None:
    if bid is not None:
        stats.min_bid = bid if stats.min_bid is None else min(stats.min_bid, bid)
        stats.max_bid = bid if stats.max_bid is None else max(stats.max_bid, bid)

    if ask is not None:
        stats.min_ask = ask if stats.min_ask is None else min(stats.min_ask, ask)
        stats.max_ask = ask if stats.max_ask is None else max(stats.max_ask, ask)

    if bid is not None and ask is not None:
        spread = ask - bid
        stats.min_spread = (
            spread if stats.min_spread is None else min(stats.min_spread, spread)
        )
        stats.max_spread = (
            spread if stats.max_spread is None else max(stats.max_spread, spread)
        )
        stats.spread_sum += spread
        stats.spread_count += 1


def analyze(path: str) -> Stats:
    stats = Stats()

    file_size = os.path.getsize(path)
    processed_bytes = 0
    last_report = 0

    with open(path, "r", encoding="utf-8-sig", newline="") as f:
        first_line = f.readline()
        if not first_line:
            raise ValueError("CSV file is empty.")

        delimiter = detect_delimiter(first_line)

        # Reset to the beginning because the header parser below handles
        # both tab/comma-separated and whitespace-separated exports.
        f.seek(0)

        if delimiter == "whitespace":
            header = [normalize_header(x) for x in f.readline().split()]
        else:
            reader = csv.reader(f, delimiter=delimiter)
            header = [normalize_header(x) for x in next(reader)]

        indexes = {name: i for i, name in enumerate(header)}

        required = {"DATE", "TIME", "BID", "ASK", "LAST", "VOLUME", "FLAGS"}
        missing = required - indexes.keys()
        if missing:
            raise ValueError(
                "Missing expected columns: " + ", ".join(sorted(missing))
                + f"\nDetected columns: {header}"
            )

        date_i = indexes["DATE"]
        time_i = indexes["TIME"]
        bid_i = indexes["BID"]
        ask_i = indexes["ASK"]
        last_i = indexes["LAST"]
        volume_i = indexes["VOLUME"]
        flags_i = indexes["FLAGS"]

        if delimiter == "whitespace":
            iterator = (line.split() for line in f)
        else:
            reader = csv.reader(f, delimiter=delimiter)
            iterator = reader

        for row in iterator:
            if not row:
                continue

            # Some exports can contain extra whitespace around fields.
            row = [x.strip() for x in row]

            needed = max(date_i, time_i, bid_i, ask_i, last_i, volume_i, flags_i)
            if len(row) <= needed:
                continue

            date_value = row[date_i]
            time_value = row[time_i]
            if not date_value or not time_value:
                continue

            timestamp = f"{date_value} {time_value}"
            if stats.first_timestamp is None:
                stats.first_timestamp = timestamp
            stats.last_timestamp = timestamp

            bid = to_float(row[bid_i])
            ask = to_float(row[ask_i])
            last = to_float(row[last_i])
            volume = to_float(row[volume_i])
            flags = row[flags_i]

            stats.rows += 1

            if bid is not None:
                stats.bid_rows += 1
            if ask is not None:
                stats.ask_rows += 1
            if bid is not None and ask is not None:
                stats.bid_ask_rows += 1
            if last is not None:
                stats.last_rows += 1
            if volume is not None:
                stats.volume_rows += 1
            if flags:
                stats.flags[flags] += 1

            update_min_max(stats, bid, ask)

            # Report approximately every 100 MB so a large-file run is visible.
            try:
                processed_bytes = f.tell()
            except OSError:
                pass

            if processed_bytes - last_report >= 100 * 1024 * 1024:
                percent = (processed_bytes / file_size * 100) if file_size else 100
                print(
                    f"Progress: {percent:6.2f}% | rows: {stats.rows:,}",
                    flush=True,
                )
                last_report = processed_bytes

    return stats


def print_report(path: str, stats: Stats) -> None:
    size_mb = os.path.getsize(path) / (1024 * 1024)
    avg_spread = (
        stats.spread_sum / stats.spread_count
        if stats.spread_count
        else None
    )

    print("\n" + "=" * 60)
    print("XAUUSD TICK DATA ANALYZER V1")
    print("=" * 60)
    print(f"File:              {path}")
    print(f"File size:         {size_mb:,.2f} MB")
    print(f"Rows:              {stats.rows:,}")
    print(f"First tick:        {stats.first_timestamp or 'N/A'}")
    print(f"Last tick:         {stats.last_timestamp or 'N/A'}")
    print()
    print("TICK COVERAGE")
    print("-" * 60)
    print(f"Bid present:       {stats.bid_rows:,}")
    print(f"Ask present:       {stats.ask_rows:,}")
    print(f"Bid + Ask:         {stats.bid_ask_rows:,}")
    print(f"Last present:      {stats.last_rows:,}")
    print(f"Volume present:    {stats.volume_rows:,}")
    print()
    print("PRICE")
    print("-" * 60)
    print(f"Min Bid:           {stats.min_bid}")
    print(f"Max Bid:           {stats.max_bid}")
    print(f"Min Ask:           {stats.min_ask}")
    print(f"Max Ask:           {stats.max_ask}")
    print()
    print("SPREAD")
    print("-" * 60)
    print(f"Min Spread:        {stats.min_spread}")
    print(f"Max Spread:        {stats.max_spread}")
    print(f"Average Spread:    {avg_spread}")
    print()
    print("FLAGS")
    print("-" * 60)
    for flag, count in stats.flags.most_common():
        print(f"{flag:>8}: {count:,}")
    print("=" * 60)


def main() -> int:
    if len(sys.argv) != 2:
        print('Usage: python python/analyze_xauusd.py "path/to/XAUUSD.csv"')
        return 2

    path = sys.argv[1]

    if not os.path.isfile(path):
        print(f"ERROR: File not found: {path}")
        return 1

    try:
        stats = analyze(path)
        print_report(path, stats)
    except KeyboardInterrupt:
        print("\nStopped by user.")
        return 130
    except Exception as exc:
        print(f"ERROR: {exc}")
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
