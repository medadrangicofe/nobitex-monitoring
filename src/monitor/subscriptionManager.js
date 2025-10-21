// subscriptionManager.js - unified with fetchNobitexData
import { fetchNobitexData } from "../services/dataFetcher.js";
import logger from "../utils/logger.js";

export default class SubscriptionManager {
  constructor() {
    this.subscriptions = new Map();
  }

  subscribe(symbol, callback) {
    if (typeof callback !== "function") {
      throw new Error("Callback must be a function");
    }
    this.subscriptions.set(symbol, callback);
    logger.info(`Subscribed to ${symbol}`);
  }

  unsubscribe(symbol) {
    this.subscriptions.delete(symbol);
    logger.info(`Unsubscribed from ${symbol}`);
  }

  async updateAll() {
    for (const [symbol, callback] of this.subscriptions.entries()) {
      try {
        const endpoint = `/market/stats?symbol=${symbol}`;
        const data = await fetchNobitexData(endpoint);
        const stats = data?.stats?.[symbol];
        if (stats) callback(stats);
      } catch (err) {
        logger.error(`SubscriptionManager.updateAll error for ${symbol}: ${err.message}`);
      }
    }
  }
}