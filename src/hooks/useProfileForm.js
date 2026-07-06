import { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * useProfileForm, shared hook for profile edit forms with unsaved changes tracking.
 *
 * Manages form state, syncs from profile data, detects changes,
 * and provides cancel/save helpers.
 *
 * @param {Object} profile - The profile object from the API
 * @param {Function} onUpdate - Callback to persist changes (receives field values object)
 * @param {Function} addNotification - Toast notifier
 * @param {Function} setHasUnsavedChanges - Parent callback to propagate dirty state
 * @param {Object} options
 * @param {string} options.usernameField - Profile field for display name (default: 'username')
 * @param {string} options.customIdField - Profile field for premium/custom ID (default: null)
 * @param {string} options.customIdFallback - Fallback profile field for ID (default: null)
 * @param {string[]} options.extraFields - Additional fields to track: [fieldKey, originalKey?][]
 *
 * @returns {Object} { fields, setField, hasChanges, handleCancel, handleSave, validateId, originalValues }
 */
export function useProfileForm(profile, onUpdate, addNotification, setHasUnsavedChanges, options = {}) {
  const {
    usernameField = 'username',
    customIdField = null,
    customIdFallback = null,
    extraFields = [],
  } = options;

  // Build field descriptors
  const fieldConfigs = useMemo(() => {
    const configs = [
      { key: 'username', profileKey: usernameField },
    ];
    if (customIdField) {
      configs.push({ key: 'customId', profileKey: customIdField, fallbackKey: customIdFallback });
    }
    for (const extra of extraFields) {
      const extraKey = typeof extra === 'string' ? extra : extra[0];
      const originalKey = typeof extra === 'string' ? extra : (extra[1] || extra[0]);
      configs.push({ key: extraKey, profileKey: originalKey });
    }
    return configs;
  }, [usernameField, customIdField, customIdFallback, extraFields]);

  // Initialize state from profile
  const getFieldValue = useCallback((config) => {
    const val = profile?.[config.profileKey];
    if (config.fallbackKey && !val) return profile?.[config.fallbackKey] || '';
    return val ?? '';
  }, [profile]);

  const [fields, setFields] = useState(() => {
    const initial = {};
    for (const cfg of fieldConfigs) {
      initial[cfg.key] = getFieldValue(cfg);
    }
    return initial;
  });

  // Track original values for change detection
  const originalValues = useMemo(() => {
    const orig = {};
    // Convert field values to strings for comparison
    for (const cfg of fieldConfigs) {
      let val = profile?.[cfg.profileKey];
      if (cfg.fallbackKey && !val) val = profile?.[cfg.fallbackKey];
      orig[cfg.key] = val ?? '';
    }
    return orig;
  }, [profile, fieldConfigs]);

  // Sync from profile only if user hasn't edited
  useEffect(() => {
    const hasAnyChange = fieldConfigs.some(cfg => {
      const current = fields[cfg.key];
      const orig = originalValues[cfg.key];
      return String(current) !== String(orig);
    });
    if (!hasAnyChange) {
      setFields(prev => {
        const updated = { ...prev };
        for (const cfg of fieldConfigs) {
          let val = profile?.[cfg.profileKey];
          if (cfg.fallbackKey && !val) val = profile?.[cfg.fallbackKey];
          updated[cfg.key] = val ?? '';
        }
        return updated;
      });
    }
  }, [profile, fieldConfigs]);

  // Detect changes
  const hasChanges = useMemo(() => {
    return fieldConfigs.some(cfg => {
      const current = fields[cfg.key];
      const orig = originalValues[cfg.key];
      return String(current) !== String(orig);
    });
  }, [fields, originalValues, fieldConfigs]);

  // Propagate unsaved changes
  useEffect(() => {
    if (setHasUnsavedChanges) {
      setHasUnsavedChanges(hasChanges);
    }
  }, [hasChanges, setHasUnsavedChanges]);

  const setField = useCallback((key, value) => {
    setFields(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleCancel = useCallback(() => {
    setFields(prev => {
      const reset = { ...prev };
      for (const cfg of fieldConfigs) {
        reset[cfg.key] = originalValues[cfg.key];
      }
      return reset;
    });
  }, [originalValues, fieldConfigs]);

  const validateId = useCallback((id) => {
    return /^[a-z0-9_]*$/.test(id);
  }, []);

  /**
   * Standard save handler. Validates required fields and calls onUpdate.
   * @param {Object} override - Optional overrides to merge into payload
   * @returns {boolean} true if saved, false if validation failed
   */
  const handleSave = useCallback((override = {}) => {
    const username = fields.username;
    if (!username || !String(username).trim()) {
      addNotification("Display name can't be empty", 'error');
      return false;
    }

    const payload = { username: String(username).trim(), ...override };

    if (customIdField) {
      const customId = String(fields.customId || '');
      const isIdChanged = customId !== String(originalValues.customId);
      if (isIdChanged && customId && !validateId(customId)) {
        addNotification('ID only allows small letters, numbers and underscores.', 'error');
        return false;
      }
      if (isIdChanged) {
        payload[customIdField] = customId;
      }
    }

    for (const cfg of fieldConfigs) {
      const isUsername = cfg.key === 'username';
      const isCustom = cfg.key === 'customId';
      if (!isUsername && !isCustom && override[cfg.key] === undefined) {
        payload[cfg.profileKey] = fields[cfg.key];
      }
    }

    onUpdate(payload);
    return true;
  }, [fields, originalValues, customIdField, addNotification, validateId, onUpdate, fieldConfigs]);

  return {
    fields,
    setField,
    hasChanges,
    handleCancel,
    handleSave,
    validateId,
    originalValues,
    fieldConfigs,
  };
}
