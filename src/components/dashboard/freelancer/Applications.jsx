import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  FileText,
  Trash2,
  Clock,
  AlertCircle,
  Briefcase,
  DollarSign,
  Filter,
  Zap,
  Calendar,
  ChevronDown,
  RefreshCw,
  Search,
  ExternalLink,
  ChevronRight,
  Info,
  Star,
  Tag,
  X,
  Save
} from 'lucide-react';
import jobService from '../../../services/jobService';
import ConfirmationModal from '../common/ConfirmationModal';
import CustomSelect from '../common/CustomSelect';

const CATEGORIES = [
  'Web development', 'Mobile app development', 'Game development',
  'Ai machine learning', 'Ui ux graphic design', 'Video animation editing',
  'Writing copywriting', 'Digital marketing seo', 'Ecommerce',
  'Data analysis', 'Virtual assistant admin', 'Other'
];

const Applications = ({ profile, addNotification, fetchProfile, onNavigate }) => {
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [appToDelete, setAppToDelete] = useState(null);

  // Browse Jobs State
  const [availableJobs, setAvailableJobs] = useState([]);
  const [isJobsLoading, setIsJobsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [isApplying, setIsApplying] = useState(false);

  const [filters, setFilters] = useState({
    category: '',
    budget_level: '',
    deadline: '',
    is_featured: false,
    sort_by: 'newest'
  });

  const [applicationForm, setApplicationForm] = useState({
    proposal_text: '',
    bid_amount: ''
  });

  const [focusedField, setFocusedField] = useState(null);

  const fetchAvailableJobs = useCallback(async (isLoadMore = false) => {
    if (!profile?.portfolios || profile.portfolios.length === 0) {
      setIsJobsLoading(false);
      return;
    }

    try {
      setIsJobsLoading(true);
      const currentPage = isLoadMore ? page + 1 : 1;
      const params = {
        page: currentPage,
        category: filters.category || undefined,
        budget_level: filters.budget_level || undefined,
        deadline: filters.deadline || undefined,
        is_featured: filters.is_featured ? 'true' : undefined,
        sort_by: filters.sort_by
      };

      const response = await jobService.getJobs(params);

      if (isLoadMore) {
        setAvailableJobs(prev => [...prev, ...response.data.results]);
        setPage(currentPage);
      } else {
        setAvailableJobs(response.data.results);
        setPage(1);
      }

      setHasMore(!!response.data.next);
    } catch (err) {
      addNotification('Failed to fetch jobs', 'error');
    } finally {
      setIsJobsLoading(false);
    }
  }, [filters, page, addNotification, profile?.portfolios]);

  useEffect(() => {
    if (profile?.portfolios?.length > 0) {
      fetchAvailableJobs();
    } else {
      setIsJobsLoading(false);
    }
  }, [filters, profile?.portfolios]);

  const handleApplyClick = (job) => {
    setSelectedJob(job);
    setApplicationForm({ proposal_text: '', bid_amount: job.budget_min?.toString() || '' });
    setIsApplyModalOpen(true);
  };

  const handleApplySubmit = async (e) => {
    e.preventDefault();

    const wordCount = applicationForm.proposal_text.trim().split(/\s+/).filter(w => w.length > 0).length;
    if (wordCount < 50 || wordCount > 300) {
      addNotification(`Proposal must be between 50 and 300 words. Current: ${wordCount}`, 'error');
      return;
    }

    try {
      setIsApplying(true);
      await jobService.applyToJob({
        job: selectedJob.id,
        proposal_text: applicationForm.proposal_text,
        bid_amount: applicationForm.bid_amount
      });
      addNotification('Application submitted successfully!', 'success');
      setIsApplyModalOpen(false);
      fetchApplications();
      if (fetchProfile) fetchProfile();
      fetchAvailableJobs();
    } catch (err) {
      const errorMsg = err.response?.data?.error || Object.values(err.response?.data || {})[0] || 'Failed to submit application';
      addNotification(errorMsg, 'error');
    } finally {
      setIsApplying(false);
    }
  };

  const fetchApplications = async () => {
    try {
      setIsLoading(true);
      const response = await jobService.getMyApplications();
      setApplications(response.data);
    } catch (err) {
      addNotification('Failed to fetch applications', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleWithdraw = (id) => {
    setAppToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmWithdraw = async () => {
    if (!appToDelete) return;
    try {
      await jobService.withdrawApplication(appToDelete);
      addNotification('Application withdrawn successfully', 'success');
      setApplications(prev => prev.filter(a => a.id !== appToDelete));
      setIsDeleteModalOpen(false);
      if (fetchProfile) fetchProfile();
    } catch (err) {
      addNotification('Failed to withdraw application', 'error');
    }
  };

  return (
    <div className="fade-in flex-col gap-20 flex-1 minh-0 overflow-y-auto hide-scrollbar" style={{ paddingBottom: '16px', paddingRight: '4px' }}>
      <div className="flex-between flex-shrink-0">
        <h2 className="text-2xl font-bold">My Applications</h2>
      </div>

      <div className="grid gap-20 flex-shrink-0" style={{ gridTemplateColumns: '1fr' }}>
        <div className="glass flex-col gap-16 p-20">
          <div className="flex-between items-flex-start">
            <div>
              <h3 className="text-sm text-dim flex-row items-center gap-8 mb-4">
                <AlertCircle size={16} /> Application Limit
              </h3>
              <p className="text-sm text-dim">Resets every 7 days</p>
            </div>
            <span className={'text-xl font-800 ' + (profile?.application_count >= profile?.max_applications ? 'error-text' : 'primary-text')}>
              {profile?.application_count || 0} / {profile?.max_applications || 3}
            </span>
          </div>

          <div className="w-full pos-relative" style={{ height: '6px', background: 'var(--glass)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{
              width: `${Math.min(((profile?.application_count || 0) / (profile?.max_applications || 3)) * 100, 100)}%`,
              height: '100%',
              background: profile?.application_count >= profile?.max_applications ? 'var(--error)' : 'var(--primary)',
              boxShadow: profile?.application_count >= profile?.max_applications ? '0 0 10px var(--error)' : 'none',
              transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
            }} />
          </div>

          <div className="flex-between text-sm">
            <span className="text-dim">Next Reset:</span>
            <span className="font-semibold">
              {profile?.next_application_reset ? new Date(profile.next_application_reset).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-20 minh-0" style={{ gridTemplateColumns: '1fr' }}>

        {/* Browse Opportunities */}
        <div className="browse-fixed-panel">
          <div className="scrollable-content-card">
            <div className="flex-between mb-16 flex-shrink-0">
              <h3 className="text-lg text-dim flex-row items-center gap-8">
                <Search size={18} /> Browse Opportunities
              </h3>
              {profile?.portfolios?.length > 0 && (
                <button
                  className="btn btn-secondary px-10 py-6 radius-6"
                  onClick={() => fetchAvailableJobs()}
                >
                  <RefreshCw size={14} className={isJobsLoading ? 'spin-animation' : ''} /> Refresh
                </button>
              )}
            </div>

            {(!profile?.portfolios || profile.portfolios.length === 0) ? (
              <div className="flex-1 flex-col flex-center gap-16 text-center">
                <div className="flex-center flex-shrink-0" style={{ width: '64px', height: '64px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '16px' }}>
                  <Briefcase size={28} className="primary-text" />
                </div>
                <div>
                  <p className="font-bold text-lg mb-6">Portfolio Required</p>
                  <p className="text-sm text-dim" style={{ maxWidth: '320px' }}>You need to create a portfolio before you can browse and apply for jobs.</p>
                </div>
                <button
                  className="btn btn-primary px-32 py-12 text-sm"
                  onClick={() => onNavigate('portfolio')}
                >
                  <ExternalLink size={16} /> Create Your Portfolio
                </button>
              </div>
            ) : (
              <>
                <div className="filter-bar flex-shrink-0">
                  <div className="flex-1 minw-180">
                    <CustomSelect
                      placeholder="All Categories"
                      options={[{ label: 'All Categories', value: '' }, ...CATEGORIES.map(c => ({ label: c, value: c }))]}
                      value={filters.category}
                      onChange={(val) => setFilters(prev => ({ ...prev, category: val }))}
                    />
                  </div>
                  <div style={{ width: '160px' }}>
                    <CustomSelect
                      placeholder="Any Budget"
                      options={[
                        { label: 'Any Budget', value: '' },
                        { label: 'Low', value: 'low' },
                        { label: 'Medium', value: 'medium' },
                        { label: 'High', value: 'high' }
                      ]}
                      value={filters.budget_level}
                      onChange={(val) => setFilters(prev => ({ ...prev, budget_level: val }))}
                    />
                  </div>
                  <label className="flex-row items-center gap-8 cursor-pointer text-sm user-select-none text-dim">
                    <input
                      type="checkbox"
                      checked={filters.is_featured}
                      onChange={(e) => setFilters(prev => ({ ...prev, is_featured: e.target.checked }))}
                      className="cursor-pointer"
                    />
                    <Zap size={14} className={filters.is_featured ? 'primary-text' : ''} /> Featured
                  </label>
                  <div style={{ width: '150px' }}>
                    <CustomSelect
                      placeholder="Sort By"
                      options={[
                        { label: 'Newest First', value: 'newest' },
                        { label: 'Highest Pay', value: 'budget_max_desc' },
                        { label: 'Lowest Pay', value: 'budget_max_asc' },
                        { label: 'Soonest Deadline', value: 'deadline' }
                      ]}
                      value={filters.sort_by}
                      onChange={(val) => setFilters(prev => ({ ...prev, sort_by: val }))}
                    />
                  </div>
                </div>

                {availableJobs.length > 0 ? (
                  <div className="scroll-area">
                    <div className="flex-col gap-12">
                      {availableJobs.map(job => (
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
                                <span className="flex-row items-center gap-4"><DollarSign size={12} /> ${job.budget_min}-${job.budget_max}</span>
                                <span className="primary-text font-semibold">ID: {job.job_id}</span>
                              </div>
                            </div>
                          </div>
                          <button
                            className="btn btn-secondary px-12 py-6 text-xs radius-6"
                            onClick={() => handleApplyClick(job)}
                          >
                            Apply <ChevronRight size={14} />
                          </button>
                        </div>
                      ))}

                      {hasMore && !isJobsLoading && (
                        <button
                          className="btn btn-secondary w-fit-content mx-auto px-24 py-8 text-sm"
                          onClick={() => fetchAvailableJobs(true)}
                        >
                          Load More
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex-center flex-col text-center opacity-40">
                    <Search size={48} className="mx-auto mb-12" />
                    <p>{isJobsLoading ? 'Searching for opportunities...' : 'No matching jobs found.'}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Informational Card for Browse Opportunities */}
        {profile?.portfolios?.length > 0 && availableJobs.length > 0 && (
          <div className="glass flex-row items-center gap-12 p-12 bg-primary-5 border-primary-light flex-shrink-0">
            <Info size={16} className="primary-text flex-shrink-0" />
            <p className="text-sm text-dim lh-1">
              To view full details, description, or requirements of a Job listing, you can use the bot commands in Discord.
            </p>
          </div>
        )}

        {/* Active Applications */}
        <div className="browse-fixed-panel">
          <div className="scrollable-content-card">
            <h3 className="text-lg text-dim flex-row items-center gap-8 mb-16 flex-shrink-0">
              <FileText size={18} /> Active Applications
            </h3>
            {applications.length > 0 ? (
              <div className="scroll-area">
                <div className="flex-col gap-12">
                  {applications.map(app => (
                    <div
                      key={app.id}
                      className="glass flex-row items-center flex-between gap-16 p-12 px-20"
                    >
                      <div className="flex-row items-center gap-16 flex-1">
                        <div className="flex-center flex-shrink-0" style={{ width: '40px', height: '40px', background: 'var(--glass)', borderRadius: '8px', color: 'var(--primary)' }}>
                          <Briefcase size={20} />
                        </div>
                        <div className="flex-1">
                          <div className="flex-row items-center gap-8">
                            <span className="text-sm font-bold">{app.job_title}</span>
                            <span className={'text-xs px-4 py-3 radius-4 font-semibold text-uppercase ' + (
                              app.status === 'accepted' ? 'bg-success-10 success-text border-success-light' :
                                app.status === 'rejected' ? 'bg-error-10 error-text border-error-light' :
                                  'bg-white-5 text-dim border-card'
                            )}>
                              {app.status.toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-row gap-12 text-sm text-dim mt-2">
                            <span className="flex-row items-center gap-4"><DollarSign size={12} /> Bid: ${app.bid_amount}</span>
                            <span className="flex-row items-center gap-4"><Clock size={12} /> {new Date(app.created_at).toLocaleDateString()}</span>
                            <span className="primary-text font-semibold">Job ID: {app.job_id}</span>
                            <span className="primary-text font-semibold">App ID: {app.application_id}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        className="btn btn-secondary px-12 py-6 text-xs radius-6 error-text"
                        onClick={() => handleWithdraw(app.id)}
                      >
                        <Trash2 size={14} /> Withdraw
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex-center flex-col text-center opacity-40">
                <FileText size={48} className="mx-auto mb-12" />
                <p>No applications yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmWithdraw}
        title="Withdraw Application"
        message="Are you sure you want to withdraw this application? This action cannot be undone."
        confirmText="Withdraw"
        type="danger"
      />

      {isApplyModalOpen && selectedJob && (
        <div className="modal-overlay" onClick={() => setIsApplyModalOpen(false)}>
          <div className="modal-content glass" onClick={e => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setIsApplyModalOpen(false)}>
              <X size={20} />
            </button>
            <h3 className="modal-title">
              <Briefcase size={22} />
              Apply for Position
            </h3>
            <p className="text-sm text-dim mb-24" style={{ marginTop: '-16px' }}>
              {selectedJob.title} &bull; {selectedJob.job_id}
            </p>

            <form onSubmit={handleApplySubmit} className="flex-col gap-24">
              <div className="form-group">
                <label className="form-label">Bid Amount ($) *</label>
                <div className="pos-relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    min="0"
                    required
                    className="form-input"
                    style={{ paddingLeft: '44px' }}
                    placeholder="0"
                    value={focusedField === 'bid_amount' ? applicationForm.bid_amount.replace(/\.00$/, '') : (applicationForm.bid_amount ? parseFloat(applicationForm.bid_amount).toFixed(2) : '')}
                    onFocus={() => setFocusedField('bid_amount')}
                    onBlur={() => setFocusedField(null)}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setApplicationForm(prev => ({ ...prev, bid_amount: val ? val : '' }));
                    }}
                  />
                  <DollarSign size={16} className="pos-absolute primary-text" style={{ left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                </div>
                <p className="text-sm text-dim mt-8">
                  Client's Budget: ${selectedJob.budget_min} - ${selectedJob.budget_max}
                </p>
              </div>

              <div className="form-group">
                <div className="flex-between mb-8">
                  <label className="form-label m-0">Proposal Text (50-300 words) *</label>
                  <span className={'text-sm font-semibold ' + (
                    (applicationForm.proposal_text.trim().split(/\s+/).filter(w => w.length > 0).length < 50 || applicationForm.proposal_text.trim().split(/\s+/).filter(w => w.length > 0).length > 300) ? 'error-text' : 'success-text'
                  )}>
                    {applicationForm.proposal_text.trim() === '' ? 0 : applicationForm.proposal_text.trim().split(/\s+/).filter(w => w.length > 0).length} / 300 words
                  </span>
                </div>
                <textarea
                  required
                  placeholder="Explain why you are the best fit for this job..."
                  value={applicationForm.proposal_text}
                  onChange={(e) => setApplicationForm(prev => ({ ...prev, proposal_text: e.target.value }))}
                  className="form-input minh-180 resize-none lh-3"
                />
              </div>

              <div className="glass flex-row items-flex-start gap-12 p-12 bg-primary-5 border-primary-light">
                <Info size={18} className="primary-text flex-shrink-0 mt-2" />
                <p className="text-sm text-dim lh-2">
                  By applying, one application will be deducted from your weekly limit. High-quality proposals are more likely to be accepted.
                </p>
              </div>

              <div className="flex-row flex-end gap-12 mt-12">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsApplyModalOpen(false)}
                  disabled={isApplying}
                  style={{ minWidth: '100px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isApplying}
                  style={{ minWidth: '160px' }}
                >
                  {isApplying ? 'Submitting...' : (
                    <><Save size={18} /> Submit Application</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(Applications);
