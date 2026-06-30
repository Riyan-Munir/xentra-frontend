import React, { useState, useEffect, memo } from 'react';
import { createPortal } from 'react-dom';
import {
  Briefcase,
  Plus,
  Trash2,
  Edit3,
  ExternalLink,
  Image as ImageIcon,
  X,
  Save,
  Code,
  AlertCircle
} from 'lucide-react';
import { portfolioService } from '../../../services/portfolioService';
import { profileService } from '../../../services/profileService';
import UnsavedChangesBar from '../common/UnsavedChangesBar';
import ConfirmationModal from '../common/ConfirmationModal';
import CustomSelect from '../common/CustomSelect';

const JOB_CATEGORIES = [
  'Web development',
  'Mobile app development',
  'Game development',
  'Ai machine learning',
  'Ui ux graphic design',
  'Video animation editing',
  'Writing copywriting',
  'Digital marketing seo',
  'Ecommerce',
  'Data analysis',
  'Virtual assistant admin',
  'Other'
];

const ProjectModal = ({ project, isOpen, onClose, onSave, isPremium, addNotification }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project_url: '',
    image_url: '',
    technologies: []
  });
  const [newTech, setNewTech] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('body-no-scroll');
    } else {
      document.body.classList.remove('body-no-scroll');
    }
    return () => document.body.classList.remove('body-no-scroll');
  }, [isOpen]);

  useEffect(() => {
    if (project) {
      setFormData(project);
    } else {
      setFormData({
        title: '',
        description: '',
        project_url: '',
        image_url: '',
        technologies: []
      });
    }
    setErrors({});
  }, [project, isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = 'Project title is required';

    const descWords = formData.description.trim().split(/\s+/).filter(w => w.length > 0);
    if (descWords.length < 20 || descWords.length > 30) {
      newErrors.description = 'Description must be between 20-30 words';
    }

    if (!formData.project_url.trim()) {
      newErrors.project_url = 'Project URL is required';
    } else if (!/^https?:\/\/.+/.test(formData.project_url)) {
      newErrors.project_url = 'Invalid URL format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      onSave(formData);
    }
  };

  const addTech = () => {
    if (!newTech.trim()) return;
    if (formData.technologies.length >= 6) {
      setErrors({ ...errors, tech: 'Maximum 6 technologies allowed' });
      return;
    }
    if (formData.technologies.includes(newTech.trim().toUpperCase())) {
      setErrors({ ...errors, tech: 'Technology already added' });
      return;
    }

    setFormData({
      ...formData,
      technologies: [...formData.technologies, newTech.trim().toUpperCase()]
    });
    setNewTech('');
  };

  const removeTech = (tech) => {
    setFormData({
      ...formData,
      technologies: formData.technologies.filter(t => t !== tech)
    });
    if (errors.tech) setErrors({ ...errors, tech: null });
  };

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content glass hide-scrollbar"
        onClick={e => e.stopPropagation()}
      >
        <button className="modal-close-btn" onClick={onClose}>
          <X size={20} />
        </button>

        <h3 className="modal-title">
          {project ? 'Edit Project' : 'Add New Project'}
        </h3>

        <div className="form-group">
          <label className="form-label">Project Title *</label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. E-commerce Dashboard"
            value={formData.title}
            onChange={e => setFormData({ ...formData, title: e.target.value })}
          />
          {errors.title && <span className="error-text text-xs">{errors.title}</span>}
        </div>

        <div className="form-group">
          <label className="form-label">Description (20-30 words) *</label>
          <textarea
            className="form-input minh-120 resize-none"
            placeholder="A brief overview of what you built and how it helps users..."
            value={formData.description}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
          />
          <div className="flex-between mt-4">
            {errors.description && <span className="error-text text-xs">{errors.description}</span>}
            <span className="text-xs text-dim">
              {formData.description.trim().split(/\s+/).filter(w => w.length > 0).length} / 30 words
            </span>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Technologies Used (Max 6)</label>
          <div className="flex-row gap-8 mb-4">
            <input
              type="text"
              className="form-input"
              placeholder="e.g. React"
              value={newTech}
              onChange={e => {
                setNewTech(e.target.value);
                if (errors.tech) setErrors({ ...errors, tech: null });
              }}
              onKeyPress={e => e.key === 'Enter' && addTech()}
            />
            <button
              className="btn btn-secondary"
              onClick={addTech}
            >
              <Plus size={18} />
            </button>
          </div>
          {errors.tech && <div className="text-xs error-text mb-8">{errors.tech}</div>}
          <div className="flex-row flex-wrap gap-8">
            {formData.technologies.map(tech => (
              <span key={tech} className="tech-tag">
                {tech}
                <X size={12} className="cursor-pointer" onClick={() => removeTech(tech)} />
              </span>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Project URL *</label>
          <input
            type="text"
            className="form-input"
            placeholder="https://github.com/..."
            value={formData.project_url}
            onChange={e => setFormData({ ...formData, project_url: e.target.value })}
          />
          {errors.project_url && <span className="error-text text-xs">{errors.project_url}</span>}
        </div>

        <div className="form-group">
          <label className="form-label">Image URL (Optional)</label>
          <input
            type="text"
            className="form-input"
            placeholder="https://... (Recommended Ratio 3:2)"
            value={formData.image_url}
            onChange={e => setFormData({ ...formData, image_url: e.target.value })}
          />
        </div>

        <div className="flex-row justify-end gap-12 mt-32">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>
            <Save size={18} /> Save Project
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

const FreelancerPortfolio = ({ profile, addNotification, setHasUnsavedChanges, triggerTremble, fetchProfile }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [portfolio, setPortfolio] = useState(null);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    skill_tags: [],
    preferred_field: ''
  });
  const [originalData, setOriginalData] = useState(null);
  const [newSkill, setNewSkill] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);

  const isPremium = profile?.premium_tier === 'premium';
  const skillLimit = isPremium ? 12 : 6;
  const projectLimit = isPremium ? 6 : 3;

  const hasChanges = isEditing && originalData && (
    formData.title !== originalData.title ||
    formData.description !== originalData.description ||
    formData.preferred_field !== originalData.preferred_field ||
    JSON.stringify(formData.skill_tags) !== JSON.stringify(originalData.skill_tags)
  );

  useEffect(() => {
    fetchPortfolio();
  }, []); // Fetch once on mount

  useEffect(() => {
    if (setHasUnsavedChanges) {
      setHasUnsavedChanges(hasChanges);
    }
  }, [hasChanges, setHasUnsavedChanges]);

  const fetchPortfolio = async () => {
    try {
      const data = await portfolioService.getPortfolios();
      if (data && data.length > 0) {
        setPortfolio(data[0]);
        const initial = {
          title: data[0].title,
          description: data[0].description || '',
          skill_tags: data[0].skill_tags || [],
          preferred_field: data[0].preferred_field || ''
        };

        // Only update editing states if we're not currently in edit mode
        if (!isEditing) {
          setFormData(initial);
          setOriginalData(initial);
        } else {
          // If we ARE editing, update originalData to reflect DB state 
          // but preserve current formData edits
          setOriginalData(initial);
        }
      } else {
        const initial = {
          title: `${profile.username || 'Freelancer'}'s Portfolio`,
          description: '',
          skill_tags: [],
          preferred_field: ''
        };
        if (!isEditing) {
          setFormData(initial);
          setOriginalData(initial);
        }
      }
    } catch (err) {
      console.error('Failed to fetch portfolio:', err);
    }
  };

  const handleEditToggle = () => {
    if (isEditing) {
      setFormData(originalData);
    }
    setIsEditing(!isEditing);
  };

  const handleCancel = () => {
    setFormData(originalData);
    setIsEditing(false);
  };

  const handleSavePortfolio = async () => {
    if (!formData.title.trim()) {
      addNotification('Title cannot be empty', 'error');
      return;
    }
    const descWords = formData.description.trim().split(/\s+/).filter(w => w.length > 0);
    if (descWords.length > 50) {
      addNotification('Description cannot exceed 50 words', 'error');
      return;
    }
    if (formData.skill_tags.length === 0) {
      addNotification('At least one skill is required', 'error');
      return;
    }
    if (!portfolio || portfolio.items.length === 0) {
      addNotification('At least one project is required', 'error');
      return;
    }

    setIsSaving(true);
    try {
      if (portfolio) {
        await portfolioService.updatePortfolio(portfolio.id, {
          title: formData.title,
          description: formData.description,
          skill_tags: formData.skill_tags,
          preferred_field: formData.preferred_field
        });
      } else {
        const newPfo = await portfolioService.createPortfolio({
          title: formData.title,
          description: formData.description,
          skill_tags: formData.skill_tags,
          preferred_field: formData.preferred_field
        });
        setPortfolio(newPfo);
      }

      addNotification('Portfolio saved successfully!', 'success');
      setIsEditing(false);
      setOriginalData({ ...formData });
      if (fetchProfile) await fetchProfile();
      fetchPortfolio();
    } catch (err) {
      addNotification(err.response?.data?.error || 'Failed to save portfolio', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const addSkill = () => {
    if (!newSkill.trim()) return;
    if (formData.skill_tags.length >= skillLimit) {
      addNotification(`Skill limit reached (${skillLimit})`, 'error');
      return;
    }
    if (formData.skill_tags.includes(newSkill.trim().toUpperCase())) return;

    setFormData({
      ...formData,
      skill_tags: [...formData.skill_tags, newSkill.trim().toUpperCase()]
    });
    setNewSkill('');
  };

  const removeSkill = (skill) => {
    setFormData({
      ...formData,
      skill_tags: formData.skill_tags.filter(s => s !== skill)
    });
  };

  const handleOpenAddProject = () => {
    if (portfolio?.items?.length >= projectLimit) {
      addNotification(`Project limit reached (${projectLimit})`, 'error');
      return;
    }
    setEditingProject(null);
    setIsProjectModalOpen(true);
  };

  const handleOpenEditProject = (project) => {
    setEditingProject(project);
    setIsProjectModalOpen(true);
  };

  const handleSaveProject = async (projectData) => {
    try {
      if (editingProject) {
        await portfolioService.updatePortfolioItem(editingProject.id, projectData);
        addNotification('Project updated!', 'success');
      } else {
        if (!portfolio) {
          const newPfo = await portfolioService.createPortfolio({
            title: formData.title,
            description: formData.description
          });
          setPortfolio(newPfo);
          await portfolioService.createPortfolioItem({
            ...projectData,
            portfolio: newPfo.id
          });
        } else {
          await portfolioService.createPortfolioItem({
            ...projectData,
            portfolio: portfolio.id
          });
        }
        addNotification('Project added!', 'success');
      }
      setIsProjectModalOpen(false);
      fetchPortfolio();
    } catch (err) {
      addNotification(err.response?.data?.error || 'Failed to save project', 'error');
    }
  };

  const handleDeleteProject = async (id) => {
    setProjectToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return;
    try {
      await portfolioService.deletePortfolioItem(projectToDelete);
      addNotification('Project deleted', 'success');
      fetchPortfolio();
    } catch (err) {
      addNotification('Failed to delete project', 'error');
    }
  };

  return (
    <div className={'layout-bottom flex-1 minh-0 flex-col pos-relative' + (isPremium && !isEditing ? ' premium-card' : '')}>
      <div className="scrollable-content-card hide-scrollbar pos-relative flex-1 overflow-y-auto">
        <div className={'portfolio-container p-24' + (hasChanges ? ' pb-120' : ' pb-40')} style={{ maxWidth: '800px', margin: '0 auto', minHeight: '100%', display: 'flex', flexDirection: 'column', width: '100%' }}>

          {/* Header Section */}
          <div className="mb-40">
            <div className="flex-between items-flex-start">
              <div className="flex-1">
                {isEditing ? (
                  <div className="flex-col gap-16">
                    <div className="flex-row gap-16 items-flex-end flex-wrap">
                      <div className="form-group flex-1 mb-0" style={{ flex: '2 1 300px' }}>
                        <label className="form-label">Portfolio Title</label>
                        <input
                          type="text"
                          className="form-input text-lg"
                          value={formData.title}
                          onChange={e => setFormData({ ...formData, title: e.target.value })}
                        />
                      </div>
                      <div className="form-group mb-0" style={{ flex: '1 1 200px' }}>
                        <label className="form-label">Preferred Field</label>
                        <CustomSelect
                          placeholder="Select Field..."
                          options={[
                            ...JOB_CATEGORIES.map(c => ({ label: c, value: c })),
                            { label: 'Other', value: 'Other' }
                          ]}
                          value={JOB_CATEGORIES.includes(formData.preferred_field) ? formData.preferred_field : (formData.preferred_field ? 'Other' : '')}
                          onChange={(val) => {
                            if (val === 'Other') {
                              if (JOB_CATEGORIES.includes(formData.preferred_field) || !formData.preferred_field) {
                                setFormData({ ...formData, preferred_field: 'Other' });
                              }
                            } else {
                              setFormData({ ...formData, preferred_field: val });
                            }
                          }}
                        />
                      </div>
                    </div>

                    {(formData.preferred_field === 'Other' || (formData.preferred_field && !JOB_CATEGORIES.includes(formData.preferred_field))) && (
                      <div className="form-group maxw-300 m-0">
                        <label className="form-label text-xs primary-text font-semibold">Custom Field Name</label>
                        <input
                          type="text"
                          className="form-input text-sm"
                          placeholder="e.g. Blockchain Specialist"
                          value={formData.preferred_field === 'Other' ? '' : formData.preferred_field}
                          onChange={e => setFormData({ ...formData, preferred_field: e.target.value })}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex-row items-center gap-12 flex-wrap mb-20">
                    <h1 className="text-3xl font-800 m-0">
                      {formData.title || `${profile.username || 'Freelancer'}'s Portfolio`}
                    </h1>
                    {formData.preferred_field && (
                      <span
                        className={'py-4 px-12 rounded-6 text-sm font-600 text-nowrap' +
                          (isPremium ? ' bg-gold-10 premium-text border-gold-light' : ' bg-primary-10 primary-text border-primary-light-2')}
                      >
                        {formData.preferred_field}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <button
                className={'btn py-8 px-20 text-sm' + (isPremium ? ' btn-primary' : ' btn-secondary') + (isEditing ? ' bg-white-5 border-card text-dim' : '')}
                onClick={handleEditToggle}
              >
                {isEditing ? <X size={16} /> : <Edit3 size={16} />}
                {isEditing ? ' View Mode' : ' Edit Portfolio'}
              </button>
            </div>

            {isEditing ? (
              <div className="form-group mt-24">
                <label className="form-label">Description (Brief Intro, max 50 words)</label>
                <textarea
                  className="form-input minh-120 resize-none text-sm"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
                <span className="text-xs text-dim">
                  {formData.description.trim().split(/\s+/).filter(w => w.length > 0).length} / 50 words
                </span>
              </div>
            ) : (
              <p className="text-dim maxw-700 mt-16 mb-16 lh-4">
                {formData.description || "Passionate freelancer ready to take on new challenges. View my projects and skills below."}
              </p>
            )}
          </div>

          {/* Skills Section */}
          <div className="mb-32">
            <h3 className="text-sm text-dim tt-uppercase ls-1 flex-row items-center gap-8 mb-12">
              <Code size={16} /> My Expertises
            </h3>

            {isEditing && (
              <div className="flex-row gap-8 mb-16 maxw-350">
                <input
                  type="text"
                  className="form-input text-sm"
                  placeholder="Add a skill..."
                  value={newSkill}
                  onChange={e => setNewSkill(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && addSkill()}
                />
                <button className="btn btn-secondary" onClick={addSkill}>
                  <Plus size={16} />
                </button>
              </div>
            )}

            <div className="flex-row flex-wrap gap-8">
              {formData.skill_tags.length > 0 ? (
                formData.skill_tags.map(skill => (
                  <div key={skill} className={'skill-tag-pill flex-row items-center gap-6' + (isPremium && !isEditing ? ' bg-gold-10 border-gold-light premium-text' : ' border-card')}>
                    {skill}
                    {isEditing && (
                      <X size={12} className="cursor-pointer opacity-60" onClick={() => removeSkill(skill)} />
                    )}
                  </div>
                ))
              ) : (
                <span className="text-dim text-style-italic text-sm">No skills added yet.</span>
              )}
            </div>
          </div>

          {/* Projects Section */}
          <div className={portfolio?.items?.length > 0 ? 'flex-col' : 'flex-col flex-1'}>
            <div className="flex-between mb-20">
              <h3 className="text-sm text-dim tt-uppercase ls-1 flex-row items-center gap-8">
                <Briefcase size={16} /> Featured Projects
              </h3>
              {isEditing && (
                <button className="btn btn-primary" onClick={handleOpenAddProject}>
                  <Plus size={18} /> Add Project
                </button>
              )}
            </div>

            {portfolio?.items?.length > 0 ? (
              <div className="project-hscroll-container">
                {portfolio.items.map(project => (
                  <div key={project.id} className={'project-card glass rounded-12 overflow-hidden flex-col' + (isPremium && !isEditing ? ' premium-glow' : '')}>
                    <div className="pos-relative flex-center" style={{
                      height: '160px',
                      background: project.image_url ? `url("${project.image_url}")` : 'rgba(0,0,0,0.3)',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat'
                    }}>
                      {!project.image_url && <ImageIcon size={32} className="opacity-20" />}
                      {isEditing && (
                        <div className="pos-absolute top-8 right-8 flex-row gap-6">
                          <button
                            className="btn btn-secondary p-6 rounded-circle"
                            onClick={() => handleOpenEditProject(project)}
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            className="btn btn-secondary p-6 rounded-circle error-text"
                            onClick={() => handleDeleteProject(project.id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="p-16 flex-1 flex-col">
                      <h4 className="text-lg font-bold mb-6">{project.title}</h4>
                      <p className="text-sm text-dim mb-12 flex-1 lh-2">
                        {project.description}
                      </p>
                      <div className="flex-row flex-wrap gap-4 mb-12">
                        {project.technologies?.map(tech => (
                          <span key={tech} className="text-xs border-card py-2 px-6 rounded-4">
                            {tech}
                          </span>
                        ))}
                      </div>
                      <a
                        href={project.project_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={'btn w-full' + (isPremium ? ' btn-primary' : ' btn-secondary')}
                      >
                        View Project <ExternalLink size={16} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex-col flex-center glass rounded-12 dashed-border text-center">
                <Briefcase size={32} className="opacity-20 mb-12" />
                <p className="text-dim text-sm">No projects added yet. Click edit to start building your portfolio!</p>
              </div>
            )}
          </div>
        </div>

        {hasChanges && (
          <UnsavedChangesBar
            onSave={handleSavePortfolio}
            onCancel={handleCancel}
            triggerTremble={triggerTremble}
          />
        )}
      </div>

      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        project={editingProject}
        onSave={handleSaveProject}
        isPremium={isPremium}
        addNotification={addNotification}
      />

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDeleteProject}
        title="Delete Project"
        message="Are you sure you want to delete this project? This action cannot be undone."
        confirmText="Delete Project"
        type="danger"
      />
    </div>
  );
};

export default memo(FreelancerPortfolio);
