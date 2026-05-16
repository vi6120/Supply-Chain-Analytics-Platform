import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { fetchDemandSignals } from '../api/client'
import { KpiCard, StatusBadge, LoadingSpinner, ErrorMessage, FilterBar, FilterSelect } from '../components/ui'

const DAY_OPTIONS = [
  { value: '', label: 'All time' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '60', label: 'Last 60 days' },
  { value: '90', label: 'Last 90 days' },
]

const MATERIAL_OPTIONS = [
  { value: '', label: 'All materials' },
  ...['MAT005', 'MAT006', 'MAT007', 'MAT008', 'MAT009', 'MAT010']
    .map(m => ({ value: m, label: m }))
]

export default function Demand() {
  const [data, setData] = useState(null)
  const [days, setDays] = useState('')
  const [material, setMaterial] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    const params = {}
    if (days) params.days = days
    if (material) params.material = material
    fetchDemandSignals(params)
      .then(r => setData(r.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [days, material])

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error} />

  const totalRevenue = data.signals.reduce((a, b) => a + (b.total_revenue || 0), 0)
  const totalDemand = data.signals.reduce((a, b) => a + (b.total_demand_qty || 0), 0)
  const avgFulfill = data.signals.length
    ? data.signals.reduce((a, b) => a + (b.overall_fulfillment_pct || 0), 0) / data.signals.length
    : 0

  const chartData = Object.values(
    data.signals.reduce((acc, s) => {
      if (!acc[s.material_id]) acc[s.material_id] = { material_id: s.material_id, avg_daily_demand: 0, count: 0 }
      acc[s.material_id].avg_daily_demand += s.avg_daily_demand || 0
      acc[s.material_id].count += 1
      return acc
    }, {})
  ).map(m => ({
    material_id: m.material_id,
    avg_daily_demand: parseFloat((m.avg_daily_demand / m.count).toFixed(1)),
  })).sort((a, b) => b.avg_daily_demand - a.avg_daily_demand)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-3">
        <KpiCard label="Total revenue" value={`€${(totalRevenue / 1e6).toFixed(1)}M`} sub="filtered period" />
        <KpiCard label="Total demand" value={totalDemand.toLocaleString()} sub="units ordered" />
        <KpiCard label="Avg fulfillment" value={`${avgFulfill.toFixed(1)}%`} sub="delivered vs ordered" subColor="text-green-600" />
        <KpiCard label="Materials shown" value={data.signals.length} sub="matching filters" />
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-900">Average daily demand by material</span>
          <FilterBar>
            <FilterSelect label="Period" value={days} onChange={setDays} options={DAY_OPTIONS} />
            <FilterSelect label="Material" value={material} onChange={setMaterial} options={MATERIAL_OPTIONS} />
          </FilterBar>
        </div>
        <div style={{ height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <XAxis dataKey="material_id" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #f3f4f6' }} formatter={v => [v.toFixed(1), 'Avg daily demand']} />
              <Bar dataKey="avg_daily_demand" radius={[4, 4, 0, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={i % 2 === 0 ? '#3b82f6' : '#93c5fd'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-4">
        <div className="text-sm font-medium text-gray-900 mb-3">Demand signals by material</div>
        <div className="flex flex-col divide-y divide-gray-50">
          <div className="grid grid-cols-7 gap-2 pb-2 text-xs font-medium text-gray-400 uppercase tracking-wide">
            <span>Material</span><span>Plant</span><span>Total demand</span><span>Avg/day</span><span>Peak/day</span><span>Fulfillment</span><span className="text-right">Category</span>
          </div>
          {data.signals.map((s, i) => (
            <div key={i} className="grid grid-cols-7 gap-2 py-2.5 items-center text-sm">
              <span className="font-medium text-gray-900">{s.material_id}</span>
              <span className="text-gray-400">{s.plant}</span>
              <span className="text-gray-700">{s.total_demand_qty?.toLocaleString()}</span>
              <span className="text-gray-700">{s.avg_daily_demand?.toFixed(1)}</span>
              <span className="text-gray-700">{s.peak_daily_demand?.toLocaleString()}</span>
              <span className="text-gray-700">{s.overall_fulfillment_pct?.toFixed(1)}%</span>
              <div className="flex justify-end"><StatusBadge status={s.demand_category} /></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}