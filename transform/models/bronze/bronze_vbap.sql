with source as (
    select * from read_parquet(
        '/Users/vikasramaswamy/Github Projects/supply_chain_pipeline/data/raw/sd/vbap.parquet'
    )
)

select
    VBELN::varchar       as so_number,
    POSNR::varchar       as so_item,
    MATNR::varchar       as material_id,
    KWMENG::double       as ordered_qty,
    MEINS::varchar       as unit_of_measure,
    NETPR::double        as net_price,
    WAERS::varchar       as currency,
    WERKS::varchar       as plant,
    LFIMG::double        as delivered_qty,
    WBSTK::varchar       as delivery_status,
    ERDAT::date          as created_date
from source