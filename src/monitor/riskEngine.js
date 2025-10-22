// src/monitor/riskEngine.js
// Uses unified data source from fetchNobitexData

import { fetchNobitexData } from '../services/dataFetcher.js';
import { subscriptionManager } from './subscriptionManager.js';

class RiskEngine {
  constructor() {
    this.thresholds = {
      maxDrawdown: 0.1, // 10%
      maxVolatility: 0.05, // 5%
    };
  }

  setThresholds(newThresholds) {
    this.thresholds = { ...this.thresholds, ...newThresholds };
  }

  async assess(pair) {
    try {
      const data = await fetchNobitexData(pair);
      const { lastTradePrice, changePercent } = data;

      if (Math.abs(changePercent) > this.thresholds.maxVolatility * 100) {
        console.warn(`[Risk] Volatility high for ${pair}: ${changePercent}%`);
      }

      if (lastTradePrice < 0) {
        console.error(`[Risk] Invalid trade price for ${pair}:`, lastTradePrice);
      }
    } catch (err) {
      console.error(`Risk assessment failed for ${pair}:`, err.message);
    }
  }

  monitor(pair = 'USDTIRT', interval = 15000) {
    setInterval(() => this.assess(pair), interval);
    subscriptionManager.subscribe(pair, (data) => this.assess(pair));
  }
}

export const riskEngine = new RiskEngine();