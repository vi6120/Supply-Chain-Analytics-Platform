from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from api.database import get_connection, clean

router = APIRouter(prefix="/risk", tags=["Supply Risk"])


@router.get("/summary")
def get_risk_summary(category: Optional[str] = Query(None)):
    try:
        con = get_connection()
        where = f"WHERE risk_category = '{category}'" if category else ""

        rows = clean(con.execute(f"""
            SELECT
                material_id, vendor_count, is_single_source,
                concentration_risk, primary_vendor_id,
                primary_vendor_concentration_pct, perfect_order_rate,
                avg_fulfillment_pct, primary_vendor_score,
                primary_vendor_rating, supply_risk_score, risk_category
            FROM main_gold.gold_supply_risk
            {where}
            ORDER BY supply_risk_score DESC
        """).df().to_dict(orient="records"))

        summary = con.execute("""
            SELECT
                COUNT(*)                                        AS total_materials,
                COUNT(CASE WHEN is_single_source = true
                    THEN 1 END)                                 AS single_source_count,
                COUNT(CASE WHEN risk_category = 'High risk'
                    THEN 1 END)                                 AS high_risk_count,
                ROUND(AVG(perfect_order_rate), 1)              AS avg_perfect_order_rate,
                ROUND(AVG(supply_risk_score), 1)               AS avg_risk_score
            FROM main_gold.gold_supply_risk
        """).fetchone()

        return {
            "summary": {
                "total_materials":        summary[0],
                "single_source_count":    summary[1],
                "high_risk_count":        summary[2],
                "avg_perfect_order_rate": summary[3],
                "avg_risk_score":         summary[4],
            },
            "by_material": rows,
            "filters":     {"category": category},
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        con.close()
