with orders as (
    select * from {{ ref('bronze_ekko') }}
),

items as (
    select * from {{ ref('bronze_ekpo') }}
),

joined as (
    select
        i.po_number,
        i.po_item,
        o.vendor_id,
        o.purchasing_org,
        o.plant,
        i.material_id,
        i.ordered_qty,
        i.received_qty,
        i.net_price,
        i.currency,
        i.planned_delivery_date,
        o.po_date,
        o.created_by,
        round(i.ordered_qty * i.net_price, 2)   as line_value,
        round(
            case
                when i.ordered_qty = 0 then 0
                else i.received_qty / i.ordered_qty * 100
            end
        , 1)                                     as fulfillment_pct,
        case
            when i.received_qty = 0              then 'Open'
            when i.received_qty < i.ordered_qty  then 'Partially received'
            when i.received_qty >= i.ordered_qty then 'Fully received'
        end                                      as receipt_status,
        case
            when i.received_qty < i.ordered_qty
             and i.planned_delivery_date < current_date then 'Overdue'
            when i.received_qty < i.ordered_qty         then 'Pending'
            else 'Complete'
        end                                      as delivery_status
    from items i
    left join orders o on i.po_number = o.po_number
)

select * from joined