from fastapi import APIRouter, HTTPException, Query
from api.database import get_connection, clean

router = APIRouter(prefix="/overview", tags=["Overview"])


@router.get("/kpis")
def get_overview_kpis():
    try:
        con = get_connection()
        po_stats = con.execute("""
            SELECT
                COUNT(DISTINCT po_number)       AS total_pos,
                COUNT(*)                        AS total_lines,
                ROUND(AVG(fulfillment_pct), 1)  AS avg_fulfillment_pct
            FROM main_silver.silver_purchase_orders
        """).fetchone()
        so_stats = con.execute("""
            SELECT
                COUNT(DISTINCT so_number)   AS total_orders,
                COUNT(*)                    AS total_lines
            FROM main_silver.silver_sales_orders
        """).fetchone()
        alert_count = con.execute("""
            SELECT COUNT(*) AS open_alerts
            FROM main_silver.silver_purchase_orders
            WHERE delivery_status = 'Overdue'
        """).fetchone()
        stock_status = clean(con.execute("""
            SELECT stock_status, COUNT(*) AS count
            FROM main_gold.gold_inventory_kpis
            GROUP BY stock_status
            ORDER BY stock_status
        """).df().to_dict(orient="records"))
        return {
            "total_pos":            po_stats[0],
            "total_po_lines":       po_stats[1],
            "avg_fulfillment_pct":  po_stats[2],
            "total_orders":         so_stats[0],
            "total_so_lines":       so_stats[1],
            "open_alerts":          alert_count[0],
            "stock_status":         stock_status,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        con.close()


@router.get("/reorder-alerts")
def get_reorder_alerts(limit: int = Query(10, ge=1, le=100)):
    try:
        con = get_connection()
        rows = clean(con.execute(f"""
            SELECT
                material_id, plant, current_stock,
                reorder_point, safety_stock,
                days_until_stockout, reorder_recommendation
            FROM main_gold.gold_reorder_alerts
            ORDER BY current_stock ASC
            LIMIT {limit}
        """).df().to_dict(orient="records"))
        return {"alerts": rows, "total": len(rows)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        con.close()


@router.get("/demand-trend")
def get_demand_trend(days: int = Query(30, ge=7, le=90)):
    try:
        con = get_connection()
        rows = clean(con.execute(f"""
            SELECT
                created_date,
                SUM(ordered_qty)              AS total_demand,
                COUNT(DISTINCT so_number)     AS orders
            FROM main_silver.silver_sales_orders
            WHERE created_date >= (
                SELECT MAX(created_date) - {days}
                FROM main_silver.silver_sales_orders
            )
            GROUP BY created_date
            ORDER BY created_date
        """).df().to_dict(orient="records"))
        return {"trend": rows, "days": days}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        con.close()
