from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from api.database import get_connection, clean

router = APIRouter(prefix="/suppliers", tags=["Suppliers"])

SORT_COLS = {
    "score":       "vendor_score",
    "fulfillment": "overall_fulfillment_pct",
    "overdue":     "overdue_lines",
}


@router.get("/scorecards")
def get_supplier_scorecards(
    rating:  Optional[str] = Query(None),
    sort_by: str = Query("score"),
):
    try:
        con = get_connection()
        where = f"WHERE vendor_rating = '{rating}'" if rating else ""
        order = SORT_COLS.get(sort_by, "vendor_score")

        rows = clean(con.execute(f"""
            SELECT
                vendor_id, total_pos, total_lines, total_po_value,
                total_ordered_qty, total_received_qty,
                overall_fulfillment_pct, overdue_lines, overdue_pct,
                vendor_score, vendor_rating, first_po_date, last_po_date
            FROM main_gold.gold_supplier_performance
            {where}
            ORDER BY {order} DESC
        """).df().to_dict(orient="records"))

        summary = con.execute("""
            SELECT
                COUNT(*)                                            AS total_vendors,
                COUNT(CASE WHEN vendor_rating = 'Preferred'
                    THEN 1 END)                                     AS preferred,
                COUNT(CASE WHEN vendor_rating = 'Approved'
                    THEN 1 END)                                     AS approved,
                COUNT(CASE WHEN vendor_rating = 'Restricted'
                    THEN 1 END)                                     AS restricted,
                ROUND(AVG(vendor_score), 1)                        AS avg_score
            FROM main_gold.gold_supplier_performance
        """).fetchone()

        return {
            "summary": {
                "total_vendors": summary[0],
                "preferred":     summary[1],
                "approved":      summary[2],
                "restricted":    summary[3],
                "avg_score":     summary[4],
            },
            "vendors": rows,
            "filters": {"rating": rating, "sort_by": sort_by},
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        con.close()
