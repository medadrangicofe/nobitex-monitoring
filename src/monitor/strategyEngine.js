// src/monitor/strategyEngine.js
// Unified with fetchNobitexData logic

import { fetchNobitexData } from '../services/dataFetcher.js';
import { subscriptionManager } from './subscriptionManager.js';

class StrategyEngine {
  constructor() {
    this.strategies = [];
  }

  // Register a new trading strategy
  registerStrategy(strategyFn) {
    this.strategies.push(strategyFn);
  }

  // Evaluate all strategies based on fetched data
  async evaluate(pair) {
    try {
      const data = await fetchNobitexData(pair);
      for (const strategy of this.strategies) {
        await strategy(data);
      }
    } catch (err) {
      console.error(`Strategy evaluation failed for ${pair}:`, err.message);
    }
  }

  // Connect to the subscription system
  connectToSubscriptions() {
    subscriptionManager.subscribe('USDTIRT', (data) => this.evaluate('USDTIRT'));
  }
}

export const strategyEngine = new StrategyEngine();