# XAUUSD Python Analyzer

This folder contains the first data-analysis engine for the XAUUSD project.

## Requirements

Python 3.10+ is recommended.

No third-party packages are required for V1.

## Run locally

From the project root:

```bash
python python/analyze_xauusd.py "C:/path/to/XAUUSD.csv"
```

On Codespaces, if the CSV is stored in `data/XAUUSD.csv`:

```bash
python python/analyze_xauusd.py "data/XAUUSD.csv"
```

The analyzer streams the CSV instead of loading the entire file into memory.

## V1 checks

- file size
- total rows
- first/last timestamp
- Bid/Ask coverage
- LAST/VOLUME coverage
- minimum/maximum Bid
- minimum/maximum Ask
- minimum/maximum/average spread
- flag frequency

The original CSV is never modified.
