import { useEffect, useState } from 'react'
import { fetchInventoryKpis } from '../api/client'
import { KpiCard, Card, StatusBadge, LoadingSpinner, ErrorMessage, FilterBar, FilterSelect } from '../components/ui'

const PLANT_OPTIONS = [
  { value: '', label: 'All plants' },
  { value: '1000', label: 'Plant 1000' },
  { value: '1100', label: 'Plant 1100' },
  { value: '2000', label: 'Plant 2000' },
  { value: '2100', label: 'Plant 2100' },
]

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'Stockout', label: 'Stockout' },
  { value: 'Critical', label: 'Critical' },
  { value: 'Low', label: 'Low' },
  { value: 'Healthy', label: 'Healthy' },
]

export default function Inventory() {
  const [data, setData] = useState(null)
  const [plant, setPlant] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    const params = {}
    if (plant) params.plant = plant
    if (status) params.status = status
    fetchInventoryKpis(params)
      .then(r => setData(r.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [plant, status])

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error} />

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-3">
        <KpiCard label="Total materials" value={data.summary.total_materials} sub="matching filters" />
        <KpiCard label="Stockout" value={data.summary.stockout_count} sub="immediate action" subColor="text-red-500" />
        <KpiCard label="Critical (≤7 days)" value={data.summary.critical_count} sub="reorder now" subColor="text-amber-500" />
        <KpiCard label="Healthy" value={data.summary.healthy_count} sub="30+ days supply" subColor="text-green-600" />
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-900">Stock position</span>
          <FilterBar>
            <FilterSelect label="Plant" value={plant} onChange={setPlant} options={PLANT_OPTIONS} />
            <FilterSelect label="Status" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
          </FilterBar>
        </div>
        <div className="flex flex-col divide-y divide-gray-50">
          <div className="grid grid-cols-6 gap-2 pb-2 text-xs font-medium text-gray-400 uppercase tracking-wide">
            <span>Material</span><span>Plant</span><span>Current stock</span><span>Avg daily use</span><span>Days supply</span><span className="text-right">Status</span>
          </div>
          {data.materials.map((m, i) => (
            <div key={i} className="grid grid-cols-6 gap-2 py-2.5 items-center text-sm">
              <span className="font-medium text-gray-900">{m.material_id}</span>
              <span className="text-gray-400">{m.plant}</span>
              <span className="text-gray-700">{m.current_stock?.toLocaleString()}</span>
              <span className="text-gray-700">{m.avg_daily_consumption?.toFixed(1) ?? '—'}</span>
              <span className="text-gray-700">{m.days_of_supply?.toFixed(1) ?? '—'}</span>
              <div className="flex justify-end"><StatusBadge status={m.stock_status} /></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}