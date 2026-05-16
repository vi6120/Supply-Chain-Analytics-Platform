from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from api.database import get_connection, clean

router = APIRouter(prefix="/inventory", tags=["Inventory"])


@router.get("/kpis")
def get_inventory_kpis(
    plant:  Optional[str] = Query(None),
    status: Optional[str] = Query(None),
):
    try:
        con = get_connection()
        conditions = []
        if plant:
            conditions.append(f"plant = '{plant}'")
        if status:
            conditions.append(f"stock_status = '{status}'")
        where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

        rows = clean(con.execute(f"""
            SELECT
                material_id, plant, current_stock,
                avg_daily_consumption, days_of_supply, stock_status,
                total_receipts_qty, total_issues_qty, total_movements,
                first_movement_date, last_movement_date
            FROM main_gold.gold_inventory_kpis
            {where}
            ORDER BY days_of_supply ASC NULLS LAST
        """).df().to_dict(orient="records"))

        summary = con.execute(f"""
            SELECT
                COUNT(*)                                        AS total_materials,
                COUNT(CASE WHEN stock_status = 'Stockout'
                    THEN 1 END)                                 AS stockout_count,
                COUNT(CASE WHEN stock_status = 'Critical'
                    THEN 1 END)                                 AS critical_count,
                COUNT(CASE WHEN stock_status = 'Low'
                    THEN 1 END)                                 AS low_count,
                COUNT(CASE WHEN stock_status = 'Healthy'
                    THEN 1 END)                                 AS healthy_count
            FROM main_gold.gold_inventory_kpis
            {where}
        """).fetchone()

        return {
            "summary": {
                "total_materials": summary[0],
                "stockout_count":  summary[1],
                "critical_count":  summary[2],
                "low_count":       summary[3],
                "healthy_count":   summary[4],
            },
            "materials": rows,
            "filters":   {"plant": plant, "status": status},
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        con.close()


@router.get("/turnover")
def get_inventory_turnover():
    try:
        con = get_connection()
        rows = clean(con.execute("""
            SELECT
                material_id, plant, current_stock, avg_unit_price,
                inventory_value, total_issues_value, annualised_turnover,
                days_since_last_movement, movement_status,
                turnover_rating, carrying_cost_period
            FROM main_gold.gold_inventory_turnover
            ORDER BY annualised_turnover DESC NULLS LAST
        """).df().to_dict(orient="records"))
        return {"turnover": rows}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        con.close()
