with pos as (
    select * from {{ ref('silver_purchase_orders') }}
),

sales as (
    select * from {{ ref('silver_sales_orders') }}
),

supplier_perf as (
    select * from {{ ref('gold_supplier_performance') }}
),

vendor_totals as (
    select
        material_id,
        count(distinct vendor_id)       as vendor_count,
        count(distinct po_number)       as total_pos,
        round(sum(line_value), 2)       as total_spend
    from pos
    group by material_id
),

vendor_spend as (
    select
        material_id,
        vendor_id,
        round(sum(line_value), 2)       as spend
    from pos
    group by material_id, vendor_id
),

top_vendor as (
    select
        material_id,
        vendor_id                       as primary_vendor_id,
        spend                           as primary_vendor_spend
    from vendor_spend
    qualify row_number() over (
        partition by material_id
        order by spend desc
    ) = 1
),

order_perf as (
    select
        material_id,
        count(distinct so_number)       as total_orders,
        round(
            count(distinct case
                when delivery_status_text = 'Fully delivered'
                then so_number end) * 100.0
            / nullif(count(distinct so_number), 0)
        , 1)                            as perfect_order_rate,
        round(avg(fulfillment_pct), 1)  as avg_fulfillment_pct
    from sales
    group by material_id
),

combined as (
    select
        v.material_id,
        v.vendor_count,
        v.total_pos,
        v.total_spend,
        t.primary_vendor_id,
        round(
            t.primary_vendor_spend
            / nullif(v.total_spend, 0) * 100
        , 1)                            as primary_vendor_concentration_pct,
        coalesce(o.perfect_order_rate, 0)   as perfect_order_rate,
        coalesce(o.avg_fulfillment_pct, 0)  as avg_fulfillment_pct,
        coalesce(o.total_orders, 0)         as total_customer_orders,
        sp.vendor_score                     as primary_vendor_score,
        sp.vendor_rating                    as primary_vendor_rating
    from vendor_totals v
    left join top_vendor    t  on v.material_id      = t.material_id
    left join order_perf    o  on v.material_id      = o.material_id
    left join supplier_perf sp on t.primary_vendor_id = sp.vendor_id
),

risk_scored as (
    select
        *,
        vendor_count = 1                as is_single_source,
        case
            when primary_vendor_concentration_pct = 100 then 'Critical — single source'
            when primary_vendor_concentration_pct >= 80 then 'High — over-dependent'
            when primary_vendor_concentration_pct >= 60 then 'Medium — monitor'
            else                                             'Low — well diversified'
        end                             as concentration_risk,
        round(
            (case when vendor_count = 1 then 40 else 0 end)
            + (primary_vendor_concentration_pct * 0.3)
            + ((100 - perfect_order_rate) * 0.3)
        , 1)                            as supply_risk_score
    from combined
)

select
    *,
    case
        when supply_risk_score >= 70    then 'High risk'
        when supply_risk_score >= 40    then 'Medium risk'
        else                                'Low risk'
    end                                 as risk_category
from risk_scored
order by supply_risk_score desc