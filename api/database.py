import duckdb
import math
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "data" / "supply_chain.duckdb"


def get_connection() -> duckdb.DuckDBPyConnection:
    return duckdb.connect(str(DB_PATH), read_only=True)


def clean(records: list[dict]) -> list[dict]:
    """Replace NaN and Inf float values with None so JSON serialisation works."""
    cleaned = []
    for row in records:
        clean_row = {}
        for k, v in row.items():
            if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
                clean_row[k] = None
            else:
                clean_row[k] = v
        cleaned.append(clean_row)
    return cleaned
