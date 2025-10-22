// src/monitor/subscriptionManager.js
// Unified structure – uses fetchNobitexData from dataFetcher.js

import { fetchNobitexData } from '../services/dataFetcher.js';

class SubscriptionManager {
  constructor() {
    this.subscriptions = new Map();
  }

  // Add a new subscription
  subscribe(pair, callback) {
    if (!this.subscriptions.has(pair)) {
      this.subscriptions.set(pair, []);
    }
    this.subscriptions.get(pair).push(callback);
  }

  // Remove all listeners for a pair
  unsubscribe(pair) {
    if (this.subscriptions.has(pair)) {
      this.subscriptions.delete(pair);
    }
  }

  // Notify subscribers with new data
  notify(pair, data) {
    if (this.subscriptions.has(pair)) {
      for (const cb of this.subscriptions.get(pair)) {
        try {
          cb(data);
        } catch (err) {
          console.error(`Error in subscription callback for ${pair}:`, err);
        }
      }
    }
  }

  // Periodically fetch data for subscribed pairs
  async start(interval = 10000) {
    setInterval(async () => {
      for (const pair of this.subscriptions.keys()) {
        try {
          const data = await fetchNobitexData(pair);
          this.notify(pair, data);
        } catch (err) {
          console.error(`Failed to fetch data for ${pair}:`, err.message);
        }
      }
    }, interval);
  }
}

// ✅ Named export (fixes the Render build error)
export const subscriptionManager = new SubscriptionManager();