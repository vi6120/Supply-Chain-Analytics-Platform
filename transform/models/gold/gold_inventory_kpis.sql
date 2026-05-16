with movements as (
    select * from {{ ref('silver_stock_movements') }}
),

snapshot as (
    select * from {{ ref('bronze_mard') }}
),

daily_movements as (
    select
        material_id,
        plant,
        posting_date,
        sum(case when movement_direction = 'Inbound'
            then quantity else 0 end)               as daily_receipts,
        sum(case when movement_direction = 'Outbound'
            then quantity else 0 end)               as daily_issues,
        count(*)                                    as movement_count
    from movements
    group by material_id, plant, posting_date
),

latest_snapshot as (
    select
        material_id,
        plant,
        unrestricted_stock                          as current_stock,
        snapshot_date
    from snapshot
    qualify row_number() over (
        partition by material_id, plant
        order by snapshot_date desc
    ) = 1
),

aggregated as (
    select
        m.material_id,
        m.plant,
        sum(m.daily_receipts)                       as total_receipts_qty,
        sum(m.daily_issues)                         as total_issues_qty,
        sum(m.movement_count)                       as total_movements,
        round(avg(m.daily_issues), 1)               as avg_daily_consumption,
        min(m.posting_date)                         as first_movement_date,
        max(m.posting_date)                         as last_movement_date
    from daily_movements m
    group by m.material_id, m.plant
),

final as (
    select
        a.material_id,
        a.plant,
        coalesce(s.current_stock, 0)                as current_stock,
        a.total_receipts_qty,
        a.total_issues_qty,
        a.avg_daily_consumption,
        a.total_movements,
        case
            when a.avg_daily_consumption = 0 then null
            else round(
                coalesce(s.current_stock, 0) / a.avg_daily_consumption
            , 1)
        end                                         as days_of_supply,
        case
            when coalesce(s.current_stock, 0) = 0   then 'Stockout'
            when a.avg_daily_consumption > 0
             and coalesce(s.current_stock, 0)
               / a.avg_daily_consumption < 7        then 'Critical'
            when a.avg_daily_consumption > 0
             and coalesce(s.current_stock, 0)
               / a.avg_daily_consumption < 30       then 'Low'
            else 'Healthy'
        end                                         as stock_status,
        a.first_movement_date,
        a.last_movement_date
    from aggregated a
    left join latest_snapshot s
        on a.material_id = s.material_id
        and a.plant = s.plant
)

select * from final