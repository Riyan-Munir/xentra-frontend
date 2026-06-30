import { useState, useEffect } from 'react'
import Skeleton from '../ui/Skeleton'
import Modal from '../ui/Modal'
import Select from '../ui/Select'
import { jobService } from '../../services/jobService'

const CATEGORIES = ['Web Dev', 'Mobile', 'Design', 'Writing', 'Marketing', 'Other', 'All']
const BUDGET_OPTIONS = [
    { value: '', label: 'Any Budget' },
    { value: '0-100', label: '$0 - $100' },
    { value: '100-500', label: '$100 - $500' },
    { value: '500-1000', label: '$500 - $1,000' },
    { value: '1000+', label: '$1,000+' },
]
const SORT_OPTIONS = [
    { value: '-created_at', label: 'Newest' },
    { value: 'budget', label: 'Budget: Low' },
    { value: '-budget', label: 'Budget: High' },
]

export default function Applications({ profile, addNotification, fetchProfile }) {
    const [jobs, setJobs] = useState([])
    const [loading, setLoading] = useState(true)
    const [filters, setFilters] = useState({ category: 'All', budget_level: '', is_featured: false, sort_by: '-created_at', page: 1 })
    const [total, setTotal] = useState(0)
    const [applyModal, setApplyModal] = useState(null)
    const [applyForm, setApplyForm] = useState({ bid: '', proposal: '' })
    const [submitting, setSubmitting] = useState(false)
    const [withdrawTarget, setWithdrawTarget] = useState(null)
    const [myApps, setMyApps] = useState([])
    const [myAppsLoading, setMyAppsLoading] = useState(true)

    const fetchJobs = async () => {
        try {
            const params = {}
            if (filters.category !== 'All') params.category = filters.category
            if (filters.budget_level) params.budget_level = filters.budget_level
            if (filters.is_featured) params.is_featured = true
            if (filters.sort_by) params.sort_by = filters.sort_by
            params.page = filters.page
            const data = await jobService.getJobs(params)
            setJobs(data.results || data || [])
            setTotal(data.count || 0)
        } catch { addNotification('error', 'Failed to load jobs') }
        finally { setLoading(false) }
    }

    const fetchMyApps = async () => {
        try {
            const data = await jobService.getMyApplications()
            setMyApps(data.results || data || [])
        } catch { } finally { setMyAppsLoading(false) }
    }

    useEffect(() => { fetchJobs(); fetchMyApps() }, [filters.category, filters.budget_level, filters.is_featured, filters.sort_by, filters.page])

    const handleApply = async () => {
        const bid = parseFloat(applyForm.bid)
        const words = applyForm.proposal.trim().split(/\s+/).length
        if (!bid || bid <= 0) { addNotification('error', 'Enter a valid bid'); return }
        if (words < 50 || words > 300) { addNotification('error', 'Proposal must be 50-300 words'); return }
        setSubmitting(true)
        try {
            await jobService.applyToJob({ job: applyModal.id, bid, proposal: applyForm.proposal.trim() })
            addNotification('success', 'Application submitted')
            setApplyModal(null)
            setApplyForm({ bid: '', proposal: '' })
            fetchMyApps()
        } catch { addNotification('error', 'Failed to submit') }
        finally { setSubmitting(false) }
    }

    const confirmWithdraw = async () => {
        try {
            await jobService.withdrawApplication(withdrawTarget.id)
            addNotification('success', 'Application withdrawn')
            setWithdrawTarget(null)
            fetchMyApps()
        } catch { addNotification('error', 'Failed to withdraw') }
    }

    const appliedJobIds = new Set(myApps.map((a) => a.job))

    return (
        <div className="space-y-6 animate-fade-in">
            <h2 className="text-lg font-bold text-gray-100">Browse Jobs</h2>

            {/* My Applications count */}
            <div className="glass p-3">
                <p className="text-sm text-gray-300">
                    My Applications: <span className="text-primary font-semibold">{myApps.length}</span>
                    {profile?.max_applications && (
                        <span className="text-gray-500"> / {profile.max_applications}</span>
                    )}
                </p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
                <div className="flex gap-1">
                    {CATEGORIES.map((c) => (
                        <button
                            key={c}
                            onClick={() => setFilters({ ...filters, category: c, page: 1 })}
                            className={`px-3 py-1.5 text-xs rounded-lg transition-colors cursor-pointer ${filters.category === c ? 'bg-primary/20 text-primary' : 'glass text-gray-400 hover:text-gray-200'
                                }`}
                        >
                            {c}
                        </button>
                    ))}
                </div>
                <Select options={BUDGET_OPTIONS} value={filters.budget_level} onChange={(v) => setFilters({ ...filters, budget_level: v, page: 1 })} className="w-36" />
                <Select options={SORT_OPTIONS} value={filters.sort_by} onChange={(v) => setFilters({ ...filters, sort_by: v, page: 1 })} className="w-32" />
                <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                    <input type="checkbox" checked={filters.is_featured} onChange={(e) => setFilters({ ...filters, is_featured: e.target.checked, page: 1 })} className="accent-primary" />
                    Featured only
                </label>
            </div>

            {/* Job List */}
            {loading ? (
                <Skeleton variant="card" count={4} />
            ) : jobs.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No jobs found</p>
            ) : (
                <div className="space-y-3">
                    {jobs.map((job) => {
                        const applied = appliedJobIds.has(job.id)
                        return (
                            <div key={job.id} className={`glass p-4 flex items-center justify-between ${job.is_featured ? 'border-amber-500/20' : ''}`}>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-semibold text-gray-100">{job.title}</h3>
                                        {job.is_featured && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">Featured</span>}
                                    </div>
                                    <p className="text-xs text-gray-400">{job.category} · ${job.budget}</p>
                                </div>
                                <button
                                    onClick={() => { setApplyModal(job); setApplyForm({ bid: job.budget || '', proposal: '' }) }}
                                    disabled={applied}
                                    className={`px-4 py-1.5 text-sm rounded-lg cursor-pointer ${applied ? 'bg-gray-500/20 text-gray-500 cursor-not-allowed' : 'bg-primary hover:bg-primary/80 text-white'
                                        }`}
                                >
                                    {applied ? 'Applied' : 'Apply'}
                                </button>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Pagination */}
            {total > 0 && (
                <div className="flex justify-center gap-2">
                    {Array.from({ length: Math.ceil(total / 10) }, (_, i) => (
                        <button
                            key={i}
                            onClick={() => setFilters({ ...filters, page: i + 1 })}
                            className={`px-3 py-1 text-xs rounded cursor-pointer ${filters.page === i + 1 ? 'bg-primary/20 text-primary' : 'glass text-gray-400'
                                }`}
                        >
                            {i + 1}
                        </button>
                    ))}
                </div>
            )}

            {/* My Applications */}
            <div>
                <h3 className="text-sm font-semibold text-gray-300 mb-3">My Applications</h3>
                {myAppsLoading ? (
                    <Skeleton variant="text" count={3} />
                ) : myApps.length === 0 ? (
                    <p className="text-sm text-gray-500">No applications yet</p>
                ) : (
                    <div className="space-y-2">
                        {myApps.map((app) => (
                            <div key={app.id} className="glass p-3 flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-100">{app.job_title || `Job #${app.job}`}</p>
                                    <p className="text-xs text-gray-400">${app.bid} · {app.status}</p>
                                </div>
                                <button onClick={() => setWithdrawTarget(app)} className="px-3 py-1 text-xs text-red-400 hover:bg-red-500/10 rounded cursor-pointer">Withdraw</button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Apply Modal */}
            {applyModal && (
                <Modal isOpen={true} onClose={() => setApplyModal(null)} title={`Apply: ${applyModal.title}`}>
                    <div className="space-y-3">
                        <input
                            value={applyForm.bid}
                            onChange={(e) => setApplyForm({ ...applyForm, bid: e.target.value })}
                            type="number"
                            placeholder="Your bid ($)"
                            className="w-full glass px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:ring-1 focus:ring-primary/50"
                        />
                        <textarea
                            value={applyForm.proposal}
                            onChange={(e) => setApplyForm({ ...applyForm, proposal: e.target.value })}
                            placeholder="Proposal (50-300 words)"
                            className="w-full glass px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:ring-1 focus:ring-primary/50 min-h-[120px]"
                        />
                        <p className="text-[10px] text-gray-500">{applyForm.proposal.trim().split(/\s+/).filter(Boolean).length}/300 words</p>
                        <button onClick={handleApply} disabled={submitting} className="w-full py-2.5 bg-primary hover:bg-primary/80 text-white rounded-lg text-sm cursor-pointer disabled:opacity-50">
                            {submitting ? 'Submitting...' : 'Submit Application'}
                        </button>
                    </div>
                </Modal>
            )}

            {/* Withdraw Modal */}
            {withdrawTarget && (
                <Modal isOpen={true} onClose={() => setWithdrawTarget(null)} title="Withdraw Application" variant="danger">
                    <p className="text-sm text-gray-300 mb-4">Withdraw your application for "{withdrawTarget.job_title || `Job #${withdrawTarget.job}`}"?</p>
                    <div className="flex gap-3 justify-end">
                        <button onClick={() => setWithdrawTarget(null)} className="px-4 py-2 text-sm text-gray-300 cursor-pointer">Cancel</button>
                        <button onClick={confirmWithdraw} className="px-4 py-2 text-sm bg-red-500/20 text-red-400 rounded-lg cursor-pointer">Withdraw</button>
                    </div>
                </Modal>
            )}
        </div>
    )
}
