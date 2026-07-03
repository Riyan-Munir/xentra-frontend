import React, { useState, useEffect, useMemo, memo } from 'react';
import { guildService } from '../../../services/guildService';
import { Settings, MessageSquare, AlertCircle, CheckCircle } from 'lucide-react';
import UnsavedChangesBar from '../common/UnsavedChangesBar';
import CustomSelect from '../common/CustomSelect';

const Configure = ({ servers, selectedGuildId, setHasUnsavedChanges, triggerTremble, addNotification, isSubmitting: globalSubmitting }) => {
  const [selectedGuild, setSelectedGuild] = useState(selectedGuildId || '');
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState('');
  const [originalChannel, setOriginalChannel] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isBusy = loading || isSaving || globalSubmitting;

  // Derive available servers cleanly using our service helper, memoized to prevent infinite loops
  const availableServers = useMemo(() => guildService.getServersWithBotInstalled(servers), [servers]);

  useEffect(() => {
    const fetchChannels = async () => {
      if (!selectedGuild) {
        setChannels([]);
        setSelectedChannel('');
        setOriginalChannel('');
        return;
      }

      try {
        setLoading(true);
        const fetchedChannels = await guildService.getChannels(selectedGuild);
        setChannels(fetchedChannels);

        const server = availableServers.find(s => s.id === selectedGuild);
        if (server && server.assigned_channel_id) {
          const assigned = server.assigned_channel_id.toString();
          setSelectedChannel(assigned);
          setOriginalChannel(assigned);
        } else {
          setSelectedChannel('');
          setOriginalChannel('');
        }
      } catch (err) {
        console.error('Failed to fetch channels:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchChannels();
  }, [selectedGuild, availableServers]);

  const hasChanges = selectedGuild && selectedChannel !== originalChannel;

  useEffect(() => {
    if (setHasUnsavedChanges) {
      setHasUnsavedChanges(hasChanges);
    }
  }, [hasChanges, setHasUnsavedChanges]);

  const handleUpdate = async () => {
    if (!selectedGuild || !selectedChannel) {
      addNotification('Please select both a server and a channel.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      await guildService.configureGuild(selectedGuild, selectedChannel);
      addNotification('Channel configured successfully!', 'success');
      setOriginalChannel(selectedChannel);
      if (setHasUnsavedChanges) setHasUnsavedChanges(false);
    } catch (err) {
      addNotification('Failed to update configuration.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setSelectedChannel(originalChannel);
  };

  return (
    <div className={`fade-in settings-grid ${isBusy ? 'form-submitting' : ''}`}>
      <div className="card">
        <div className="form-header-row">
          <h3 className="text-lg m-0">Server Configuration</h3>
          <Settings size={18} className="primary-text" />
        </div>

        <div className="form-group">
          <label className="form-label">Select Server</label>
          <CustomSelect
            options={availableServers.map(s => ({ label: s.name, value: s.id }))}
            value={selectedGuild}
            onChange={(val) => setSelectedGuild(val)}
            placeholder="-- Select a Server --"
            disabled={isBusy}
          />
          <p className="text-xs text-dim mt-8">
            Only servers where the bot is invited are shown.
          </p>
        </div>

        <div className="form-group">
          <label className="form-label">Command Channel</label>
          <div className="pos-relative">
            <CustomSelect
              options={channels.map(c => ({ label: `# ${c.name}`, value: c.id }))}
              value={selectedChannel}
              onChange={(val) => setSelectedChannel(val)}
              placeholder={loading ? "Loading..." : "-- Select a Text Channel --"}
              disabled={isBusy}
            />
          </div>
          <p className="text-xs text-dim mt-8">
            Slash commands will only be active in this specific channel.
          </p>
        </div>
      </div>

      <div className="card glass flex-col flex-center text-center opacity-80">
        <MessageSquare size={48} className="primary-text mb-16 opacity-50" />
        <h4 className="mb-8 text-lg">Server Isolation</h4>
        <p className="text-sm text-dim" style={{ maxWidth: '300px', width: '100%' }}>
          Assigning a channel ensures your server members aren't spammed. Bot interactions are restricted to the selected channel.
        </p>
      </div>

      {hasChanges && (
        <UnsavedChangesBar 
          onSave={handleUpdate} 
          onCancel={handleCancel} 
          triggerTremble={triggerTremble}
          isSubmitting={isBusy}
        />
      )}
    </div>
  );
};

export default memo(Configure);
