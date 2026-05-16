export function KpiCard({ label, value, sub, subColor = 'text-gray-400' }) {
    return (
        <div className="bg-gray-50 rounded-lg p-3 flex-1 min-w-0">
            <div className="text-xs text-gray-400 mb-1">{label}</div>
            <div className="text-2xl font-medium text-gray-900">{value}</div>
            {sub && <div className={`text-xs mt-1 ${subColor}`}>{sub}</div>}
        </div>
    )
}

export function Badge({ label, variant = 'blue' }) {
    const styles = {
        red: 'bg-red-50 text-red-800',
        green: 'bg-green-50 text-green-800',
        amber: 'bg-amber-50 text-amber-800',
        blue: 'bg-blue-50 text-blue-800',
        gray: 'bg-gray-100 text-gray-600',
    }
    return (
        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${styles[variant]}`}>
            {label}
        </span>
    )
}

export function Card({ title, children, badge }) {
    return (
        <div className="bg-white border border-gray-100 rounded-xl p-4">
            {title && (
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm font-medium text-gray-900">{title}</span>
                    {badge}
                </div>
            )}
            {children}
        </div>
    )
}

export function LoadingSpinner() {
    return (
        <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
    )
}

export function ErrorMessage({ message }) {
    return (
        <div className="bg-red-50 border border-red-100 rounded-lg p-4 text-sm text-red-700">
            {message}
        </div>
    )
}

export function StatusBadge({ status }) {
    const map = {
        'STOCKOUT — Order immediately': 'red',
        'CRITICAL — Below safety stock': 'red',
        'REORDER — Place order now': 'amber',
        'MONITOR — Approaching reorder point': 'amber',
        'OK — Stock sufficient': 'green',
        'Stockout': 'red',
        'Critical': 'red',
        'Low': 'amber',
        'Healthy': 'green',
        'Preferred': 'green',
        'Approved': 'blue',
        'Restricted': 'amber',
        'Under review': 'red',
        'High risk': 'red',
        'Medium risk': 'amber',
        'Low risk': 'green',
        'High margin': 'green',
        'Medium margin': 'blue',
        'Low margin': 'amber',
        'No sales': 'gray',
        'Overdue': 'red',
        'Complete': 'green',
        'Pending': 'blue',
    }
    return <Badge label={status} variant={map[status] || 'gray'} />
}

export function FilterBar({ children }) {
    return (
        <div className="flex items-center gap-3 flex-wrap mb-4">
            {children}
        </div>
    )
}

export function FilterSelect({ label, value, onChange, options }) {
    return (
        <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400 whitespace-nowrap">{label}</span>
            <select
                value={value}
                onChange={e => onChange(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 outline-none focus:border-blue-400 cursor-pointer"
            >
                {options.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                ))}
            </select>
        </div>
    )
}