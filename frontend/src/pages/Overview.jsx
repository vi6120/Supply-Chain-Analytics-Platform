import { useEffect, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { fetchOverviewKpis, fetchReorderAlerts, fetchDemandTrend } from '../api/client'
import { KpiCard, Card, StatusBadge, LoadingSpinner, ErrorMessage, Badge, FilterBar, FilterSelect } from '../components/ui'

const DAY_OPTIONS = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '60', label: 'Last 60 days' },
  { value: '90', label: 'Last 90 days' },
]

const LIMIT_OPTIONS = [
  { value: '5', label: 'Top 5' },
  { value: '10', label: 'Top 10' },
  { value: '20', label: 'Top 20' },
]

export default function Overview() {
  const [kpis, setKpis] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [trend, setTrend] = useState([])
  const [days, setDays] = useState('30')
  const [limit, setLimit] = useState('10')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetchOverviewKpis(),
      fetchReorderAlerts(limit),
      fetchDemandTrend(days),
    ])
      .then(([kpisRes, alertsRes, trendRes]) => {
        setKpis(kpisRes.data)
        setAlerts(alertsRes.data.alerts)
        setTrend(trendRes.data.trend.map(d => ({
          date: d.created_date.slice(5, 10),
          demand: d.total_demand,
          orders: d.orders,
        })))
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [days, limit])

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error} />

  const stockMap = Object.fromEntries(kpis.stock_status.map(s => [s.stock_status, s.count]))
  const totalStock = kpis.stock_status.reduce((a, b) => a + b.count, 0)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-3">
        <KpiCard label="Total purchase orders" value={kpis.total_pos.toLocaleString()} sub={`${kpis.total_po_lines.toLocaleString()} line items`} />
        <KpiCard label="Open alerts" value={kpis.open_alerts.toLocaleString()} sub="overdue PO lines" subColor="text-red-500" />
        <KpiCard label="Avg PO fulfillment" value={`${kpis.avg_fulfillment_pct}%`} sub="↑ on track" subColor="text-green-600" />
        <KpiCard label="Sales orders" value={kpis.total_orders.toLocaleString()} sub={`${kpis.total_so_lines.toLocaleString()} line items`} />
      </div>

      <div className="flex gap-4 items-stretch">
        <div className="flex-1 min-w-0 bg-white border border-gray-100 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-900">Demand trend</span>
            <FilterBar>
              <FilterSelect
                label="Period"
                value={days}
                onChange={setDays}
                options={DAY_OPTIONS}
              />
            </FilterBar>
          </div>
          <div style={{ height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="demandGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} interval={Math.floor(trend.length / 6)} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #f3f4f6', boxShadow: 'none' }} />
                <Area type="monotone" dataKey="demand" stroke="#3b82f6" strokeWidth={2} fill="url(#demandGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="w-56 flex-shrink-0 bg-white border border-gray-100 rounded-xl p-4">
          <div className="text-sm font-medium text-gray-900 mb-3">Stock status</div>
          <div className="flex flex-col gap-4 mt-2">
            {[
              { label: 'Healthy', key: 'Healthy', color: 'bg-green-400' },
              { label: 'Critical', key: 'Critical', color: 'bg-red-400' },
              { label: 'Stockout', key: 'Stockout', color: 'bg-red-700' },
            ].map(({ label, key, color }) => {
              const count = stockMap[key] || 0
              const pct = totalStock > 0 ? (count / totalStock) * 100 : 0
              return (
                <div key={key}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-gray-500">{label}</span>
                    <span className="font-medium text-gray-800">{count}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full">
                    <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900">Reorder alerts</span>
            <Badge label={`${alerts.length} critical`} variant="red" />
          </div>
          <FilterBar>
            <FilterSelect label="Show" value={limit} onChange={setLimit} options={LIMIT_OPTIONS} />
          </FilterBar>
        </div>
        <div className="flex flex-col divide-y divide-gray-50">
          <div className="grid grid-cols-5 gap-2 pb-2 text-xs font-medium text-gray-400 uppercase tracking-wide">
            <span>Material</span><span>Plant</span><span>Stock</span><span>Days left</span><span className="text-right">Action</span>
          </div>
          {alerts.map((a, i) => (
            <div key={i} className="grid grid-cols-5 gap-2 py-2.5 items-center text-sm">
              <span className="font-medium text-gray-900">{a.material_id}</span>
              <span className="text-gray-400">{a.plant}</span>
              <span className="text-gray-700">{a.current_stock?.toLocaleString()}</span>
              <span className="text-gray-700">{a.days_until_stockout?.toFixed(1) ?? '—'}</span>
              <div className="flex justify-end"><StatusBadge status={a.reorder_recommendation} /></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}