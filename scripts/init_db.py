import duckdb
from pathlib import Path

DB_PATH = Path("data/supply_chain.duckdb")
RAW_PATH = Path("data/raw")


def init_database() -> None:
    print(f"\nInitialising DuckDB at {DB_PATH}\n")
    con = duckdb.connect(str(DB_PATH))

    con.execute("CREATE SCHEMA IF NOT EXISTS bronze")

    views = {
        "bronze.ekko": RAW_PATH / "mm" / "ekko.parquet",
        "bronze.ekpo": RAW_PATH / "mm" / "ekpo.parquet",
        "bronze.mseg": RAW_PATH / "wm" / "mseg.parquet",
        "bronze.mard": RAW_PATH / "wm" / "mard.parquet",
        "bronze.vbak": RAW_PATH / "sd" / "vbak.parquet",
        "bronze.vbap": RAW_PATH / "sd" / "vbap.parquet",
    }

    for view_name, parquet_path in views.items():
        con.execute(f"""
            CREATE OR REPLACE VIEW {view_name}
            AS SELECT * FROM read_parquet('{parquet_path}')
        """)
        count = con.execute(f"SELECT COUNT(*) FROM {view_name}").fetchone()[0]
        print(f"  ✓ {view_name:<20} {count:>6,} rows")

    print("\n  All bronze views registered.")
    print(f"  Database file: {DB_PATH.resolve()}\n")
    con.close()


if __name__ == "__main__":
    init_database()
