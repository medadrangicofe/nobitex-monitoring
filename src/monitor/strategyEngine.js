// strategyEngine.js - unified with fetchNobitexData
import { fetchNobitexData } from "../services/dataFetcher.js";
import logger from "../utils/logger.js";

export default class StrategyEngine {
  constructor() {
    this.strategies = [];
  }

  async loadMarketData(symbol = "BTCIRT") {
    try {
      const endpoint = `/market/stats?symbol=${symbol}`;
      const data = await fetchNobitexData(endpoint);
      return data.stats?.[symbol] || null;
    } catch (err) {
      logger.error(`StrategyEngine.loadMarketData error: ${err.message}`);
      return null;
    }
  }

  registerStrategy(name, handler) {
    if (typeof handler !== "function") {
      throw new Error("Strategy handler must be a function");
    }
    this.strategies.push({ name, handler });
  }

  async execute(symbol = "BTCIRT") {
    const marketData = await this.loadMarketData(symbol);
    if (!marketData) {
      logger.warn(`No data returned for ${symbol}`);
      return;
    }

    for (const { name, handler } of this.strategies) {
      try {
        const result = await handler(marketData);
        logger.info(`[Strategy:${name}] ${symbol} => ${JSON.stringify(result)}`);
      } catch (err) {
        logger.error(`[Strategy:${name}] Error: ${err.message}`);
      }
    }
  }
}