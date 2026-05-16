with source as (
    select * from read_parquet(
        '/Users/vikasramaswamy/Github Projects/supply_chain_pipeline/data/raw/sd/vbak.parquet'
    )
)

select
    VBELN::varchar       as so_number,
    KUNNR::varchar       as customer_id,
    VKORG::varchar       as sales_org,
    WAERS::varchar       as currency,
    NETWR::double        as order_value,
    GBSTK::varchar       as overall_status,
    ERDAT::date          as created_date,
    ERNAM::varchar       as created_by
from source