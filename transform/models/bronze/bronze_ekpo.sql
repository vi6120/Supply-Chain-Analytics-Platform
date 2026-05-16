with source as (
    select * from read_parquet(
        '/Users/vikasramaswamy/Github Projects/supply_chain_pipeline/data/raw/mm/ekpo.parquet'
    )
)

select
EBELN               as po_number,
EBELP               as po_item,
MATNR               as material_id,
WERKS               as plant,
MENGE               as ordered_qty,
MEINS               as unit_of_measure,
NETPR               as net_price,
WAERS               as currency,
EINDT::date         as planned_delivery_date,
WEMNG               as received_qty,
ERDAT::date         as created_date            
from source