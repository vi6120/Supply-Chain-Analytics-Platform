from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from api.database import get_connection, clean

router = APIRouter(prefix="/financial", tags=["Financial"])


@router.get("/summary")
def get_financial_summary(
    margin: Optional[str] = Query(None),
    plant:  Optional[str] = Query(None),
):
    try:
        con = get_connection()
        conditions = []
        if margin:
            conditions.append(f"margin_category = '{margin}'")
        if plant:
            conditions.append(f"plant = '{plant}'")
        where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

        rows = clean(con.execute(f"""
            SELECT
                material_id, plant, current_stock, avg_unit_price,
                inventory_value, cogs_estimate, total_revenue,
                gross_margin, gross_margin_pct, carrying_cost_period,
                total_working_capital, annualised_turnover,
                movement_status, margin_category
            FROM main_gold.gold_financial_summary
            {where}
            ORDER BY inventory_value DESC
        """).df().to_dict(orient="records"))

        totals = con.execute(f"""
            SELECT
                ROUND(SUM(total_revenue), 2)            AS total_revenue,
                ROUND(SUM(gross_margin), 2)             AS total_gross_margin,
                ROUND(AVG(gross_margin_pct), 1)         AS avg_margin_pct,
                ROUND(SUM(inventory_value), 2)          AS total_inventory_value,
                ROUND(SUM(carrying_cost_period), 2)     AS total_carrying_cost,
                ROUND(SUM(total_working_capital), 2)    AS total_working_capital
            FROM main_gold.gold_financial_summary
            {where}
        """).fetchone()

        return {
            "totals": {
                "total_revenue":         totals[0],
                "total_gross_margin":    totals[1],
                "avg_margin_pct":        totals[2],
                "total_inventory_value": totals[3],
                "total_carrying_cost":   totals[4],
                "total_working_capital": totals[5],
            },
            "by_material": rows,
            "filters":     {"margin": margin, "plant": plant},
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        con.close()
