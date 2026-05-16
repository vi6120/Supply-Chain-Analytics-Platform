-- Fails if any PO line shows more received than ordered
-- (would indicate a data entry error in goods receipts)
select
    po_number,
    po_item,
    ordered_qty,
    received_qty
from {{ ref('silver_purchase_orders') }}
where received_qty > ordered_qty * 1.01