import { useEffect, useState } from 'react'
import { fetchRiskSummary } from '../api/client'
import { KpiCard, StatusBadge, LoadingSpinner, ErrorMessage, FilterBar, FilterSelect } from '../components/ui'

const CATEGORY_OPTIONS = [
  { value: '', label: 'All categories' },
  { value: 'High risk', label: 'High risk' },
  { value: 'Medium risk', label: 'Medium risk' },
  { value: 'Low risk', label: 'Low risk' },
]

export default function Risk() {
  const [data, setData] = useState(null)
  const [category, setCategory] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    const params = {}
    if (category) params.category = category
    fetchRiskSummary(params)
      .then(r => setData(r.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [category])

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error} />

  const s = data.summary

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-3">
        <KpiCard label="Avg risk score" value={s.avg_risk_score?.toFixed(1)} sub="lower is better" subColor="text-green-600" />
        <KpiCard label="Single source" value={s.single_source_count} sub="materials at risk" subColor={s.single_source_count > 0 ? 'text-red-500' : 'text-green-600'} />
        <KpiCard label="High risk materials" value={s.high_risk_count} sub="immediate review" subColor={s.high_risk_count > 0 ? 'text-red-500' : 'text-green-600'} />
        <KpiCard label="Perfect order rate" value={`${s.avg_perfect_order_rate?.toFixed(1)}%`} sub="complete & on time" subColor="text-amber-500" />
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-900">Supply risk by material</span>
          <FilterBar>
            <FilterSelect label="Category" value={category} onChange={setCategory} options={CATEGORY_OPTIONS} />
          </FilterBar>
        </div>
        <div className="flex flex-col divide-y divide-gray-50">
          <div className="grid grid-cols-7 gap-2 pb-2 text-xs font-medium text-gray-400 uppercase tracking-wide">
            <span>Material</span><span>Vendors</span><span>Single source</span><span>Concentration</span><span>Perfect order</span><span>Risk score</span><span className="text-right">Category</span>
          </div>
          {data.by_material.map((m, i) => (
            <div key={i} className="grid grid-cols-7 gap-2 py-2.5 items-center text-sm">
              <span className="font-medium text-gray-900">{m.material_id}</span>
              <span className="text-gray-500">{m.vendor_count}</span>
              <span className={m.is_single_source ? 'text-red-500 font-medium' : 'text-green-600'}>
                {m.is_single_source ? 'Yes' : 'No'}
              </span>
              <span className="text-gray-500 text-xs">{m.concentration_risk?.split('—')[0].trim()}</span>
              <span className="text-gray-700">{m.perfect_order_rate?.toFixed(1)}%</span>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full">
                  <div className="h-full bg-amber-400 rounded-full" style={{ width: `${m.supply_risk_score}%` }} />
                </div>
                <span className="text-xs text-gray-600 w-8">{m.supply_risk_score?.toFixed(0)}</span>
              </div>
              <div className="flex justify-end"><StatusBadge status={m.risk_category} /></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}