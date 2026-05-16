import { useEffect, useState } from 'react'
import { fetchFinancialSummary } from '../api/client'
import { KpiCard, StatusBadge, LoadingSpinner, ErrorMessage, FilterBar, FilterSelect } from '../components/ui'

const MARGIN_OPTIONS = [
  { value: '', label: 'All categories' },
  { value: 'High margin', label: 'High margin' },
  { value: 'Medium margin', label: 'Medium margin' },
  { value: 'Low margin', label: 'Low margin' },
  { value: 'No sales', label: 'No sales' },
]

const PLANT_OPTIONS = [
  { value: '', label: 'All plants' },
  { value: '1000', label: 'Plant 1000' },
  { value: '1100', label: 'Plant 1100' },
  { value: '2000', label: 'Plant 2000' },
  { value: '2100', label: 'Plant 2100' },
]

export default function Financial() {
  const [data, setData] = useState(null)
  const [margin, setMargin] = useState('')
  const [plant, setPlant] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    const params = {}
    if (margin) params.margin = margin
    if (plant) params.plant = plant
    fetchFinancialSummary(params)
      .then(r => setData(r.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [margin, plant])

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error} />

  const t = data.totals

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-3">
        <KpiCard label="Total revenue" value={`€${(t.total_revenue / 1e6).toFixed(1)}M`} sub="filtered view" />
        <KpiCard label="Gross margin" value={`${t.avg_margin_pct?.toFixed(1)}%`} sub="avg margin" subColor="text-green-600" />
        <KpiCard label="Inventory value" value={`€${(t.total_inventory_value / 1e6).toFixed(2)}M`} sub="on-hand stock" />
        <KpiCard label="Carrying cost" value={`€${(t.total_carrying_cost / 1e3).toFixed(0)}K`} sub="at 25% rate" subColor="text-amber-500" />
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-900">Gross margin by material</span>
          <FilterBar>
            <FilterSelect label="Margin" value={margin} onChange={setMargin} options={MARGIN_OPTIONS} />
            <FilterSelect label="Plant" value={plant} onChange={setPlant} options={PLANT_OPTIONS} />
          </FilterBar>
        </div>
        <div className="flex flex-col divide-y divide-gray-50">
          <div className="grid grid-cols-6 gap-2 pb-2 text-xs font-medium text-gray-400 uppercase tracking-wide">
            <span>Material</span><span>Plant</span><span>Revenue</span><span>CoGS</span><span>Margin</span><span className="text-right">Category</span>
          </div>
          {data.by_material.map((m, i) => (
            <div key={i} className="grid grid-cols-6 gap-2 py-2.5 items-center text-sm">
              <span className="font-medium text-gray-900">{m.material_id}</span>
              <span className="text-gray-400">{m.plant}</span>
              <span className="text-gray-700">{m.total_revenue ? `€${(m.total_revenue / 1e6).toFixed(1)}M` : '—'}</span>
              <span className="text-gray-700">{m.cogs_estimate ? `€${(m.cogs_estimate / 1e6).toFixed(1)}M` : '—'}</span>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full">
                  <div className="h-full bg-green-400 rounded-full" style={{ width: `${Math.max(0, m.gross_margin_pct || 0)}%` }} />
                </div>
                <span className="text-xs text-gray-600 w-10">{m.gross_margin_pct?.toFixed(1) ?? '—'}%</span>
              </div>
              <div className="flex justify-end"><StatusBadge status={m.margin_category} /></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}