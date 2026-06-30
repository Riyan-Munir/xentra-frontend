import { useState, useEffect } from 'react'
import { Pencil, X } from 'lucide-react'
import Skeleton from '../ui/Skeleton'
import Modal from '../ui/Modal'
import { jobService } from '../../services/jobService'

const CATEGORIES = ['Web Dev', 'Mobile', 'Design', 'Writing', 'Marketing', 'Other']

export default function Jobs({ profile, addNotification, fetchProfile }) {
    const [jobs, setJobs] = useState([])
    const [loading, setLoading] = useState(true)
    const [jobModal, setJobModal] = useState(false)
    const [editJob, setEditJob] = useState(null)
    const [deleteTarget, setDeleteTarget] = useState(null)
    const [appModal, setAppModal] = useState(null)
    const [applications, setApplications] = useState([])
    const [interviewModal, setInterviewModal] = useState(null)

    const fetchJobs = async () => {
        try { setJobs(await jobService.getMyJobs()); setLoading(false) }
        catch { addNotification('error', 'Failed to load jobs'); setLoading(false) }
    }

    const fetchApplications = async (jobId) => {
        try {
            const data = await jobService.getMyApplications(jobId)
            setApplications(data.results || data || [])
        } catch { addNotification('error', 'Failed to load applications') }
    }

    useEffect(() => { fetchJobs() }, [])

    const handleSaveJob = async (jobData) => {
        try {
            if (editJob) { await jobService.updateJob(editJob.id, jobData); addNotification('success', 'Job updated') }
            else { await jobService.createJob(jobData); addNotification('success', 'Job created') }
            setJobModal(false); setEditJob(null); fetchJobs()
        } catch { addNotification('error', 'Failed to save job') }
    }

    const confirmDelete = async () => {
        try { await jobService.deleteJob(deleteTarget.id); addNotification('success', 'Job deleted'); setDeleteTarget(null); fetchJobs() }
        catch { addNotification('error', 'Failed to delete') }
    }

    if (loading) return <div className="space-y-4 animate-fade-in"><h2 className="text-lg font-bold text-gray-100">Jobs</h2><Skeleton variant="card" count={4} /></div>

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-100">My Jobs</h2>
                <button onClick={() => { setEditJob(null); setJobModal(true) }} className="px-4 py-1.5 text-sm bg-primary hover:bg-primary/80 text-white rounded-lg cursor-pointer">
                    + Post Job
                </button>
            </div>

            {jobs.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No jobs posted yet</p>
            ) : (
                <div className="space-y-3">
                    {jobs.map((job) => (
                        <div key={job.id} className={`glass p-4 ${job.is_featured ? 'border-amber-500/20' : ''}`}>
                            <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-semibold text-gray-100">{job.title}</h3>
                                        {job.is_featured && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">Featured</span>}
                                        {job.is_confidential && <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">Confidential</span>}
                                        {job.is_strict && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">Strict</span>}
                                    </div>
                                    <p className="text-xs text-gray-400">${job.budget} · {job.category} · {job.status}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => { setEditJob(job); setJobModal(true) }} className="text-gray-400 hover:text-gray-200 cursor-pointer p-1"><Pencil className="h-3.5 w-3.5" /></button>
                                    <button onClick={() => { setAppModal(job); fetchApplications(job.id) }} className="text-xs text-primary hover:text-primary/80 cursor-pointer">{job.application_count || 0} apps</button>
                                    <button onClick={() => setDeleteTarget(job)} className="text-red-400 hover:text-red-300 cursor-pointer p-1"><X className="h-3.5 w-3.5" /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Job Modal (Create/Edit) */}
            {jobModal && (
                <JobModal
                    job={editJob}
                    isOpen={true}
                    onClose={() => { setJobModal(false); setEditJob(null) }}
                    onSave={handleSaveJob}
                    isPremium={profile?.tier >= 10}
                    addNotification={addNotification}
                />
            )}

            {/* Application Modal */}
            {appModal && (
                <ApplicationModal
                    job={appModal}
                    applications={applications}
                    isOpen={true}
                    onClose={() => setAppModal(null)}
                    onInterview={(app) => { setInterviewModal(app) }}
                    onReject={async (appId) => {
                        try { await jobService.rejectApplication(appId); fetchApplications(appModal.id); addNotification('success', 'Application rejected') }
                        catch { addNotification('error', 'Failed to reject') }
                    }}
                />
            )}

            {/* Interview Modal */}
            {interviewModal && (
                <InterviewModal
                    application={interviewModal}
                    isOpen={true}
                    onClose={() => setInterviewModal(null)}
                />
            )}

            {/* Delete Confirmation */}
            {deleteTarget && (
                <Modal isOpen={true} onClose={() => setDeleteTarget(null)} title="Delete Job" variant="danger">
                    <p className="text-sm text-gray-300 mb-4">Delete "{deleteTarget.title}"? This cannot be undone.</p>
                    <div className="flex gap-3 justify-end">
                        <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm text-gray-300 cursor-pointer">Cancel</button>
                        <button onClick={confirmDelete} className="px-4 py-2 text-sm bg-red-500/20 text-red-400 rounded-lg cursor-pointer">Delete</button>
                    </div>
                </Modal>
            )}
        </div>
    )
}

function JobModal({ job, isOpen, onClose, onSave, isPremium, addNotification }) {
    const [form, setForm] = useState({ title: '', description: '', budget: '', category: '', skills: [], is_featured: false, is_confidential: false, is_strict: false })

    useEffect(() => {
        if (job) setForm({ title: job.title || '', description: job.description || '', budget: job.budget || '', category: job.category || '', skills: job.skills || [], is_featured: job.is_featured || false, is_confidential: job.is_confidential || false, is_strict: job.is_strict || false })
        else setForm({ title: '', description: '', budget: '', category: '', skills: [], is_featured: false, is_confidential: false, is_strict: false })
    }, [job])

    const addSkill = () => { const s = prompt('Enter skill:'); if (s?.trim() && !form.skills.includes(s.trim())) setForm({ ...form, skills: [...form.skills, s.trim()] }) }
    const removeSkill = (s) => setForm({ ...form, skills: form.skills.filter((x) => x !== s) })

    const handleSubmit = () => {
        if (!form.title.trim() || !form.budget || !form.category) { addNotification('error', 'Title, budget, and category required'); return }
        onSave({ ...form, budget: parseFloat(form.budget) })
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={job ? 'Edit Job' : 'Post Job'}>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Job title" className="w-full glass px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:ring-1 focus:ring-primary/50" />
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" className="w-full glass px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:ring-1 focus:ring-primary/50 min-h-[80px]" />
                <input value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} type="number" placeholder="Budget ($)" className="w-full glass px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:ring-1 focus:ring-primary/50" />
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full glass px-4 py-2.5 text-sm text-gray-100 outline-none focus:ring-1 focus:ring-primary/50">
                    <option value="">Select category</option>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <div className="flex flex-wrap gap-1">
                    {form.skills.map((s) => (
                        <span key={s} className="px-2 py-0.5 text-xs rounded bg-white/10 text-gray-300 flex items-center gap-1">{s}<button onClick={() => removeSkill(s)} className="text-gray-500 cursor-pointer"><X className="h-3 w-3" /></button></span>
                    ))}
                    <button onClick={addSkill} className="px-2 py-0.5 text-xs border border-dashed border-white/20 text-gray-400 rounded cursor-pointer">+ Skill</button>
                </div>
                {isPremium && (
                    <div className="space-y-2 border-t border-white/10 pt-3">
                        <p className="text-xs text-amber-400">Premium Features</p>
                        <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                            <input type="checkbox" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} className="accent-amber-500" />
                            Featured
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                            <input type="checkbox" checked={form.is_confidential} onChange={(e) => setForm({ ...form, is_confidential: e.target.checked })} className="accent-purple-500" />
                            Confidential
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                            <input type="checkbox" checked={form.is_strict} onChange={(e) => setForm({ ...form, is_strict: e.target.checked })} className="accent-red-500" />
                            Strict
                        </label>
                    </div>
                )}
                <button onClick={handleSubmit} className="w-full py-2.5 bg-primary hover:bg-primary/80 text-white rounded-lg text-sm cursor-pointer">{job ? 'Update' : 'Post'} Job</button>
            </div>
        </Modal>
    )
}

function ApplicationModal({ job, applications, isOpen, onClose, onInterview, onReject }) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Applications: ${job.title}`}>
            {applications.length === 0 ? (
                <p className="text-sm text-gray-500">No applications yet</p>
            ) : (
                <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                    {applications.map((app) => (
                        <div key={app.id} className="glass p-3 space-y-2">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-gray-100">{app.freelancer_name || `User #${app.freelancer}`}</p>
                                <span className="text-xs text-gray-400">${app.bid}</span>
                            </div>
                            <p className="text-xs text-gray-400 line-clamp-3">{app.proposal}</p>
                            <div className="flex gap-2">
                                <button onClick={() => onInterview(app)} className="px-3 py-1 text-xs glass text-primary cursor-pointer">Interview</button>
                                <button onClick={() => onReject(app.id)} className="px-3 py-1 text-xs text-red-400 hover:bg-red-500/10 rounded cursor-pointer">Reject</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Modal>
    )
}

function InterviewModal({ application, isOpen, onClose }) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Interview">
            <div className="space-y-3">
                <p className="text-sm text-gray-300">
                    Initiate an interview with <strong className="text-gray-100">{application.freelancer_name || `User #${application.freelancer}`}</strong>?
                </p>
                <p className="text-xs text-gray-500">
                    The bot will create a private interview room in your Discord server via DM.
                </p>
                <button
                    onClick={() => window.open('https://discord.com/app', '_blank')}
                    className="w-full py-2.5 bg-primary hover:bg-primary/80 text-white rounded-lg text-sm cursor-pointer"
                >
                    Open Discord
                </button>
            </div>
        </Modal>
    )
}
