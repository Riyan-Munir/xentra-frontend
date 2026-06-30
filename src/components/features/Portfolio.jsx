import { useState, useEffect } from 'react'
import { Pencil, X, Plus } from 'lucide-react'
import Skeleton from '../ui/Skeleton'
import Modal from '../ui/Modal'
import UnsavedBar from '../ui/UnsavedBar'
import { portfolioService } from '../../services/portfolioService'

const JOB_CATEGORIES = ['Web Dev', 'Mobile', 'Design', 'Writing', 'Marketing', 'Other']
const MAX_SKILLS = 12
const MAX_PROJECTS = 6

export default function Portfolio({ profile, addNotification, fetchProfile }) {
    const [portfolio, setPortfolio] = useState(null)
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState(false)
    const [form, setForm] = useState({ bio: '', skills: [], job_category: '' })
    const [projectModal, setProjectModal] = useState(false)
    const [editProject, setEditProject] = useState(null)
    const [deleteTarget, setDeleteTarget] = useState(null)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        portfolioService.getPortfolios().then((data) => {
            const pfo = data?.[0]
            setPortfolio(pfo)
            if (pfo) setForm({ bio: pfo.bio || '', skills: pfo.skills || [], job_category: pfo.job_category || '' })
        }).catch(() => addNotification('error', 'Failed to load portfolio'))
            .finally(() => setLoading(false))
    }, [addNotification])

    const hasChanges = JSON.stringify(form) !== JSON.stringify({
        bio: portfolio?.bio || '', skills: portfolio?.skills || [], job_category: portfolio?.job_category || ''
    })

    const handleSavePortfolio = async () => {
        setSaving(true)
        try {
            if (portfolio) await portfolioService.updatePortfolio(portfolio.id, form)
            else {
                const newPfo = await portfolioService.createPortfolio(form)
                setPortfolio(newPfo)
            }
            addNotification('success', 'Portfolio saved')
            setEditing(false)
        } catch { addNotification('error', 'Failed to save') }
        finally { setSaving(false) }
    }

    const addSkill = () => {
        if (form.skills.length >= MAX_SKILLS) return
        const s = prompt('Enter skill:')
        if (s?.trim() && !form.skills.includes(s.trim())) setForm({ ...form, skills: [...form.skills, s.trim()] })
    }

    const removeSkill = (skill) => setForm({ ...form, skills: form.skills.filter((s) => s !== skill) })

    const handleSaveProject = async (projectData) => {
        try {
            if (editProject) await portfolioService.updatePortfolioItem(editProject.id, projectData)
            else await portfolioService.createPortfolioItem(projectData)
            addNotification('success', editProject ? 'Project updated' : 'Project added')
            setProjectModal(false)
            setEditProject(null)
            const data = await portfolioService.getPortfolios()
            setPortfolio(data?.[0])
        } catch { addNotification('error', 'Failed to save project') }
    }

    const handleDeleteProject = async (id) => {
        try {
            await portfolioService.deletePortfolioItem(id)
            addNotification('success', 'Project deleted')
            setDeleteTarget(null)
            const data = await portfolioService.getPortfolios()
            setPortfolio(data?.[0])
        } catch { addNotification('error', 'Failed to delete') }
    }

    if (loading) return <div className="space-y-4 animate-fade-in"><h2 className="text-lg font-bold text-gray-100">Portfolio</h2><Skeleton variant="card" count={3} /></div>

    const projects = portfolio?.items || []

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-100">Portfolio</h2>
                <button
                    onClick={() => setEditing(!editing)}
                    className="px-4 py-1.5 text-sm glass text-gray-300 hover:text-white cursor-pointer"
                >
                    {editing ? 'View' : 'Edit'}
                </button>
            </div>

            {/* Bio & Skills */}
            <div className="glass p-5 space-y-4">
                {editing ? (
                    <>
                        <textarea
                            value={form.bio}
                            onChange={(e) => setForm({ ...form, bio: e.target.value })}
                            className="w-full glass px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:ring-1 focus:ring-primary/50 min-h-[80px]"
                            placeholder="Write a short bio..."
                            maxLength={500}
                        />
                        <div>
                            <p className="text-xs text-gray-400 mb-2">Skills ({form.skills.length}/{MAX_SKILLS})</p>
                            <div className="flex flex-wrap gap-2">
                                {form.skills.map((s) => (
                                    <span key={s} className="px-2.5 py-1 text-xs rounded-full bg-primary/20 text-primary flex items-center gap-1">
                                        {s}
                                        <button onClick={() => removeSkill(s)} className="text-primary/60 hover:text-primary cursor-pointer"><X className="h-3 w-3" /></button>
                                    </span>
                                ))}
                                {form.skills.length < MAX_SKILLS && (
                                    <button onClick={addSkill} className="px-2.5 py-1 text-xs rounded-full border border-dashed border-white/20 text-gray-400 hover:text-gray-200 cursor-pointer">+ Add</button>
                                )}
                            </div>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 mb-1.5">Category</p>
                            <select
                                value={form.job_category}
                                onChange={(e) => setForm({ ...form, job_category: e.target.value })}
                                className="w-full glass px-4 py-2.5 text-sm text-gray-100 outline-none focus:ring-1 focus:ring-primary/50"
                            >
                                <option value="">Select category</option>
                                {JOB_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </>
                ) : (
                    <>
                        <p className="text-sm text-gray-300">{portfolio?.bio || 'No bio yet'}</p>
                        {form.skills.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {form.skills.map((s) => (
                                    <span key={s} className="px-2.5 py-1 text-xs rounded-full bg-primary/20 text-primary">{s}</span>
                                ))}
                            </div>
                        )}
                        {portfolio?.job_category && (
                            <p className="text-xs text-gray-500">Category: {portfolio.job_category}</p>
                        )}
                    </>
                )}
            </div>

            {/* Projects */}
            <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-300">Projects ({projects.length}/{MAX_PROJECTS})</p>
                {editing && projects.length < MAX_PROJECTS && (
                    <button
                        onClick={() => { setEditProject(null); setProjectModal(true) }}
                        className="px-3 py-1 text-xs glass text-primary hover:text-white cursor-pointer"
                    >
                        + Add Project
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projects.map((p) => (
                    <div key={p.id} className="glass p-4 space-y-2">
                        <div className="flex items-start justify-between">
                            <h3 className="text-sm font-semibold text-gray-100">{p.title}</h3>
                            {editing && (
                                <div className="flex gap-2">
                                    <button onClick={() => { setEditProject(p); setProjectModal(true) }} className="text-gray-400 hover:text-gray-200 cursor-pointer p-1"><Pencil className="h-3.5 w-3.5" /></button>
                                    <button onClick={() => setDeleteTarget(p)} className="text-red-400 hover:text-red-300 cursor-pointer p-1"><X className="h-3.5 w-3.5" /></button>
                                </div>
                            )}
                        </div>
                        <p className="text-xs text-gray-400 line-clamp-2">{p.description}</p>
                        {p.technologies?.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                                {p.technologies.map((t) => (
                                    <span key={t} className="px-1.5 py-0.5 text-[10px] rounded bg-white/5 text-gray-400">{t}</span>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {projects.length === 0 && <p className="text-sm text-gray-500 text-center py-8">No projects yet</p>}

            <UnsavedBar show={editing && hasChanges} onSave={handleSavePortfolio} onCancel={() => { setForm({ bio: portfolio?.bio || '', skills: portfolio?.skills || [], job_category: portfolio?.job_category || '' }); setEditing(false) }} />

            {projectModal && (
                <ProjectModal
                    project={editProject}
                    isOpen={true}
                    onClose={() => { setProjectModal(false); setEditProject(null) }}
                    onSave={handleSaveProject}
                    isPremium={profile?.tier >= 10}
                    addNotification={addNotification}
                />
            )}

            {deleteTarget && (
                <Modal isOpen={true} onClose={() => setDeleteTarget(null)} title="Delete Project" variant="danger">
                    <p className="text-sm text-gray-300 mb-4">Delete "{deleteTarget.title}"?</p>
                    <div className="flex gap-3 justify-end">
                        <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm text-gray-300 cursor-pointer">Cancel</button>
                        <button onClick={() => handleDeleteProject(deleteTarget.id)} className="px-4 py-2 text-sm bg-red-500/20 text-red-400 rounded-lg cursor-pointer">Delete</button>
                    </div>
                </Modal>
            )}
        </div>
    )
}

function ProjectModal({ project, isOpen, onClose, onSave, isPremium, addNotification }) {
    const [form, setForm] = useState({ title: '', description: '', technologies: [], project_url: '', image_url: '' })

    useEffect(() => {
        if (project) setForm({ title: project.title || '', description: project.description || '', technologies: project.technologies || [], project_url: project.project_url || '', image_url: project.image_url || '' })
        else setForm({ title: '', description: '', technologies: [], project_url: '', image_url: '' })
    }, [project])

    const addTech = () => {
        if (form.technologies.length >= 6) return
        const t = prompt('Enter technology:')
        if (t?.trim() && !form.technologies.includes(t.trim())) setForm({ ...form, technologies: [...form.technologies, t.trim()] })
    }
    const removeTech = (t) => setForm({ ...form, technologies: form.technologies.filter((x) => x !== t) })

    const handleSubmit = () => {
        const words = form.description.trim().split(/\s+/).length
        if (!form.title.trim()) { addNotification('error', 'Title required'); return }
        if (words < 20 || words > 30) { addNotification('error', 'Description must be 20-30 words'); return }
        onSave(form)
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={project ? 'Edit Project' : 'Add Project'}>
            <div className="space-y-3">
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Project title" className="w-full glass px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:ring-1 focus:ring-primary/50" />
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description (20-30 words)" className="w-full glass px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:ring-1 focus:ring-primary/50 min-h-[80px]" maxLength={500} />
                <p className="text-[10px] text-gray-500">{form.description.trim().split(/\s+/).filter(Boolean).length}/30 words</p>
                <div className="flex flex-wrap gap-1">
                    {form.technologies.map((t) => (
                        <span key={t} className="px-2 py-0.5 text-xs rounded bg-white/10 text-gray-300 flex items-center gap-1">
                            {t}<button onClick={() => removeTech(t)} className="text-gray-500 hover:text-gray-200 cursor-pointer"><X className="h-3 w-3" /></button>
                        </span>
                    ))}
                    {form.technologies.length < 6 && <button onClick={addTech} className="px-2 py-0.5 text-xs border border-dashed border-white/20 text-gray-400 rounded cursor-pointer">+ Tech</button>}
                </div>
                <input value={form.project_url} onChange={(e) => setForm({ ...form, project_url: e.target.value })} placeholder="Project URL (optional)" className="w-full glass px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:ring-1 focus:ring-primary/50" />
                <input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="Image URL (optional)" className="w-full glass px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:ring-1 focus:ring-primary/50" />
                <button onClick={handleSubmit} className="w-full py-2.5 bg-primary hover:bg-primary/80 text-white rounded-lg text-sm cursor-pointer">
                    {project ? 'Update' : 'Add'} Project
                </button>
            </div>
        </Modal>
    )
}
