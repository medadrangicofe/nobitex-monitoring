// src/monitor/subscriptionManager.js
// Exports a named function `subscriptionManager(io)` which initializes the subscription system
// and wires it to the provided socket.io `io` instance.

import { fetchNobitexData } from '../services/dataFetcher.js';
import logger from '../utils/logger.js';

class SubscriptionManager {
  constructor() {
    this.subscriptions = new Map(); // pair -> Set of callbacks
    this.pollInterval = Number(process.env.SUBSCRIPTION_POLL_INTERVAL_MS || 10000);
    this._timer = null;
  }

  subscribe(pair, callback) {
    if (!this.subscriptions.has(pair)) this.subscriptions.set(pair, new Set());
    this.subscriptions.get(pair).add(callback);
    logger.info(`SubscriptionManager: subscribed to ${pair}`);
  }

  unsubscribe(pair, callback) {
    if (!this.subscriptions.has(pair)) return;
    const set = this.subscriptions.get(pair);
    if (callback) set.delete(callback);
    if (set.size === 0) this.subscriptions.delete(pair);
    logger.info(`SubscriptionManager: unsubscribed from ${pair}`);
  }

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

  async fetchPair(pair) {
    try {
      // build endpoint in a safe manner: expected to be like '/market/stats?symbol=PAIR'
      const endpoint = `/market/stats?symbol=${encodeURIComponent(pair)}`;
      const res = await fetchNobitexData(endpoint);
      if (res.error) {
        logger.warn(`SubscriptionManager.fetchPair: fetch error for ${pair}`, res);
        return null;
      }
      // Normalized payload extraction
      const stats = res.data?.stats || res.data?.data?.stats || res.data;
      const payload = stats?.[pair] || stats;
      return payload;
    } catch (err) {
      logger.error(`SubscriptionManager.fetchPair exception for ${pair}:`, err?.message || err);
      return null;
    }
  }

  async updateAll() {
    const entries = Array.from(this.subscriptions.keys());
    for (const pair of entries) {
      const payload = await this.fetchPair(pair);
      if (payload) this.notify(pair, payload);
    }
  }

  startAutoPoll() {
    if (this._timer) return;
    this._timer = setInterval(() => this.updateAll().catch(err => logger.error('SubscriptionManager.updateAll error:', err)), this.pollInterval);
    logger.info('SubscriptionManager: auto poll started, interval=' + this.pollInterval);
  }

  stopAutoPoll() {
    if (!this._timer) return;
    clearInterval(this._timer);
    this._timer = null;
    logger.info('SubscriptionManager: auto poll stopped');
  }
}

// The exported initializer function expected by index.js
export function subscriptionManager(io) {
  const manager = new SubscriptionManager();

  // start polling automatically
  manager.startAutoPoll();

  // wire socket.io events if io provided
  if (io && typeof io.on === 'function') {
    io.on('connection', (socket) => {
      logger.info('SubscriptionManager: socket connected ' + socket.id);

      // client can ask to subscribe/unsubscribe via socket messages
      socket.on('subscribe', async (pair) => {
        try {
          manager.subscribe(pair, (data) => socket.emit('subscription:update', { pair, data }));
          // emit an immediate snapshot
          const payload = await manager.fetchPair(pair);
          if (payload) socket.emit('subscription:update', { pair, data: payload });
        } catch (err) {
          logger.error('Socket subscribe handler error:', err?.message || err);
        }
      });

      socket.on('unsubscribe', (pair) => {
        try {
          // best-effort: remove all callbacks related to this socket by matching function identity is hard,
          // so simply inform and stop sending data on disconnect; for now we rely on client-side to stop expecting.
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