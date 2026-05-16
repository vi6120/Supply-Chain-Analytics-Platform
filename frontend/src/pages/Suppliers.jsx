import { useEffect, useState } from 'react'
import { fetchSupplierScorecards } from '../api/client'
import { KpiCard, StatusBadge, LoadingSpinner, ErrorMessage, FilterBar, FilterSelect } from '../components/ui'

const RATING_OPTIONS = [
  { value: '', label: 'All ratings' },
  { value: 'Preferred', label: 'Preferred' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Restricted', label: 'Restricted' },
]

const SORT_OPTIONS = [
  { value: 'score', label: 'By score' },
  { value: 'fulfillment', label: 'By fulfillment' },
  { value: 'overdue', label: 'By overdue lines' },
]

export default function Suppliers() {
  const [data, setData] = useState(null)
  const [rating, setRating] = useState('')
  const [sortBy, setSortBy] = useState('score')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    const params = { sort_by: sortBy }
    if (rating) params.rating = rating
    fetchSupplierScorecards(params)
      .then(r => setData(r.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [rating, sortBy])

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error} />

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-3">
        <KpiCard label="Total vendors" value={data.summary.total_vendors} sub="active suppliers" />
        <KpiCard label="Preferred" value={data.summary.preferred} sub="score ≥ 85" subColor="text-green-600" />
        <KpiCard label="Approved" value={data.summary.approved} sub="score 70–84" subColor="text-blue-500" />
        <KpiCard label="Restricted" value={data.summary.restricted} sub="needs improvement" subColor="text-amber-500" />
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-900">Vendor scorecards</span>
          <FilterBar>
            <FilterSelect label="Rating" value={rating} onChange={setRating} options={RATING_OPTIONS} />
            <FilterSelect label="Sort by" value={sortBy} onChange={setSortBy} options={SORT_OPTIONS} />
          </FilterBar>
        </div>
        <div className="flex flex-col divide-y divide-gray-50">
          <div className="grid grid-cols-7 gap-2 pb-2 text-xs font-medium text-gray-400 uppercase tracking-wide">
            <span>Vendor</span><span>POs</span><span>Ordered</span><span>Received</span><span>Fulfill %</span><span>Score</span><span className="text-right">Rating</span>
          </div>
          {data.vendors.map((v, i) => (
            <div key={i} className="grid grid-cols-7 gap-2 py-2.5 items-center text-sm">
              <span className="font-medium text-gray-900">{v.vendor_id}</span>
              <span className="text-gray-500">{v.total_pos}</span>
              <span className="text-gray-700">{v.total_ordered_qty?.toLocaleString()}</span>
              <span className="text-gray-700">{v.total_received_qty?.toLocaleString()}</span>
              <span className="text-gray-700">{v.overall_fulfillment_pct?.toFixed(1)}%</span>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full">
                  <div className="h-full bg-blue-400 rounded-full" style={{ width: `${v.vendor_score}%` }} />
                </div>
                <span className="text-xs text-gray-600 w-8">{v.vendor_score?.toFixed(0)}</span>
              </div>
              <div className="flex justify-end"><StatusBadge status={v.vendor_rating} /></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}