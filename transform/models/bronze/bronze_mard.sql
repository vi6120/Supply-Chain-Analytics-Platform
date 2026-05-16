with source as (
    select * from read_parquet(
        '/Users/vikasramaswamy/Github Projects/supply_chain_pipeline/data/raw/wm/mard.parquet'
    )
)

select
    MATNR::varchar       as material_id,
    WERKS::varchar       as plant,
    LGORT::varchar       as storage_location,
    LABST::double        as unrestricted_stock,
    SNAPSHOT_DATE::date  as snapshot_date
from source