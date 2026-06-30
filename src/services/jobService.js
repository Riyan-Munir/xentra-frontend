import api from './api';

const jobService = {
  getJobs: (params = {}) => {
    return api.get('/jobs/', { params });
  },

  getMyJobs: (status = 'open') => {
    return api.get('/jobs/', {
      params: {
        my_jobs: 'true',
        status: status
      }
    });
  },

  createJob: (jobData) => {
    return api.post('/jobs/', jobData);
  },

  updateJob: (jobId, jobData) => {
    return api.patch(`/jobs/${jobId}/`, jobData);
  },

  deleteJob: (jobId) => {
    return api.delete(`/jobs/${jobId}/`);
  },

  getMyApplications: (jobId) => {
    const params = jobId ? { job_id: jobId } : {};
    return api.get('/jobs/applications/', { params });
  },

  withdrawApplication: (applicationId) => {
    return api.delete(`/jobs/applications/${applicationId}/`);
  },

  applyToJob: (applicationData) => {
    return api.post('/jobs/applications/', applicationData);
  },

  rejectApplication: (applicationId) => {
    return api.post(`/jobs/applications/${applicationId}/reject/`);
  }
};

export default jobService;
