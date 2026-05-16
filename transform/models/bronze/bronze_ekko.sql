with source as (
    select * from read_parquet(
        '/Users/vikasramaswamy/Github Projects/supply_chain_pipeline/data/raw/mm/ekko.parquet'
    )
)

select
    EBELN                           as po_number,
    LIFNR                           as vendor_id,
    EKORG                           as purchasing_org,
    WERKS                           as plant,
    WAERS                           as currency,
    BEDAT::date                     as po_date,
    ERNAM                           as created_by,
    ERDAT::date                     as created_date
from source