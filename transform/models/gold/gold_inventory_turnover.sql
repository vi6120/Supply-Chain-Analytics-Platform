with inventory as (
    select * from {{ ref('gold_inventory_kpis') }}
),

unit_prices as (
    select
        material_id,
        round(avg(net_price), 2) as avg_unit_price
    from {{ ref('silver_purchase_orders') }}
    group by material_id
),

valued as (
    select
        i.material_id,
        i.plant,
        i.current_stock,
        i.total_receipts_qty,
        i.total_issues_qty,
        i.avg_daily_consumption,
        i.last_movement_date,
        i.stock_status,
        coalesce(p.avg_unit_price, 0)               as avg_unit_price,
        round(i.current_stock
            * coalesce(p.avg_unit_price, 0), 2)     as inventory_value,
        round(i.total_issues_qty
            * coalesce(p.avg_unit_price, 0), 2)     as total_issues_value,
        round(i.total_receipts_qty
            * coalesce(p.avg_unit_price, 0), 2)     as total_receipts_value
    from inventory i
    left join unit_prices p on i.material_id = p.material_id
),

with_ratios as (
    select
        *,
        round(
            total_issues_value
            / nullif((inventory_value + total_receipts_value) / 2, 0)
        , 2)                                        as turnover_ratio,
        round(
            (total_issues_value / 91.0 * 365)
            / nullif((inventory_value + total_receipts_value) / 2, 0)
        , 2)                                        as annualised_turnover,
        (current_date - last_movement_date)         as days_since_last_movement,
        round(inventory_value * 0.25 / 365 * 91, 2) as carrying_cost_period
    from valued
)

select
    *,
    case
        when days_since_last_movement > 60  then 'Obsolete risk'
        when days_since_last_movement > 30  then 'Slow moving'
        when days_since_last_movement > 14  then 'Moderate'
        else                                     'Active'
    end                                         as movement_status,
    case
        when annualised_turnover > 24       then 'Very high — stockout risk'
        when annualised_turnover > 12       then 'High — healthy'
        when annualised_turnover > 6        then 'Medium — monitor'
        when annualised_turnover > 0        then 'Low — excess stock'
        else                                    'No movement'
    end                                         as turnover_rating
from with_ratios
order by annualised_turnover desc nulls last