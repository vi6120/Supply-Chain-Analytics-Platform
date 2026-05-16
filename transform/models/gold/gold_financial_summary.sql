with turnover as (
    select * from {{ ref('gold_inventory_turnover') }}
),

demand as (
    select * from {{ ref('gold_demand_signals') }}
),

po_spend as (
    select
        material_id,
        round(sum(line_value), 2)   as total_po_spend,
        count(distinct vendor_id)   as vendor_count,
        round(avg(net_price), 2)    as avg_purchase_price
    from {{ ref('silver_purchase_orders') }}
    group by material_id
),

combined as (
    select
        t.material_id,
        t.plant,
        t.current_stock,
        t.avg_unit_price,
        t.inventory_value,
        t.total_issues_value                        as cogs_estimate,
        t.carrying_cost_period,
        t.annualised_turnover,
        t.turnover_rating,
        t.movement_status,
        coalesce(d.total_revenue, 0)                as total_revenue,
        coalesce(d.avg_daily_demand, 0)             as avg_daily_demand,
        coalesce(d.overall_fulfillment_pct, 0)      as fulfillment_pct,
        coalesce(p.total_po_spend, 0)               as total_po_spend,
        coalesce(p.vendor_count, 0)                 as vendor_count,
        round(
            coalesce(d.total_revenue, 0)
            - t.total_issues_value
        , 2)                                        as gross_margin,
        round(
            case
                when coalesce(d.total_revenue, 0) = 0 then null
                else (
                    coalesce(d.total_revenue, 0) - t.total_issues_value
                ) / nullif(d.total_revenue, 0) * 100
            end
        , 1)                                        as gross_margin_pct
    from turnover t
    left join demand   d on t.material_id = d.material_id
                         and t.plant      = d.plant
    left join po_spend p on t.material_id = p.material_id
)

select
    *,
    round(inventory_value + carrying_cost_period, 2) as total_working_capital,
    case
        when gross_margin_pct >= 40     then 'High margin'
        when gross_margin_pct >= 20     then 'Medium margin'
        when gross_margin_pct >= 0      then 'Low margin'
        when gross_margin_pct is null   then 'No sales'
        else                                'Loss making'
    end                                 as margin_category
from combined
order by inventory_value desc