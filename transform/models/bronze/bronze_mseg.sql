with source as (
    select * from read_parquet(
        '/Users/vikasramaswamy/Github Projects/supply_chain_pipeline/data/raw/wm/mseg.parquet'
    )
)

select
    MBLNR::varchar       as document_number,
    BWART::varchar       as movement_type,
    MATNR::varchar       as material_id,
    WERKS::varchar       as plant,
    MENGE::double        as quantity,
    MEINS::varchar       as unit_of_measure,
    EBELN::varchar       as po_number,
    EBELP::varchar       as po_item,
    BUDAT::date          as posting_date,
    DMBTR::double        as amount,
    WAERS::varchar       as currency
from source