-- Fails if any movement is posted before 2024 or in the future
select
    document_number,
    movement_type,
    posting_date
from {{ ref('silver_stock_movements') }}
where posting_date < '2024-01-01'
   or posting_date > current_date