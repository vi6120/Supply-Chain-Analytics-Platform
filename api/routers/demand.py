from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from api.database import get_connection, clean

router = APIRouter(prefix="/demand", tags=["Demand & Sales"])


@router.get("/signals")
def get_demand_signals(
    material: Optional[str] = Query(None),
    days:     Optional[int] = Query(None, ge=7, le=90),
):
    try:
        con = get_connection()
        conditions = []
        if material:
            conditions.append(f"material_id = '{material}'")
        if days:
            conditions.append(f"""
                demand_from >= (
                    SELECT MAX(demand_to) - {days}
                    FROM main_gold.gold_demand_signals
                )
            """)
        where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

        rows = clean(con.execute(f"""
            SELECT
                material_id, plant, active_days,
                total_demand_qty, total_fulfilled_qty,
                avg_daily_demand, peak_daily_demand, min_daily_demand,
                total_revenue, overall_fulfillment_pct,
                demand_variability, demand_category, demand_from, demand_to
            FROM main_gold.gold_demand_signals
            {where}
            ORDER BY avg_daily_demand DESC
        """).df().to_dict(orient="records"))
        return {"signals": rows, "filters": {"material": material, "days": days}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        con.close()


@router.get("/orders")
def get_sales_orders(
    status:   Optional[str] = Query(None),
    material: Optional[str] = Query(None),
    days:     Optional[int] = Query(None, ge=7, le=90),
    limit:    int = Query(50, ge=1, le=200),
):
    try:
        con = get_connection()
        conditions = []
        if status:
            conditions.append(f"delivery_status_text = '{status}'")
        if material:
            conditions.append(f"material_id = '{material}'")
        if days:
            conditions.append(f"""
                created_date >= (
                    SELECT MAX(created_date) - {days}
                    FROM main_silver.silver_sales_orders
                )
            """)
        where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

        rows = clean(con.execute(f"""
            SELECT
                so_number, so_item, customer_id, material_id, plant,
                ordered_qty, delivered_qty, fulfillment_pct,
                net_price, line_value, created_date,
                delivery_status_text, order_status_text
            FROM main_silver.silver_sales_orders
            {where}
            ORDER BY created_date DESC
            LIMIT {limit}
        """).df().to_dict(orient="records"))
        return {"orders": rows, "total": len(rows)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        con.close()
