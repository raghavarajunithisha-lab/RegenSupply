'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'

interface CMO {
  id: number
  name: string
  location: string
  fei_number: string
  risk_score: number
  risk_level: string
}

export default function Dashboard() {
  const router = useRouter()
  const [cmos, setCmos] = useState<CMO[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  
  // Filtering state
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRisk, setFilterRisk] = useState('All')
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newVendor, setNewVendor] = useState({ name: '', location: '', fei_number: '' })
  const [addingVendor, setAddingVendor] = useState(false)

  const fetchData = async () => {
    try {
      const res = await fetch('http://localhost:8000/cmos')
      const data = await res.json()
      setCmos(data)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleSync = async () => {
    setSyncing(true)
    try {
      await fetch('http://localhost:8000/cmos/sync', { method: 'POST' })
      setTimeout(fetchData, 2000) // Wait a bit for sync to process
    } catch (e) {}
    setTimeout(() => setSyncing(false), 2000)
  }

  const handleAddVendor = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddingVendor(true)
    try {
      const res = await fetch('http://localhost:8000/cmos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newVendor)
      })
      if (res.ok) {
        await fetchData()
        setIsModalOpen(false)
        setNewVendor({ name: '', location: '', fei_number: '' })
      }
    } catch (error) {
      console.error("Failed to add vendor", error)
    }
    setAddingVendor(false)
  }

  const getRiskColor = (level: string) => {
    if (level === 'High') return 'bg-red-50 text-red-700 border-red-200'
    if (level === 'Medium') return 'bg-amber-50 text-amber-700 border-amber-200'
    return 'bg-green-50 text-green-700 border-green-200'
  }

  const getScoreColor = (score: number) => {
    if (score >= 60) return '#ef4444' // red-500
    if (score >= 30) return '#f59e0b' // amber-500
    return '#10b981' // emerald-500
  }

  // Derived filtered data
  const filteredCmos = useMemo(() => {
    return cmos.filter(cmo => {
      const matchesSearch = cmo.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            cmo.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            cmo.fei_number.includes(searchQuery)
      const matchesRisk = filterRisk === 'All' ? true : cmo.risk_level === filterRisk
      return matchesSearch && matchesRisk
    })
  }, [cmos, searchQuery, filterRisk])

  if (loading) return <div className="py-20 text-center text-slate-500">Loading CMO integrity data...</div>

  const avgRisk = cmos.length ? (cmos.reduce((acc, c) => acc + c.risk_score, 0) / cmos.length).toFixed(1) : 0
  const highRiskCount = cmos.filter(c => c.risk_level === 'High').length

  return (
    <div className="space-y-8 relative">
      {/* Modal overlays */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-slate-900">Add New CMO Vendor</h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
            </div>
            <form onSubmit={handleAddVendor} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Manufacturer Name</label>
                <input required type="text" value={newVendor.name} onChange={e => setNewVendor({...newVendor, name: e.target.value})} className="w-full border border-slate-300 rounded-md py-2 px-3 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="e.g. Novartis Technical Operations" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Location Details</label>
                <input required type="text" value={newVendor.location} onChange={e => setNewVendor({...newVendor, location: e.target.value})} className="w-full border border-slate-300 rounded-md py-2 px-3 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="e.g. Basel, Switzerland" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">FDA FEI # (10 digits)</label>
                <input required type="text" value={newVendor.fei_number} onChange={e => setNewVendor({...newVendor, fei_number: e.target.value})} className="w-full border border-slate-300 rounded-md py-2 px-3 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="e.g. 3008476565" />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="secondary-button !text-sm">Cancel</button>
                <button type="submit" disabled={addingVendor} className="primary-button !text-sm">
                  {addingVendor ? 'Adding...' : 'Add Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">CMO Risk Intelligence</h1>
          <p className="text-slate-500 mt-2 max-w-2xl">
            Monitor openFDA enforcement actions, 483 inspection classifications, and compliance risk scores across Regeneron's third-party contract manufacturing network.
          </p>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={handleSync} disabled={syncing} className="secondary-button whitespace-nowrap flex items-center gap-2">
            {syncing ? '↻ Synchronizing openFDA...' : '↻ Sync FDA Databases'}
          </button>
          <button type="button" onClick={() => setIsModalOpen(true)} className="primary-button whitespace-nowrap">
            + Add Vendor to Watchlist
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-panel p-5 border-l-4 border-l-blue-500">
          <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Tracked Vendors</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{cmos.length}</p>
        </div>
        <div className="glass-panel p-5 border-l-4 border-l-slate-400">
          <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Average Risk Score</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{avgRisk} <span className="text-sm font-normal text-slate-400">/ 100</span></p>
        </div>
        <div className="glass-panel p-5 border-l-4 border-l-red-500">
          <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">High Risk Vendors</p>
          <p className="text-3xl font-bold text-red-600 mt-1">{highRiskCount} <span className="text-sm font-normal text-slate-400">flagged</span></p>
        </div>
        <div className="glass-panel p-5 border-l-4 border-l-emerald-500">
          <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">FDA Updates (30d)</p>
          <p className="text-3xl font-bold text-emerald-600 mt-1">2 <span className="text-sm font-normal text-slate-400">new actions</span></p>
        </div>
      </div>

      {/* Main Table */}
      <div className="glass-panel overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h2 className="text-lg font-semibold text-slate-800">Contract Manufacturer Supplier Registry</h2>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative">
              <input 
                type="text" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by name, location, FEI..." 
                className="text-sm border border-slate-300 rounded-md py-1.5 px-3 w-full sm:w-64 focus:ring-blue-500 focus:border-blue-500 outline-none" 
              />
            </div>
            <select 
              value={filterRisk} 
              onChange={e => setFilterRisk(e.target.value)}
              className="text-sm border border-slate-300 rounded-md py-1.5 px-3 outline-none focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="All">All Risk Levels</option>
              <option value="High">High Risk</option>
              <option value="Medium">Medium Risk</option>
              <option value="Low">Low Risk</option>
            </select>
          </div>

        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="p-4 font-medium border-b border-slate-200">Manufacturer Name</th>
                <th className="p-4 font-medium border-b border-slate-200">Location</th>
                <th className="p-4 font-medium border-b border-slate-200">FDA FEI #</th>
                <th className="p-4 font-medium border-b border-slate-200">Risk Assessment</th>
                <th className="p-4 font-medium border-b border-slate-200 text-center">Score (0-100)</th>
                <th className="p-4 font-medium border-b border-slate-200"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCmos.map((cmo) => (
                <tr key={cmo.id} className="hover:bg-blue-50/30 transition-colors group cursor-pointer" onClick={() => router.push(`/cmo/${cmo.id}`)}>
                  <td className="p-4">
                    <div className="font-semibold text-slate-900">{cmo.name}</div>
                  </td>
                  <td className="p-4 text-sm text-slate-600">{cmo.location}</td>
                  <td className="p-4 text-sm font-mono text-slate-500">{cmo.fei_number}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getRiskColor(cmo.risk_level)}`}>
                      {cmo.risk_level} Risk
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-24 bg-slate-200 rounded-full h-2.5">
                        <div className="h-2.5 rounded-full" style={{ width: `${cmo.risk_score}%`, backgroundColor: getScoreColor(cmo.risk_score) }}></div>
                      </div>
                      <span className="text-sm font-bold w-8 text-right text-slate-700">{cmo.risk_score}</span>
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <span className="text-blue-600 text-sm font-medium group-hover:underline">View Audit Details →</span>
                  </td>
                </tr>
              ))}
              {filteredCmos.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    {cmos.length === 0 ? "No manufacturers tracked yet." : "No manufacturers match your filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
