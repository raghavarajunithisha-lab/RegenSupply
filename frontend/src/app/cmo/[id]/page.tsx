'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

interface Inspection {
  id: number
  inspection_date: string
  classification: string
  form_483_issued: string
  observation_categories: string
}

interface EnforcementAction {
  id: number
  action_type: string
  date_issued: string
  description: string
  openfda_id: string | null
}

interface CMODetail {
  id: number
  name: string
  location: string
  fei_number: string
  risk_score: number
  risk_level: string
  inspections: Inspection[]
  enforcement_actions: EnforcementAction[]
}

export default function CMOScorecard() {
  const params = useParams()
  const router = useRouter()
  const [cmo, setCmo] = useState<CMODetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`http://localhost:8000/cmos/${params.id}`)
      .then(res => res.json())
      .then(data => {
        setCmo(data)
        setLoading(false)
      })
      .catch(console.error)
  }, [params.id])

  if (loading || !cmo) return <div className="py-20 text-center text-slate-500">Loading Scorecard...</div>

  const getRiskColor = (level: string) => {
    if (level === 'High') return 'text-red-600'
    if (level === 'Medium') return 'text-amber-600'
    return 'text-emerald-600'
  }

  const getScoreColor = (score: number) => {
    if (score >= 60) return '#ef4444' 
    if (score >= 30) return '#f59e0b' 
    return '#10b981' 
  }

  // Calculate standard circle circumference for the gauge
  const radius = 60
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (cmo.risk_score / 100) * circumference

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <button onClick={() => router.push('/')} className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1">
        ← Back to Registry
      </button>

      {/* Header Profile */}
      <div className="glass-panel p-8 flex flex-col md:flex-row md:items-center justify-between gap-8 border-t-4" style={{borderTopColor: getScoreColor(cmo.risk_score)}}>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-slate-900">{cmo.name}</h1>
            <span className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wide ${
              cmo.risk_level === 'High' ? 'bg-red-50 text-red-700 border-red-200' : 
              cmo.risk_level === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
              'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}>
              {cmo.risk_level} Risk Vendor
            </span>
          </div>
          <div className="mt-4 flex gap-6 text-sm text-slate-600">
            <div><span className="font-semibold text-slate-400">Location:</span> {cmo.location}</div>
            <div><span className="font-semibold text-slate-400">FDA FEI:</span> {cmo.fei_number}</div>
          </div>
          <div className="mt-6 flex gap-3">
             <button onClick={() => window.print()} className="primary-button text-sm py-1.5 shadow-sm">Generate PDF Report</button>
             <button className="secondary-button text-sm py-1.5">Manage Alerts</button>
          </div>
        </div>
        
        {/* Risk Gauge */}
        <div className="flex flex-col items-center">
          <div className="relative w-40 h-40 flex items-center justify-center">
            <svg className="transform -rotate-90 w-40 h-40">
              <circle cx="80" cy="80" r={radius} stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-100" />
              <circle cx="80" cy="80" r={radius} stroke="currentColor" strokeWidth="12" fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                style={{ color: getScoreColor(cmo.risk_score), transition: 'stroke-dashoffset 1s ease-out' }}
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className={`text-4xl font-bold ${getRiskColor(cmo.risk_level)}`}>{cmo.risk_score.toFixed(0)}</span>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-1">Score</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Inspections */}
        <div className="glass-panel p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-blue-50 flex items-center justify-center text-blue-600">📋</div>
            FDA Inspection History
          </h2>
          {cmo.inspections.length === 0 ? (
            <p className="text-slate-500 text-sm">No recorded inspections.</p>
          ) : (
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
              {cmo.inspections.map((insp, idx) => (
                <div key={insp.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-white shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10 ${
                    insp.classification === 'OAI' ? 'bg-red-500' :
                    insp.classification === 'VAI' ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}>
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded bg-white border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-bold text-slate-800">{insp.classification}</div>
                      <time className="text-xs font-medium text-slate-400">{insp.inspection_date}</time>
                    </div>
                    <div className="text-sm text-slate-600 mt-2">
                      <span className="font-semibold">Form 483 Issued:</span> {insp.form_483_issued}
                    </div>
                    {insp.form_483_issued === 'Yes' && insp.observation_categories && (
                      <div className="mt-3 space-y-1">
                        {insp.observation_categories.split(',').map((cat, i) => (
                          <div key={i} className="text-xs bg-slate-50 border border-slate-200 text-slate-600 px-2 py-1 rounded inline-block mr-1 mb-1">
                            {cat.trim()}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Enforcement */}
        <div className="glass-panel p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-red-50 flex items-center justify-center text-red-600">🚨</div>
            Enforcement & Recalls
          </h2>
          {cmo.enforcement_actions.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-emerald-100 rounded-lg bg-emerald-50/50">
              <div className="text-emerald-500 mb-2 font-bold">✓ Clear History</div>
              <p className="text-emerald-600/70 text-sm max-w-xs">No warning letters, recalls, or import alerts found in the openFDA database for this manufacturer.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cmo.enforcement_actions.map(action => (
                <div key={action.id} className="p-4 rounded-lg bg-red-50/50 border border-red-100">
                  <div className="flex justify-between items-start mb-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                      {action.action_type}
                    </span>
                    <span className="text-xs font-medium text-slate-500">{action.date_issued}</span>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed font-medium">
                    {action.description}
                  </p>
                  {action.openfda_id && (
                    <div className="mt-3 text-xs text-slate-400 font-mono">
                      openFDA Event ID: {action.openfda_id}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {/* Legend */}
          <div className="mt-8 p-4 bg-slate-50 border border-slate-200 rounded text-xs text-slate-600 space-y-2">
            <div className="font-bold text-slate-700 mb-1 uppercase tracking-wide">Classification Legend</div>
            <div className="flex gap-2 items-center"><span className="w-3 h-3 rounded-full bg-red-500"></span> <span className="font-bold">OAI:</span> Official Action Indicated (Significant Objectionable Conditions)</div>
            <div className="flex gap-2 items-center"><span className="w-3 h-3 rounded-full bg-amber-500"></span> <span className="font-bold">VAI:</span> Voluntary Action Indicated (Objectionable Conditions Found)</div>
            <div className="flex gap-2 items-center"><span className="w-3 h-3 rounded-full bg-emerald-500"></span> <span className="font-bold">NAI:</span> No Action Indicated (No Objectionable Conditions)</div>
          </div>
        </div>
      </div>
    </div>
  )
}
