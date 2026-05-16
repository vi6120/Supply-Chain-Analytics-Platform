with sales as (
    select * from {{ ref('silver_sales_orders') }}
),

daily as (
    select
        material_id,
        plant,
        created_date,
        count(distinct so_number)                   as orders_per_day,
        sum(ordered_qty)                            as total_ordered_qty,
        sum(delivered_qty)                          as total_delivered_qty,
        sum(line_value)                             as total_order_value,
        round(
            sum(delivered_qty)
            / nullif(sum(ordered_qty), 0) * 100
        , 1)                                        as daily_fulfillment_pct
    from sales
    group by material_id, plant, created_date
),

aggregated as (
    select
        material_id,
        plant,
        count(distinct created_date)                as active_days,
        sum(total_ordered_qty)                      as total_demand_qty,
        sum(total_delivered_qty)                    as total_fulfilled_qty,
        round(avg(total_ordered_qty), 1)            as avg_daily_demand,
        max(total_ordered_qty)                      as peak_daily_demand,
        min(total_ordered_qty)                      as min_daily_demand,
        round(sum(total_order_value), 2)            as total_revenue,
        round(
            sum(total_delivered_qty)
            / nullif(sum(total_ordered_qty), 0) * 100
        , 1)                                        as overall_fulfillment_pct,
        min(created_date)                           as demand_from,
        max(created_date)                           as demand_to
    from daily
    group by material_id, plant
)

select
    *,
    round(peak_daily_demand / nullif(avg_daily_demand, 0), 2) as demand_variability,
    case
        when avg_daily_demand > 200  then 'High velocity'
        when avg_daily_demand > 100  then 'Medium velocity'
        when avg_daily_demand > 0    then 'Low velocity'
        else 'No demand'
    end                                             as demand_category
from aggregated
order by avg_daily_demand desc