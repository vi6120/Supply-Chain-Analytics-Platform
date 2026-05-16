with inventory as (
    select * from {{ ref('gold_inventory_kpis') }}
),

lead_times as (
    select
        material_id,
        round(avg(planned_delivery_date - po_date), 0) as avg_lead_time_days
    from {{ ref('silver_purchase_orders') }}
    where planned_delivery_date > po_date
    group by material_id
),

daily_demand as (
    select
        material_id,
        created_date,
        sum(ordered_qty) as daily_qty
    from {{ ref('silver_sales_orders') }}
    group by material_id, created_date
),

demand_stats as (
    select
        material_id,
        round(stddev_pop(daily_qty), 2) as demand_std_dev
    from daily_demand
    group by material_id
),

combined as (
    select
        i.material_id,
        i.plant,
        i.current_stock,
        i.avg_daily_consumption,
        i.days_of_supply,
        i.stock_status,
        coalesce(l.avg_lead_time_days, 14)              as avg_lead_time_days,
        coalesce(d.demand_std_dev, 0)                   as demand_std_dev,
        round(
            1.65 * coalesce(d.demand_std_dev, 0)
            * sqrt(coalesce(l.avg_lead_time_days, 14))
        , 0)                                            as safety_stock,
        round(
            i.avg_daily_consumption
            * coalesce(l.avg_lead_time_days, 14)
            + 1.65 * coalesce(d.demand_std_dev, 0)
            * sqrt(coalesce(l.avg_lead_time_days, 14))
        , 0)                                            as reorder_point,
        round(
            sqrt(
                2 * (i.avg_daily_consumption * 365) * 50
                / nullif(i.avg_daily_consumption * 0.25, 0)
            )
        , 0)                                            as eoq
    from inventory i
    left join lead_times l  on i.material_id = l.material_id
    left join demand_stats d on i.material_id = d.material_id
)

select
    *,
    case
        when current_stock <= 0                     then 'STOCKOUT — Order immediately'
        when current_stock <= safety_stock          then 'CRITICAL — Below safety stock'
        when current_stock <= reorder_point         then 'REORDER — Place order now'
        when current_stock <= reorder_point * 1.5   then 'MONITOR — Approaching reorder point'
        else                                             'OK — Stock sufficient'
    end                                             as reorder_recommendation,
    greatest(0, reorder_point - current_stock)      as shortage_qty,
    round(
        current_stock / nullif(avg_daily_consumption, 0)
    , 1)                                            as days_until_stockout
from combined
order by current_stock / nullif(reorder_point, 0) asc nulls last