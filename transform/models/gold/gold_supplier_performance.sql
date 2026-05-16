with pos as (
    select * from {{ ref('silver_purchase_orders') }}
),

metrics as (
    select
        vendor_id,
        count(distinct po_number)                   as total_pos,
        count(*)                                    as total_lines,
        round(sum(line_value), 2)                   as total_po_value,
        round(avg(net_price), 2)                    as avg_unit_price,
        sum(ordered_qty)                            as total_ordered_qty,
        sum(received_qty)                           as total_received_qty,
        round(
            sum(received_qty)
            / nullif(sum(ordered_qty), 0) * 100
        , 1)                                        as overall_fulfillment_pct,
        count(case when receipt_status = 'Fully received'
            then 1 end)                             as fully_received_lines,
        count(case when delivery_status = 'Overdue'
            then 1 end)                             as overdue_lines,
        round(
            count(case when delivery_status = 'Overdue' then 1 end)
            * 100.0 / nullif(count(*), 0)
        , 1)                                        as overdue_pct,
        min(po_date)                                as first_po_date,
        max(po_date)                                as last_po_date
    from pos
    group by vendor_id
),

scored as (
    select
        *,
        round(
            (overall_fulfillment_pct * 0.6)
            + ((100 - overdue_pct) * 0.4)
        , 1)                                        as vendor_score
    from metrics
)

select
    *,
    case
        when vendor_score >= 85 then 'Preferred'
        when vendor_score >= 70 then 'Approved'
        when vendor_score >= 50 then 'Restricted'
        else 'Under review'
    end                                             as vendor_rating
from scored
order by vendor_score desc