import React, { useState, useEffect, memo } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus,
  Briefcase,
  Edit3,
  Calendar,
  Tag,
  DollarSign,
  Clock,
  ChevronRight,
  X,
  Save,
  AlertCircle,
  Search,
  ExternalLink,
  User,
  Star,
  Trash2,
  Info,
  MessageSquare
} from 'lucide-react';
import CustomSelect from '../common/CustomSelect';
import ConfirmationModal from '../common/ConfirmationModal';

const JobModal = ({ job, isOpen, onClose, onSave, onDelete, isPremium, addNotification }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Other',
    skills_required: [],
    experience_level: 'Novice',
    budget_min: '',
    budget_max: '',
    deadline: '',
    is_featured: false,
    is_confidential: false,
    is_strict: false
  });
  const [newSkill, setNewSkill] = useState('');
  const [errors, setErrors] = useState({});
  const [focusedField, setFocusedField] = useState(null);

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('body-no-scroll');
    } else {
      document.body.classList.remove('body-no-scroll');
    }
    return () => document.body.classList.remove('body-no-scroll');
  }, [isOpen]);

  useEffect(() => {
    if (job) {
      setFormData({
        ...job,
        budget_min: job.budget_min?.toString() || '',
        budget_max: job.budget_max?.toString() || '',
        deadline: job.deadline || ''
      });
    } else {
      setFormData({
        title: '',
        description: '',
        category: 'Other',
        skills_required: [],
        experience_level: 'Novice',
        budget_min: '',
        budget_max: '',
        deadline: '',
        is_featured: false,
        is_confidential: false,
        is_strict: false
      });
    }
    setErrors({});
  }, [job, isOpen]);

  if (!isOpen) return null;

  const categories = [
    "Web development", "Mobile app development", "Game development",
    "Ai machine learning", "Ui ux graphic design", "Video animation editing",
    "Writing copywriting", "Digital marketing seo", "Ecommerce",
    "Data analysis", "Virtual assistant admin", "Other"
  ];

  const experienceLevels = ["Novice", "Intermediate", "Expert", "Legend"];

  const validate = () => {
    const newErrors = {};
    if (!formData.title.trim()) {
      newErrors.title = 'Job title is required';
    } else if (formData.title.length > 32) {
      newErrors.title = 'Title must be max 32 characters';
    }

    const descWords = formData.description.trim().split(/\s+/).filter(w => w.length > 0);
    if (descWords.length < 50 || descWords.length > 800) {
      newErrors.description = 'Description must be between 50-800 words';
    }

    if (!formData.budget_min || isNaN(formData.budget_min)) newErrors.budget_min = 'Valid min budget required';
    if (!formData.budget_max || isNaN(formData.budget_max)) newErrors.budget_max = 'Valid max budget required';
    if (parseFloat(formData.budget_min) > parseFloat(formData.budget_max)) {
      newErrors.budget_max = 'Max budget must be >= min budget';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      const sanitizedData = {
        ...formData,
        title: formData.title.replace(/[<>]/g, ''),
        description: formData.description.replace(/[<>]/g, ''),
        budget_min: parseInt(formData.budget_min, 10),
        budget_max: parseInt(formData.budget_max, 10),
        deadline: formData.deadline || null
      };
      onSave(sanitizedData);
    }
  };

  const addSkill = () => {
    const limit = formData.is_featured ? 12 : 6;
    if (!newSkill.trim()) return;
    if (formData.skills_required.length >= limit) {
      setErrors({ ...errors, skill: `Maximum ${limit} skills allowed` });
      return;
    }
    if (formData.skills_required.includes(newSkill.trim().toUpperCase())) {
      setErrors({ ...errors, skill: 'Skill already added' });
      return;
    }

    setFormData({
      ...formData,
      skills_required: [...formData.skills_required, newSkill.trim().replace(/[<>]/g, '').toUpperCase()]
    });
    setNewSkill('');
  };

  const removeSkill = (skill) => {
    setFormData({
      ...formData,
      skills_required: formData.skills_required.filter(s => s !== skill)
    });
  };

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass" onClick={e => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>
          <X size={20} />
        </button>

        <h3 className="modal-title">
          <Briefcase size={22} />
          {job ? 'Edit Job Listing' : 'Create New Job'}
        </h3>

        <div className="form-group">
          <label className="form-label">Job Title (Max 32 chars) *</label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. Senior React Developer"
            value={formData.title}
            onChange={e => setFormData({ ...formData, title: e.target.value })}
            maxLength={32}
          />
          {errors.title && <span className="error-text">{errors.title}</span>}
        </div>

        <div className="form-group">
          <div className="flex-between mb-8">
            <label className="form-label m-0">Description (50-800 words) *</label>
            <span className={'text-sm font-semibold ' + (
              (formData.description.trim().split(/\s+/).filter(w => w.length > 0).length < 50 || formData.description.trim().split(/\s+/).filter(w => w.length > 0).length > 800) ? 'error-text' : 'success-text'
            )}>
              {formData.description.trim().split(/\s+/).filter(w => w.length > 0).length} / 800 words
            </span>
          </div>
          <textarea
            className="form-input minh-150 resize-none"
            placeholder="Describe the job responsibilities, requirements, and project scope..."
            value={formData.description}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        <div className="grid-2 gap-16">
          <div className="form-group">
            <label className="form-label">Category *</label>
            <CustomSelect
              options={categories}
              value={formData.category}
              onChange={val => setFormData({ ...formData, category: val })}
              placeholder="Select Category"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Experience Level *</label>
            <CustomSelect
              options={experienceLevels}
              value={formData.experience_level}
              onChange={val => setFormData({ ...formData, experience_level: val })}
              placeholder="Select Experience"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Skills Required (Max {formData.is_featured ? 12 : 6})</label>
          <div className="flex-row gap-8 mb-8">
            <input
              type="text"
              className="form-input"
              placeholder="e.g. React, Python"
              value={newSkill}
              onChange={e => setNewSkill(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && addSkill()}
            />
            <button className="btn btn-secondary" onClick={addSkill}>
              <Plus size={18} />
            </button>
          </div>
          {errors.skill && <div className="error-text mb-8">{errors.skill}</div>}
          <div className="flex-row flex-wrap gap-8">
            {formData.skills_required.map(skill => (
              <span key={skill} className="skill-tag-pill bg-glass px-12 py-4 radius-pill border-card text-sm flex-row items-center gap-6">
                {skill}
                <X size={12} className="cursor-pointer" onClick={() => removeSkill(skill)} />
              </span>
            ))}
          </div>
        </div>

        <div className="grid-2 gap-16">
          <div className="form-group">
            <label className="form-label">Min Budget ($) *</label>
            <input
              type="text"
              inputMode="numeric"
              min="0"
              className="form-input"
              placeholder="0"
              value={focusedField === 'budget_min' ? formData.budget_min.replace(/\.00$/, '') : (formData.budget_min ? parseFloat(formData.budget_min).toFixed(2) : '')}
              onFocus={() => setFocusedField('budget_min')}
              onBlur={() => setFocusedField(null)}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, '');
                setFormData({ ...formData, budget_min: val ? val : '' });
              }}
            />
            {errors.budget_min && <span className="error-text">{errors.budget_min}</span>}
          </div>
          <div className="form-group">
            <label className="form-label">Max Budget ($) *</label>
            <input
              type="text"
              inputMode="numeric"
              min="0"
              className="form-input"
              placeholder="0"
              value={focusedField === 'budget_max' ? formData.budget_max.replace(/\.00$/, '') : (formData.budget_max ? parseFloat(formData.budget_max).toFixed(2) : '')}
              onFocus={() => setFocusedField('budget_max')}
              onBlur={() => setFocusedField(null)}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, '');
                setFormData({ ...formData, budget_max: val ? val : '' });
              }}
            />
            {errors.budget_max && <span className="error-text">{errors.budget_max}</span>}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Deadline (Optional)</label>
          <input
            type="date"
            className="form-input"
            value={formData.deadline}
            onChange={e => setFormData({ ...formData, deadline: e.target.value })}
            min={new Date().toISOString().split('T')[0]}
          />
        </div>

        {isPremium && (
          <div className="flex-col gap-12 mt-20">
            <div className="form-group m-0">
              <label className="premium-toggle-bar premium-card premium-glow">
                <input
                  type="checkbox"
                  checked={formData.is_featured}
                  onChange={e => setFormData({ ...formData, is_featured: e.target.checked })}
                  className="cursor-pointer flex-shrink-0"
                  style={{ width: '18px', height: '18px', marginTop: '2px' }}
                />
                <div>
                  <span className="font-bold text-base text-white">Feature Listing</span>
                  <span className="text-sm lh-1 mt-2" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                    Promote your listing with a priority badge and increased skill visibility.
                  </span>
                </div>
              </label>
            </div>

            <div className="form-group m-0">
              <label className="premium-toggle-bar premium-card premium-glow">
                <input
                  type="checkbox"
                  checked={formData.is_confidential}
                  onChange={e => setFormData({ ...formData, is_confidential: e.target.checked })}
                  className="cursor-pointer flex-shrink-0"
                  style={{ width: '18px', height: '18px', marginTop: '2px' }}
                />
                <div>
                  <span className="font-bold text-base text-white">Confidential Listing</span>
                  <span className="text-sm lh-1 mt-2" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                    Hide from public search; accessible only via Job ID.
                  </span>
                </div>
              </label>
            </div>

            <div className="form-group m-0">
              <label className="premium-toggle-bar premium-card premium-glow">
                <input
                  type="checkbox"
                  checked={formData.is_strict}
                  onChange={e => setFormData({ ...formData, is_strict: e.target.checked })}
                  className="cursor-pointer flex-shrink-0"
                  style={{ width: '18px', height: '18px', marginTop: '2px' }}
                />
                <div>
                  <span className="font-bold text-base text-white">Strict Eligibility</span>
                  <span className="text-sm lh-1 mt-2" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                    Restrict applications to freelancers matching all job criteria.
                  </span>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Premium Informational Card for Free Tier Users editing Premium Jobs */}
        {!isPremium && job && (job.is_featured || job.is_confidential || job.is_strict) && (
          <div className="glass flex-row items-flex-start gap-12 p-12 mt-20 bg-warning-5 border-warning-light">
            <Star size={18} className="flex-shrink-0 mt-2" style={{ color: '#f59e0b' }} />
            <p className="text-sm text-dim lh-2">
              This Job contains Premium Tier features. To edit them, you need a Premium Tier subscription.
            </p>
          </div>
        )}

        {!job && (
          <div className="glass flex-row items-flex-start gap-12 p-12 mt-20 bg-primary-5 border-primary-light">
            <Info size={18} className="primary-text flex-shrink-0 mt-2" />
            <p className="text-sm text-dim lh-2">
              By posting, one job listing will be deducted from your weekly limit. Detailed descriptions attract higher-quality freelancer proposals.
            </p>
          </div>
        )}

        <div className="flex-between mt-32">
          <div>
            {job && (
              <button
                className="btn btn-secondary border-error"
                onClick={() => onDelete(job.id)}
              >
                <Trash2 size={18} /> Delete Listing
              </button>
            )}
          </div>
          <div className="flex-row gap-12">
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={job && job.status !== 'open'}
              style={{ opacity: job && job.status !== 'open' ? 0.5 : 1, cursor: job && job.status !== 'open' ? 'not-allowed' : 'pointer' }}
            >
              <Save size={18} /> {job ? 'Update Job' : 'Post Job'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

const ApplicationModal = ({ application, isOpen, onClose }) => {
  useEffect(() => {
    if (isOpen) document.body.classList.add('body-no-scroll');
    else document.body.classList.remove('body-no-scroll');
    return () => document.body.classList.remove('body-no-scroll');
  }, [isOpen]);

  if (!isOpen || !application) return null;

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass" onClick={e => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>
          <X size={20} />
        </button>

        <h3 className="modal-title">
          <User size={22} />
          Application Details
        </h3>

        <div className="form-group">
          <label className="form-label">Application ID</label>
          <input className="form-input bg-white-2" value={application.application_id} readOnly />
        </div>

        <div className="form-group">
          <label className="form-label">Freelancer ID</label>
          <input className="form-input bg-white-2" value={application.effective_freelancer_id} readOnly />
        </div>

        <div className="form-group">
          <label className="form-label">Freelancer Name</label>
          <input className="form-input bg-white-2" value={application.freelancer_name} readOnly />
        </div>

        <div className="form-group">
          <label className="form-label">Bid Amount ($)</label>
          <input className="form-input bg-white-2" value={`$${application.bid_amount}`} readOnly />
        </div>

        <div className="form-group">
          <label className="form-label">Proposal</label>
          <div className="form-input minh-120 bg-white-2 text-pre-wrap">
            {application.proposal_text}
          </div>
        </div>

        <div className="flex-row flex-end mt-32">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>,
    document.body
  );
};

const InterviewModal = ({ application, isOpen, onClose }) => {
  useEffect(() => {
    if (isOpen) document.body.classList.add('body-no-scroll');
    else document.body.classList.remove('body-no-scroll');
    return () => document.body.classList.remove('body-no-scroll');
  }, [isOpen]);

  if (!isOpen || !application) return null;

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass" onClick={e => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>
          <X size={20} />
        </button>

        <h3 className="modal-title">
          <MessageSquare size={22} />
          Conduct Interview
        </h3>

        <div className="flex-col gap-16 p-20">
          <div className="flex-row items-center gap-12 p-16 bg-primary-5 border-primary-light radius-8">
            <MessageSquare size={24} className="primary-text flex-shrink-0" />
            <p className="text-sm lh-1">
              To conduct an interview with this freelancer, please use the Xentra commands in Discord. The bot will guide you through the interview process.
            </p>
          </div>
        </div>

        <div className="flex-row flex-end mt-32">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>,
    document.body
  );
};

import jobService from '../../../services/jobService';

const Jobs = ({ profile, addNotification, fetchProfile }) => {
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [applications, setApplications] = useState([]);
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [isAppModalOpen, setIsAppModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState(null);
  const [focusedField, setFocusedField] = useState(null);
  const [isInterviewModalOpen, setIsInterviewModalOpen] = useState(false);
  const [interviewApp, setInterviewApp] = useState(null);

  const isPremium = profile?.premium_tier === 'premium';

  const fetchJobs = async () => {
    try {
      setIsLoading(true);
      const response = await jobService.getMyJobs('open');
      setJobs(response.data);
    } catch (err) {
      addNotification(err.response?.data?.error || 'Failed to fetch jobs', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchApplications = async (jobId) => {
    try {
      const response = await jobService.getMyApplications(jobId);
      setApplications(response.data);
    } catch (err) {
      addNotification('Failed to fetch applications', 'error');
    }
  };

  useEffect(() => {
    if (selectedJobId) {
      fetchApplications(selectedJobId);
    } else {
      setApplications([]);
    }
  }, [selectedJobId, jobs]);

  const handleCreateJob = () => {
    setEditingJob(null);
    setIsJobModalOpen(true);
  };

  const handleEditJob = (job) => {
    setEditingJob(job);
    setIsJobModalOpen(true);
  };

  const handleSaveJob = async (jobData) => {
    try {
      if (editingJob) {
        await jobService.updateJob(editingJob.id, jobData);
        addNotification('Job updated successfully!', 'success');
      } else {
        await jobService.createJob(jobData);
        addNotification('Job posted successfully!', 'success');
        fetchProfile();
      }
      setIsJobModalOpen(false);
      fetchJobs();
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data?.title || 'An error occurred';
      addNotification(errorMsg, 'error');
    }
  };

  const handleInterviewClick = (app) => {
    setInterviewApp(app);
    setIsInterviewModalOpen(true);
  };

  const handleRejectApplication = async (appId) => {
    try {
      await jobService.rejectApplication(appId);
      addNotification('Application rejected.', 'success');
      if (selectedJobId) fetchApplications(selectedJobId);
    } catch (err) {
      addNotification(err.response?.data?.error || 'Failed to reject application', 'error');
    }
  };

  const handleDeleteJob = async (jobId) => {
    setJobToDelete(jobId);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteJob = async () => {
    if (!jobToDelete) return;
    try {
      await jobService.deleteJob(jobToDelete);
      addNotification('Job deleted successfully!', 'success');
      setIsJobModalOpen(false);
      fetchJobs();
    } catch (err) {
      addNotification('Failed to delete job', 'error');
    }
  };

  const selectedJob = jobs.find(j => j.id === selectedJobId);

  return (
    <div className="fade-in flex-col gap-20 flex-1 minh-0 overflow-y-auto hide-scrollbar" style={{ paddingBottom: '16px', paddingRight: '4px' }}>

      {/* Header with Create Button */}
      <div className="flex-between flex-shrink-0">
        <h2 className="text-2xl font-bold">Manage Jobs</h2>
        <button className="btn btn-secondary px-16 py-8 text-sm" onClick={handleCreateJob}>
          <Plus size={18} /> Post New Job
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-20 flex-shrink-0" style={{ gridTemplateColumns: '1fr' }}>
        <div className="glass flex-col gap-16 p-20">
          <div className="flex-between items-flex-start">
            <div>
              <h3 className="text-sm text-dim flex-row items-center gap-8 mb-4">
                <AlertCircle size={16} /> Job Posting Limit
              </h3>
              <p className="text-sm text-dim">Resets every 7 days</p>
            </div>
            <span className={'text-xl font-800 ' + (profile?.job_count >= profile?.max_jobs ? 'error-text' : 'primary-text')}>
              {profile?.job_count || 0} / {profile?.max_jobs || 3}
            </span>
          </div>

          <div className="w-full pos-relative" style={{ height: '6px', background: 'var(--glass)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{
              width: `${Math.min(((profile?.job_count || 0) / (profile?.max_jobs || 3)) * 100, 100)}%`,
              height: '100%',
              background: profile?.job_count >= profile?.max_jobs ? 'var(--error)' : 'var(--primary)',
              boxShadow: profile?.job_count >= profile?.max_jobs ? '0 0 10px var(--error)' : 'none',
              transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
            }} />
          </div>

          <div className="flex-between text-sm">
            <span className="text-dim">Next Reset:</span>
            <span className="font-semibold">
              {profile?.next_job_reset ? new Date(profile.next_job_reset).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-20" style={{ gridTemplateColumns: '1fr' }}>

        {/* Container 1: Posted Jobs */}
        <div className="jobs-fixed-panel">
          <div className="scrollable-content-card">
            <h3 className="text-lg text-dim mb-16 flex-row items-center gap-8 flex-shrink-0">
              <Briefcase size={18} /> Active Listings
            </h3>
            {jobs.length > 0 ? (
              <div className="scroll-area">
                <div className="flex-col gap-12">
                  {jobs.map(job => (
                    <div
                      key={job.id}
                      className={'glass flex-row items-center flex-between gap-16 p-12 px-20' + (job.is_featured ? ' premium-card premium-glow' : '')}
                    >
                      <div className="flex-row items-center gap-16 flex-1">
                        <div className="flex-center flex-shrink-0" style={{ width: '40px', height: '40px', background: 'var(--glass)', borderRadius: '8px', color: job.is_featured ? '#ffd700' : 'var(--primary)' }}>
                          <Briefcase size={20} />
                        </div>
                        <div className="flex-1">
                          <div className="flex-row items-center gap-8">
                            <span className="text-sm font-bold">{job.title}</span>
                            {job.is_featured && <span className="premium-tag"><Star size={10} fill="currentColor" /> Featured</span>}
                          </div>
                          <div className="flex-row gap-12 text-sm text-dim mt-2">
                            <span className="flex-row items-center gap-4"><Tag size={12} /> {job.category}</span>
                            <span className="flex-row items-center gap-4"><Clock size={12} /> Expires: {job.job_expiry || 'N/A'}</span>
                            <span className="primary-text font-semibold">ID: {job.job_id}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        className="btn btn-secondary px-12 py-6 text-xs radius-6"
                        onClick={() => handleEditJob(job)}
                      >
                        <Edit3 size={14} /> Edit
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex-center flex-col text-center opacity-40">
                <Briefcase size={48} className="mx-auto mb-12" />
                <p>No jobs posted yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Container 2: Applications */}
        <div className="jobs-fixed-panel">
          <div className="scrollable-content-card">
            <div className="flex-between mb-16 flex-shrink-0">
              <h3 className="text-lg text-dim flex-row items-center gap-8">
                <User size={18} /> Freelancer Applications
              </h3>
              <div style={{ width: '100%', maxWidth: '250px' }}>
                <CustomSelect
                  options={jobs.map(job => ({ label: job.title, value: job.id }))}
                  value={selectedJobId}
                  onChange={val => setSelectedJobId(val)}
                  placeholder="Select a job..."
                />
              </div>
            </div>
            {!selectedJobId ? (
              <div className="flex-1 flex-center flex-col text-center opacity-40">
                <Search size={48} className="mx-auto mb-12" />
                <p>Select a job above to see applications.</p>
              </div>
            ) : (applications.length > 0) ? (
              <div className="scroll-area">
                <div className="flex-col gap-12">
                  {applications.map(app => (
                    <div
                      key={app.id}
                      className={'glass flex-row items-center flex-between gap-16 p-12 px-20' + (app.is_premium_freelancer ? ' premium-card premium-glow' : '')}
                    >
                      <div className="flex-row items-center gap-16 flex-1">
                        <div className="flex-center flex-shrink-0" style={{ width: '40px', height: '40px', background: 'var(--glass)', borderRadius: '8px', color: app.is_premium_freelancer ? '#ffd700' : 'var(--primary)' }}>
                          <User size={20} />
                        </div>
                        <div className="flex-1">
                          <div className="flex-row items-center gap-8">
                            <span className="text-sm font-bold">{app.freelancer_name}</span>
                            {app.is_premium_freelancer && <span className="premium-tag"><Star size={10} fill="currentColor" /> PREMIUM</span>}
                          </div>
                          <div className="flex-row gap-12 text-sm text-dim mt-2">
                            <span className="flex-row items-center gap-4"><Briefcase size={12} /> {app.freelancer_field}</span>
                            <span className="flex-row items-center gap-4"><DollarSign size={12} /> Bid: ${app.bid_amount}</span>
                            <span className="flex-row items-center gap-4"><Star size={12} /> {app.freelancer_level}</span>
                            <span className="primary-text font-semibold">Freelancer ID: {app.effective_freelancer_id}</span>
                            <span className="primary-text font-semibold">App ID: {app.application_id}</span>
                          </div>
                        </div>
                      </div>

                      {selectedJob?.status === 'open' ? (
                        <div className="flex-row gap-8">
                          <button
                            className="btn btn-secondary px-12 py-6 text-xs radius-6 error-text border-error"
                            onClick={() => handleRejectApplication(app.id)}
                          >
                            Reject
                          </button>
                          <button
                            className="btn btn-primary px-12 py-6 text-xs radius-6"
                            onClick={() => handleInterviewClick(app)}
                          >
                            <MessageSquare size={14} /> Interview
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs px-4 py-3 radius-4 font-semibold text-uppercase bg-white-5 text-dim">
                          {app.status}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex-center flex-col text-center opacity-40">
                <User size={48} className="mx-auto mb-12" />
                <p>No applications yet for this job.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Informational Card for Job Details */}
      <div className="glass flex-row items-center gap-12 p-12 bg-primary-5 border-primary-light flex-shrink-0">
        <Info size={16} className="primary-text flex-shrink-0" />
        <p className="text-sm text-dim lh-1">
          To view full details, portfolio, or stats of a Freelancer, you can use the bot commands in Discord.
        </p>
      </div>

      <JobModal
        job={editingJob}
        isOpen={isJobModalOpen}
        onClose={() => setIsJobModalOpen(false)}
        onSave={handleSaveJob}
        onDelete={handleDeleteJob}
        isPremium={isPremium}
        addNotification={addNotification}
      />

      <ApplicationModal
        application={selectedApplication}
        isOpen={isAppModalOpen}
        onClose={() => setIsAppModalOpen(false)}
      />

      <InterviewModal
        application={interviewApp}
        isOpen={isInterviewModalOpen}
        onClose={() => {
          setIsInterviewModalOpen(false);
          setInterviewApp(null);
        }}
      />

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDeleteJob}
        title="Delete Job Listing"
        message="Are you sure you want to delete this job listing? This action cannot be undone."
        confirmText="Delete Listing"
        type="danger"
      />

    </div>
  );
};

export default memo(Jobs);
