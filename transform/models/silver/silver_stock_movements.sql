with movements as (
    select * from {{ ref('bronze_mseg') }}
),

enriched as (
    select
        document_number,
        posting_date,
        material_id,
        plant,
        movement_type,
        case movement_type
            when '101' then 'Goods receipt from PO'
            when '261' then 'Goods issue to production'
            when '601' then 'Goods issue outbound delivery'
            else 'Other movement'
        end                                         as movement_description,
        case movement_type
            when '101' then 'Inbound'
            else 'Outbound'
        end                                         as movement_direction,
        quantity,
        unit_of_measure,
        amount,
        currency,
        po_number,
        po_item
    from movements
)

select * from enriched