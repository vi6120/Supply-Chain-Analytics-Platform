import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
})

export const fetchOverviewKpis = () => api.get('/overview/kpis')
export const fetchReorderAlerts = (limit) => api.get('/overview/reorder-alerts', { params: { limit } })
export const fetchDemandTrend = (days) => api.get('/overview/demand-trend', { params: { days } })
export const fetchInventoryKpis = (params) => api.get('/inventory/kpis', { params })
export const fetchInventoryTurnover = () => api.get('/inventory/turnover')
export const fetchProcurementSummary = (params) => api.get('/procurement/summary', { params })
export const fetchOverduePOs = (params) => api.get('/procurement/overdue', { params })
export const fetchDemandSignals = (params) => api.get('/demand/signals', { params })
export const fetchSalesOrders = (params) => api.get('/demand/orders', { params })
export const fetchSupplierScorecards = (params) => api.get('/suppliers/scorecards', { params })
export const fetchFinancialSummary = (params) => api.get('/financial/summary', { params })
export const fetchRiskSummary = (params) => api.get('/risk/summary', { params })
export const askAdvisor = (question) => api.post('/ai/ask', { question })