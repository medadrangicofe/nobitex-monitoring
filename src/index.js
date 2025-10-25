// src/monitor/subscriptionManager.js
// -------------------------------------------------------------
// Stable version (2025-10)
// Handles live pair subscriptions and auto-polling of Nobitex data.
// Compatible with monitorEngine and fetchNobitexData service.
// -------------------------------------------------------------

import { fetchNobitexData } from '../services/dataFetcher.js';
import logger from '../utils/logger.js';

class SubscriptionManager {
  constructor() {
    // Map of pair -> Set(callbacks)
    this.subscriptions = new Map();

    // Polling interval in ms (default: 10s)
    this.pollInterval = Number(process.env.SUBSCRIPTION_POLL_INTERVAL_MS || 10000);

    this._timer = null;
  }

  /**
   * Subscribe to live updates for a given pair.
   * @param {string} pair - trading pair (e.g., "BTCUSDT")
   * @param {function} callback - function called with updated data
   */
  subscribe(pair, callback) {
    if (!this.subscriptions.has(pair)) this.subscriptions.set(pair, new Set());
    this.subscriptions.get(pair).add(callback);
    logger.info(`SubscriptionManager → subscribed to ${pair}`);
  }

  /**
   * Unsubscribe a callback or all callbacks for a given pair.
   * @param {string} pair
   * @param {function} [callback]
   */
  unsubscribe(pair, callback) {
    if (!this.subscriptions.has(pair)) return;
    const set = this.subscriptions.get(pair);
    if (callback) set.delete(callback);
    if (set.size === 0) this.subscriptions.delete(pair);
    logger.info(`SubscriptionManager → unsubscribed from ${pair}`);
  }

  /**
   * Notify all listeners of a pair with new data.
   */
  notify(pair, data) {
    const set = this.subscriptions.get(pair);
    if (!set) return;
    for (const cb of set) {
      try {
        cb(data);
      } catch (err) {
        logger.error(`Subscription callback error for ${pair}:`, err?.message || err);
      }
    }
  }

  /**
   * Fetch latest stats for a given trading pair.
   * Returns normalized data or null on failure.
   */
  async fetchPair(pair) {
    try {
      const endpoint = `/market/stats?symbol=${encodeURIComponent(pair)}`;
      const res = await fetchNobitexData(endpoint);

      if (!res || res.error) {
        logger.warn(`SubscriptionManager.fetchPair → fetch error for ${pair}`, res);
        return null;
      }

      // normalize data from possible structures
      const stats = res.data?.stats || res.data?.data?.stats || res.data;
      const payload = stats?.[pair] || stats;

      return payload;
    } catch (err) {
      logger.error(`SubscriptionManager.fetchPair exception for ${pair}:`, err?.message || err);
      return null;
    }
  }

  /**
   * Fetch and broadcast updates for all subscribed pairs.
   */
  async updateAll() {
    const entries = Array.from(this.subscriptions.keys());
    for (const pair of entries) {
      const payload = await this.fetchPair(pair);
      if (payload) this.notify(pair, payload);
    }
  }

  /**
   * Start auto-polling of subscribed pairs.
   */
  startAutoPoll() {
    if (this._timer) return;
    this._timer = setInterval(() => {
      this.updateAll().catch(err =>
        logger.error('SubscriptionManager.updateAll error:', err)
      );
    }, this.pollInterval);

    logger.success(`SubscriptionManager → auto poll started (interval=${this.pollInterval}ms)`);
  }

  /**
   * Stop auto-polling.
   */
  stopAutoPoll() {
    if (!this._timer) return;
    clearInterval(this._timer);
    this._timer = null;
    logger.info('SubscriptionManager → auto poll stopped');
  }
}

/**
 * Initialize subscription manager and wire it to socket.io.
 * @param {Server} io - Socket.io server instance
 * @returns {SubscriptionManager}
 */
export function subscriptionManager(io) {
  const manager = new SubscriptionManager();
  manager.startAutoPoll();

  if (io && typeof io.on === 'function') {
    io.on('connection', (socket) => {
      logger.info('SubscriptionManager: socket connected ' + socket.id);

      // Client → subscribe
      socket.on('subscribe', async (pair) => {
        try {
          manager.subscribe(pair, (data) =>
            socket.emit('subscription:update', { pair, data })
          );

          // send immediate snapshot
          const payload = await manager.fetchPair(pair);
          if (payload) socket.emit('subscription:update', { pair, data: payload });
        } catch (err) {
          logger.error('Socket subscribe handler error:', err?.message || err);
        }
      });

      // Client → unsubscribe
      socket.on('unsubscribe', (pair) => {
        try {
          manager.unsubscribe(pair);
        } catch (err) {
          logger.error('Socket unsubscribe handler error:', err?.message || err);
        }
      });

      socket.on('disconnect', () => {
        logger.info('SubscriptionManager: socket disconnected ' + socket.id);
      });
    });
  }

  return manager;
}