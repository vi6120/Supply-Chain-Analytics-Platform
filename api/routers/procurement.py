from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from api.database import get_connection, clean

router = APIRouter(prefix="/procurement", tags=["Procurement"])


@router.get("/summary")
def get_procurement_summary(
    vendor: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
):
    try:
        con = get_connection()
        conditions = []
        if vendor:
            conditions.append(f"vendor_id = '{vendor}'")
        if status:
            conditions.append(f"delivery_status = '{status}'")
        where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

        breakdown = clean(con.execute(f"""
            SELECT
                receipt_status, delivery_status,
                COUNT(*)                    AS lines,
                ROUND(SUM(line_value), 2)   AS total_value
            FROM main_silver.silver_purchase_orders
            {where}
            GROUP BY receipt_status, delivery_status
            ORDER BY receipt_status, delivery_status
        """).df().to_dict(orient="records"))

        totals = con.execute(f"""
            SELECT
                COUNT(DISTINCT po_number)       AS total_pos,
                COUNT(*)                        AS total_lines,
                ROUND(SUM(line_value), 2)       AS total_value,
                ROUND(AVG(fulfillment_pct), 1)  AS avg_fulfillment
            FROM main_silver.silver_purchase_orders
            {where}
        """).fetchone()

        return {
            "totals": {
                "total_pos":       totals[0],
                "total_lines":     totals[1],
                "total_value":     totals[2],
                "avg_fulfillment": totals[3],
            },
            "by_status": breakdown,
            "filters":   {"vendor": vendor, "status": status},
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        con.close()


@router.get("/overdue")
def get_overdue_pos(
    vendor: Optional[str] = Query(None),
    limit:  int = Query(20, ge=1, le=100),
):
    try:
        con = get_connection()
        where = f"AND vendor_id = '{vendor}'" if vendor else ""
        rows = clean(con.execute(f"""
            SELECT
                po_number, po_item, vendor_id, material_id, plant,
                ordered_qty, received_qty, fulfillment_pct,
                planned_delivery_date, receipt_status, delivery_status
            FROM main_silver.silver_purchase_orders
            WHERE delivery_status = 'Overdue'
            {where}
            ORDER BY planned_delivery_date ASC
            LIMIT {limit}
        """).df().to_dict(orient="records"))
        return {"overdue": rows, "total": len(rows)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        con.close()
