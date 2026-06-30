import api from './api'

export const jobService = {
    getJobs: async (params) => { const { data } = await api.get('/jobs/', { params }); return data },
    getMyJobs: async (status) => { const { data } = await api.get('/jobs/', { params: { my_jobs: true, status } }); return data },
    createJob: async (jobData) => { const { data } = await api.post('/jobs/', jobData); return data },
    updateJob: async (id, jobData) => { const { data } = await api.patch(`/jobs/${id}/`, jobData); return data },
    deleteJob: async (id) => { await api.delete(`/jobs/${id}/`) },
    getMyApplications: async (jobId) => { const { data } = await api.get('/jobs/applications/', { params: { job_id: jobId } }); return data },
    withdrawApplication: async (id) => { await api.delete(`/jobs/applications/${id}/`) },
    applyToJob: async (formData) => { const { data } = await api.post('/jobs/applications/', formData); return data },
    rejectApplication: async (id) => { const { data } = await api.post(`/jobs/applications/${id}/reject/`); return data },
}
