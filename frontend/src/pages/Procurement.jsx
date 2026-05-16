import { useEffect, useState } from 'react'
import { fetchProcurementSummary, fetchOverduePOs } from '../api/client'
import { KpiCard, StatusBadge, LoadingSpinner, ErrorMessage, Badge, FilterBar, FilterSelect } from '../components/ui'

const VENDOR_OPTIONS = [
  { value: '', label: 'All vendors' },
  ...['V0001', 'V0002', 'V0003', 'V0004', 'V0005', 'V0006', 'V0007', 'V0008', 'V0009', 'V0010']
    .map(v => ({ value: v, label: v }))
]

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'Overdue', label: 'Overdue' },
  { value: 'Complete', label: 'Complete' },
  { value: 'Pending', label: 'Pending' },
]

export default function Procurement() {
  const [summary, setSummary] = useState(null)
  const [overdue, setOverdue] = useState([])
  const [vendor, setVendor] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    const params = {}
    if (vendor) params.vendor = vendor
    if (status) params.status = status
    Promise.all([
      fetchProcurementSummary(params),
      fetchOverduePOs(vendor ? { vendor } : {}),
    ])
      .then(([sRes, oRes]) => {
        setSummary(sRes.data)
        setOverdue(oRes.data.overdue)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [vendor, status])

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error} />

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-3">
        <KpiCard label="Total PO lines" value={summary.totals.total_lines.toLocaleString()} sub={`${summary.totals.total_pos} orders`} />
        <KpiCard label="Total value" value={`€${(summary.totals.total_value / 1e6).toFixed(1)}M`} sub="committed spend" />
        <KpiCard label="Avg fulfillment" value={`${summary.totals.avg_fulfillment}%`} sub="of ordered qty" subColor="text-green-600" />
        <KpiCard label="Overdue lines" value={overdue.length} sub="requiring action" subColor="text-red-500" />
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-900">PO status breakdown</span>
          <FilterBar>
            <FilterSelect label="Vendor" value={vendor} onChange={setVendor} options={VENDOR_OPTIONS} />
            <FilterSelect label="Status" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
          </FilterBar>
        </div>
        <div className="flex flex-col divide-y divide-gray-50">
          <div className="grid grid-cols-4 gap-2 pb-2 text-xs font-medium text-gray-400 uppercase tracking-wide">
            <span>Receipt status</span><span>Delivery status</span><span>Lines</span><span className="text-right">Value</span>
          </div>
          {summary.by_status.map((s, i) => (
            <div key={i} className="grid grid-cols-4 gap-2 py-2.5 items-center text-sm">
              <StatusBadge status={s.receipt_status} />
              <StatusBadge status={s.delivery_status} />
              <span className="text-gray-700">{s.lines.toLocaleString()}</span>
              <span className="text-right text-gray-700">€{(s.total_value / 1e6).toFixed(1)}M</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-medium text-gray-900">Overdue purchase orders</span>
          <Badge label={`${overdue.length} lines`} variant="red" />
        </div>
        <div className="flex flex-col divide-y divide-gray-50">
          <div className="grid grid-cols-6 gap-2 pb-2 text-xs font-medium text-gray-400 uppercase tracking-wide">
            <span>PO number</span><span>Vendor</span><span>Material</span><span>Ordered</span><span>Received</span><span className="text-right">Due date</span>
          </div>
          {overdue.map((p, i) => (
            <div key={i} className="grid grid-cols-6 gap-2 py-2.5 items-center text-sm">
              <span className="font-medium text-gray-900 text-xs">{p.po_number}</span>
              <span className="text-gray-500">{p.vendor_id}</span>
              <span className="text-gray-700">{p.material_id}</span>
              <span className="text-gray-700">{p.ordered_qty?.toLocaleString()}</span>
              <span className="text-gray-700">{p.received_qty?.toLocaleString()}</span>
              <span className="text-right text-red-500 text-xs">{p.planned_delivery_date?.slice(0, 10)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}