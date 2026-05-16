import argparse
from datetime import datetime, date, timedelta
import random
import pandas as pd
import numpy as np
from pathlib import Path
from faker import Faker

fake = Faker()
rng = np.random.default_rng(42)

DATA_DIR = Path(__file__).parent.parent / "data" / "raw"

VENDORS = [
    "V0001", "V0002", "V0003", "V0004", "V0005",
    "V0006", "V0007", "V0008", "V0009", "V0010",
]

MATERIALS = [
    "MAT001", "MAT002", "MAT003", "MAT004", "MAT005",
    "MAT006", "MAT007", "MAT008", "MAT009", "MAT010",
]

PLANTS = ["1000", "1100", "2000", "2100"]

PURCHASING_ORGS = ["1000", "2000"]

CURRENCIES = {"1000": "EUR", "2000": "USD"}

LEAD_TIMES = {
    "V0001": 7,  "V0002": 14, "V0003": 21, "V0004": 10,
    "V0005": 30, "V0006": 5,  "V0007": 45, "V0008": 20,
    "V0009": 12, "V0010": 25,
}


def save_parquet(df: pd.DataFrame, module: str, table: str) -> None:
    folder = DATA_DIR / module
    folder.mkdir(parents=True, exist_ok=True)
    filepath = folder / f"{table.lower()}.parquet"

    if filepath.exists():
        existing = pd.read_parquet(filepath)
        combined = pd.concat([existing, df], ignore_index=True)
        combined.to_parquet(filepath, index=False)
        print(
            f"    → Appended {len(df)} rows to {table} (total: {len(combined)})")
    else:
        df.to_parquet(filepath, index=False)
        print(f"    → Created {table} with {len(df)} rows")


def generate_purchase_orders(sim_date: date) -> tuple[pd.DataFrame, pd.DataFrame]:
    n_orders = random.randint(3, 8)
    ekko_rows = []
    ekpo_rows = []

    for i in range(n_orders):
        vendor = random.choice(VENDORS)
        porg = random.choice(PURCHASING_ORGS)
        plant = random.choice(PLANTS)
        waers = CURRENCIES.get(porg, "EUR")
        ebeln = f"45{sim_date.strftime('%Y%m%d')}{i:04d}"

        ekko_rows.append({
            "EBELN": ebeln,
            "LIFNR": vendor,
            "EKORG": porg,
            "WERKS": plant,
            "WAERS": waers,
            "BEDAT": sim_date,
            "ERNAM": fake.user_name().upper()[:8],
            "ERDAT": sim_date,
        })

        n_items = random.randint(1, 5)
        for j in range(n_items):
            material = random.choice(MATERIALS)
            quantity = round(rng.uniform(10, 500), 0)
            price = round(rng.uniform(5.0, 2000.0), 2)
            lead_days = LEAD_TIMES[vendor]
            delivery = sim_date + timedelta(days=lead_days)

            ekpo_rows.append({
                "EBELN": ebeln,
                "EBELP": str((j + 1) * 10).zfill(5),
                "MATNR": material,
                "WERKS": plant,
                "MENGE": quantity,
                "MEINS": "EA",
                "NETPR": price,
                "WAERS": waers,
                "EINDT": delivery,
                "WEMNG": 0.0,
                "ERDAT": sim_date,
            })

    return pd.DataFrame(ekko_rows), pd.DataFrame(ekpo_rows)


def generate_goods_receipts(sim_date: date) -> pd.DataFrame:
    ekpo_path = DATA_DIR / "mm" / "ekpo.parquet"
    if not ekpo_path.exists():
        print("    No PO items found — skipping goods receipts")
        return pd.DataFrame()

    ekpo = pd.read_parquet(ekpo_path)
    ekpo["EINDT"] = pd.to_datetime(ekpo["EINDT"]).dt.date

    window_start = sim_date - timedelta(days=3)
    window_end = sim_date + timedelta(days=1)
    due = ekpo[
        (ekpo["EINDT"] >= window_start) &
        (ekpo["EINDT"] <= window_end) &
        (ekpo["WEMNG"] < ekpo["MENGE"])
    ].copy()

    if due.empty:
        print("    No PO lines due for delivery today")
        return pd.DataFrame()

    mseg_rows = []
    ekpo_updates = []

    for _, line in due.iterrows():
        if random.random() < 0.15:
            continue

        receipt_pct = rng.uniform(0.8, 1.0)
        qty_received = round(line["MENGE"] * receipt_pct, 0)
        qty_received = min(qty_received, line["MENGE"] - line["WEMNG"])
        doc_number = f"50{sim_date.strftime('%Y%m%d')}{len(mseg_rows):04d}"

        mseg_rows.append({
            "MBLNR": doc_number,
            "BWART": "101",
            "MATNR": line["MATNR"],
            "WERKS": line["WERKS"],
            "MENGE": qty_received,
            "MEINS": line["MEINS"],
            "EBELN": line["EBELN"],
            "EBELP": line["EBELP"],
            "BUDAT": sim_date,
            "DMBTR": round(qty_received * line["NETPR"], 2),
            "WAERS": line["WAERS"],
        })

        ekpo_updates.append({
            "EBELN": line["EBELN"],
            "EBELP": line["EBELP"],
            "WEMNG": line["WEMNG"] + qty_received,
        })

    if ekpo_updates:
        updates_df = pd.DataFrame(ekpo_updates)
        ekpo = ekpo.merge(
            updates_df.rename(columns={"WEMNG": "WEMNG_NEW"}),
            on=["EBELN", "EBELP"],
            how="left"
        )
        ekpo["WEMNG"] = ekpo["WEMNG_NEW"].combine_first(ekpo["WEMNG"])
        ekpo = ekpo.drop(columns=["WEMNG_NEW"])
        ekpo.to_parquet(ekpo_path, index=False)
        print(f"    → Updated WEMNG on {len(ekpo_updates)} PO lines")

    return pd.DataFrame(mseg_rows)


CUSTOMERS = [
    "C0001", "C0002", "C0003", "C0004", "C0005",
    "C0006", "C0007", "C0008", "C0009", "C0010",
]

SALES_ORGS = ["1000", "2000"]

FINISHED_MATERIALS = ["MAT005", "MAT006",
                      "MAT007", "MAT008", "MAT009", "MAT010"]


def generate_sales_orders(sim_date: date) -> tuple[pd.DataFrame, pd.DataFrame]:
    n_orders = random.randint(5, 12)
    vbak_rows = []
    vbap_rows = []

    for i in range(n_orders):
        customer = random.choice(CUSTOMERS)
        vkorg = random.choice(SALES_ORGS)
        waers = CURRENCIES.get(vkorg, "EUR")
        vbeln = f"10{sim_date.strftime('%Y%m%d')}{i:04d}"
        n_items = random.randint(1, 4)

        order_value = 0.0
        item_rows = []

        for j in range(n_items):
            material = random.choice(FINISHED_MATERIALS)
            quantity = round(rng.uniform(1, 200), 0)
            price = round(rng.uniform(50.0, 5000.0), 2)
            order_value += quantity * price

            item_rows.append({
                "VBELN": vbeln,
                "POSNR": str((j + 1) * 10).zfill(6),
                "MATNR": material,
                "KWMENG": quantity,
                "MEINS": "EA",
                "NETPR": price,
                "WAERS": waers,
                "WERKS": random.choice(PLANTS),
                "LFIMG": 0.0,
                "WBSTK": "A",
                "ERDAT": sim_date,
            })

        vbak_rows.append({
            "VBELN": vbeln,
            "KUNNR": customer,
            "VKORG": vkorg,
            "WAERS": waers,
            "NETWR": round(order_value, 2),
            "GBSTK": "A",
            "ERDAT": sim_date,
            "ERNAM": fake.user_name().upper()[:8],
        })

        vbap_rows.extend(item_rows)

    return pd.DataFrame(vbak_rows), pd.DataFrame(vbap_rows)


def generate_outbound_deliveries(sim_date: date) -> pd.DataFrame:
    vbap_path = DATA_DIR / "sd" / "vbap.parquet"
    if not vbap_path.exists():
        return pd.DataFrame()

    vbap = pd.read_parquet(vbap_path)
    vbap["ERDAT"] = pd.to_datetime(vbap["ERDAT"]).dt.date

    window_start = sim_date - timedelta(days=3)
    due = vbap[
        (vbap["ERDAT"] >= window_start) &
        (vbap["ERDAT"] < sim_date) &
        (vbap["WBSTK"] == "A")
    ].copy()

    if due.empty:
        print("    No sales orders ready for delivery today")
        return pd.DataFrame()

    mseg_rows = []
    vbap_updates = []

    for _, line in due.iterrows():
        if random.random() < 0.2:
            continue

        ship_pct = rng.uniform(0.85, 1.0)
        qty_ship = round(line["KWMENG"] * ship_pct, 0)
        doc_number = f"60{sim_date.strftime('%Y%m%d')}{len(mseg_rows):04d}"

        mseg_rows.append({
            "MBLNR": doc_number,
            "BWART": "601",
            "MATNR": line["MATNR"],
            "WERKS": line["WERKS"],
            "MENGE": qty_ship,
            "MEINS": line["MEINS"],
            "EBELN": "",
            "EBELP": "",
            "BUDAT": sim_date,
            "DMBTR": round(qty_ship * line["NETPR"], 2),
            "WAERS": line["WAERS"],
        })

        new_status = "C" if ship_pct >= 0.99 else "B"
        vbap_updates.append({
            "VBELN": line["VBELN"],
            "POSNR": line["POSNR"],
            "LFIMG": qty_ship,
            "WBSTK": new_status,
        })

    if vbap_updates:
        updates_df = pd.DataFrame(vbap_updates)
        vbap = vbap.merge(
            updates_df.rename(columns={
                "LFIMG": "LFIMG_NEW",
                "WBSTK": "WBSTK_NEW"
            }),
            on=["VBELN", "POSNR"],
            how="left"
        )
        vbap["LFIMG"] = vbap["LFIMG_NEW"].combine_first(vbap["LFIMG"])
        vbap["WBSTK"] = vbap["WBSTK_NEW"].combine_first(vbap["WBSTK"])
        vbap = vbap.drop(columns=["LFIMG_NEW", "WBSTK_NEW"])
        vbap.to_parquet(vbap_path, index=False)
        print(
            f"    → Updated {len(vbap_updates)} SO lines with delivery status")

    return pd.DataFrame(mseg_rows)


def generate_stock_snapshot(sim_date: date) -> pd.DataFrame:
    mseg_path = DATA_DIR / "wm" / "mseg.parquet"

    if not mseg_path.exists():
        print("    No movements yet — skipping stock snapshot")
        return pd.DataFrame()

    mseg = pd.read_parquet(mseg_path)
    mseg["BUDAT"] = pd.to_datetime(mseg["BUDAT"]).dt.date
    today = mseg[mseg["BUDAT"] == sim_date].copy()

    if today.empty:
        print("    No movements today — skipping stock snapshot")
        return pd.DataFrame()

    today["SIGNED_QTY"] = today.apply(
        lambda r: r["MENGE"] if r["BWART"] == "101" else -r["MENGE"],
        axis=1
    )

    snapshot = (
        today.groupby(["MATNR", "WERKS"])["SIGNED_QTY"]
        .sum()
        .reset_index()
        .rename(columns={"SIGNED_QTY": "LABST"})
    )
    snapshot["LGORT"] = "0001"
    snapshot["SNAPSHOT_DATE"] = sim_date
    snapshot["LABST"] = snapshot["LABST"].round(0)

    return snapshot


def main():
    parser = argparse.ArgumentParser(
        description="Generate one day of SAP supply chain events")
    parser.add_argument(
        "--date", type=str,
        help="Date to simulate (YYYY-MM-DD). Defaults to today.")
    args = parser.parse_args()

    if args.date:
        sim_date = datetime.strptime(args.date, "%Y-%m-%d").date()
    else:
        sim_date = date.today()

    print(f"\n{'='*50}")
    print(f"  Simulating business day: {sim_date}")
    print(f"{'='*50}\n")

    ekko, ekpo = generate_purchase_orders(sim_date)
    print(f"  Purchase orders   : {len(ekko)} headers, {len(ekpo)} line items")
    save_parquet(ekko, "mm", "EKKO")
    save_parquet(ekpo, "mm", "EKPO")

    print()
    mseg_gr = generate_goods_receipts(sim_date)
    print(f"  Goods receipts    : {len(mseg_gr)} lines")
    if not mseg_gr.empty:
        save_parquet(mseg_gr, "wm", "MSEG")

    print()
    vbak, vbap = generate_sales_orders(sim_date)
    print(f"  Sales orders      : {len(vbak)} headers, {len(vbap)} line items")
    save_parquet(vbak, "sd", "VBAK")
    save_parquet(vbap, "sd", "VBAP")

    print()
    mseg_ob = generate_outbound_deliveries(sim_date)
    print(f"  Outbound deliveries: {len(mseg_ob)} lines")
    if not mseg_ob.empty:
        save_parquet(mseg_ob, "wm", "MSEG")

    print()
    mard = generate_stock_snapshot(sim_date)
    print(f"  Stock snapshot    : {len(mard)} material-plant records")
    if not mard.empty:
        save_parquet(mard, "wm", "MARD")

    print(f"\n{'='*50}")
    print(f"  Day {sim_date} complete")
    print(f"{'='*50}\n")


if __name__ == "__main__":
    main()


# def main():
#     parser = argparse.ArgumentParser(
#         description="Generate one day of SAP supply chain events")
#     parser.add_argument(
#         "--date", type=str, help="Date to simulate (YYYY-MM-DD). Defaults to today.")
#     args = parser.parse_args()

#     if args.date:
#         sim_date = datetime.strptime(args.date, "%Y-%m-%d").date()
#     else:
#         sim_date = date.today()

#     print(f"\n{'='*50}")
#     print(f"  Simulating business day: {sim_date}")
#     print(f"{'='*50}\n")

#     ekko, ekpo = generate_purchase_orders(sim_date)
#     print(f"\n  Purchase orders : {len(ekko)} headers, {len(ekpo)} line items")
#     save_parquet(ekko, "mm", "EKKO")
#     save_parquet(ekpo, "mm", "EKPO")

#     mseg = generate_goods_receipts(sim_date)
#     if not mseg.empty:
#         save_parquet(mseg, "wm", "MSEG")

#     print(f"  Goods receipts  : {len(mseg)} lines")

#     vbak, vbap = generate_sales_orders(sim_date)
#     print(f"  Sales orders    : {len(vbak)} headers, {len(vbap)} line items")
#     save_parquet(vbak, "sd", "VBAK")
#     save_parquet(vbap, "sd", "VBAP")


# if __name__ == "__main__":
#     main()
