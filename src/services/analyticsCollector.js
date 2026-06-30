/**
 * Analytics Collector — frontend-side utility for sending structured analytics
 * events to the backend.
 *
 * Provides a fire-and-forget interface for dashboard components to log user actions
 * without manually constructing payloads or importing the API client directly.
 *
 * Includes in-memory deduplication to prevent event flooding.
 *
 * Usage:
 *   import AnalyticsCollector from '../services/analyticsCollector.js';
 *
 *   // Log a guild configuration change
 *   AnalyticsCollector.logGuildEvent(guildId, guildName, 'guild_config_update', {
 *     changed_field: 'command_channel'
 *   });
 *
 *   // Log a user action
 *   AnalyticsCollector.logUserAction('profile_update', 'client', clientId, {
 *     field: 'username'
 *   });
 */

import api from './api.js';

class AnalyticsCollector {
  static ANALYTICS_ENDPOINT = '/analytics/log/';

  /** In-memory dedup cache: key -> timestamp */
  static _dedupCache = new Map();
  static DEDUP_TTL = 5000; // 5 seconds
  static MAX_CACHE_SIZE = 50;

  /**
   * Check if this event was recently sent.
   * @param {string} dedupKey - Unique key for the event (type + target + action).
   * @returns {boolean} true if already sent within DEDUP_TTL.
   */
  static _isDuplicate(dedupKey) {
    const now = Date.now();
    const lastSent = this._dedupCache.get(dedupKey);
    if (lastSent && now - lastSent < this.DEDUP_TTL) {
      return true;
    }
    this._dedupCache.set(dedupKey, now);
    // Evict oldest entries if cache grows too large
    if (this._dedupCache.size > this.MAX_CACHE_SIZE) {
      const oldestKey = this._dedupCache.keys().next().value;
      this._dedupCache.delete(oldestKey);
    }
    return false;
  }

  /**
   * Internal fire-and-forget sender with dedup.
   * Posts event data to the backend analytics endpoint.
   * Never blocks the UI — errors are silently caught.
   *
   * @param {Object} eventData - Structured event data matching LogEvent schema.
   */
  static _send(eventData) {
    // Build dedup key from event_type + target_type + target_id
    const dedupKey = `${eventData.event_type}:${eventData.target_type}:${eventData.target_id || 'global'}`;
    if (this._isDuplicate(dedupKey)) return;

    api
      .post(this.ANALYTICS_ENDPOINT, { event: eventData })
      .catch(() => {
        // Silently fail — analytics must never break the user experience.
      });
  }

  /**
   * Log a guild-related event.
   *
   * @param {string} guildId - Discord guild ID.
   * @param {string} guildName - Human-readable server name.
   * @param {string} eventType - Event type (e.g. "guild_config_update").
   * @param {Object} [extraContext={}] - Additional context fields.
   */
  static logGuildEvent(guildId, guildName, eventType, extraContext = {}) {
    this._send({
      event_type: eventType,
      target_type: 'guild',
      target_id: guildId,
      actor: null, // Frontend user identity is on the JWT
      context: { guild_name: guildName, ...extraContext },
      metadata: {},
    });
  }

  /**
   * Log a user action (profile update, settings change, etc.).
   *
   * @param {string} actionType - The action type (e.g. "profile_update").
   * @param {string} targetType - Target entity type ("client", "freelancer", "server_admin").
   * @param {string} targetId - The target entity's ID.
   * @param {Object} [extraContext={}] - Additional context fields.
   */
  static logUserAction(actionType, targetType, targetId, extraContext = {}) {
    this._send({
      event_type: actionType,
      target_type: targetType,
      target_id: targetId,
      actor: null,
      context: extraContext,
      metadata: {},
    });
  }
}

export default AnalyticsCollector;
