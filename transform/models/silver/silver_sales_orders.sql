with headers as (
    select * from {{ ref('bronze_vbak') }}
),

items as (
    select * from {{ ref('bronze_vbap') }}
),

joined as (
    select
        i.so_number,
        i.so_item,
        h.customer_id,
        h.sales_org,
        i.material_id,
        i.ordered_qty,
        i.delivered_qty,
        i.net_price,
        i.currency,
        i.plant,
        h.created_date,
        h.created_by,
        h.overall_status,
        i.delivery_status,
        round(i.ordered_qty * i.net_price, 2)       as line_value,
        round(
            case
                when i.ordered_qty = 0 then 0
                else i.delivered_qty / i.ordered_qty * 100
            end
        , 1)                                         as fulfillment_pct,
        case i.delivery_status
            when 'A' then 'Open'
            when 'B' then 'Partially delivered'
            when 'C' then 'Fully delivered'
            else 'Unknown'
        end                                          as delivery_status_text,
        case h.overall_status
            when 'A' then 'Open'
            when 'B' then 'In progress'
            when 'C' then 'Complete'
            else 'Unknown'
        end                                          as order_status_text
    from items i
    left join headers h on i.so_number = h.so_number
)

select * from joined