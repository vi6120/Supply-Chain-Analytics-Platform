import subprocess
import sys
from datetime import date, timedelta


def backfill(start: date, end: date) -> None:
    current = start
    total = (end - start).days + 1
    done = 0

    print(f"\nBackfilling {total} days: {start} → {end}\n")

    while current <= end:
        result = subprocess.run(
            [sys.executable, "scripts/daily_trigger.py",
             "--date", current.strftime("%Y-%m-%d")],
            capture_output=True,
            text=True
        )
        done += 1
        if result.returncode != 0:
            print(f"  ERROR on {current}:")
            print(result.stderr)
            break
        else:
            lines = [l for l in result.stdout.split("\n")
                     if any(x in l for x in ["PO", "receipts", "Sales", "deliveries", "snapshot", "complete"])]
            summary = " | ".join(l.strip() for l in lines if l.strip())
            print(f"  [{done:>3}/{total}] {current}  {summary}")

        current += timedelta(days=1)

    print(f"\nDone. {done} days processed.\n")


if __name__ == "__main__":
    backfill(
        start=date(2026, 2, 15),
        end=date(2026, 5, 15)
    )
