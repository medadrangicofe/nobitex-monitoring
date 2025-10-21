// riskEngine.js - unified with fetchNobitexData
import { fetchNobitexData } from "../services/dataFetcher.js";
import logger from "../utils/logger.js";

export default class RiskEngine {
  constructor(threshold = 0.05) {
    this.threshold = threshold;
  }

  async analyze(symbol = "BTCIRT") {
    try {
      const endpoint = `/market/orderbook?symbol=${symbol}`;
      const data = await fetchNobitexData(endpoint);
      const orderbook = data?.orderbook;
      if (!orderbook) {
        logger.warn(`RiskEngine: No orderbook for ${symbol}`);
        return null;
      }

      const bestBid = parseFloat(orderbook.bids?.[0]?.[0] || 0);
      const bestAsk = parseFloat(orderbook.asks?.[0]?.[0] || 0);
      if (!bestBid || !bestAsk) return null;

      const spread = (bestAsk - bestBid) / bestAsk;
      const risky = spread > this.threshold;
      logger.info(`[RiskEngine] ${symbol} spread=${spread.toFixed(4)} risky=${risky}`);
      return { symbol, spread, risky };
    } catch (err) {
      logger.error(`RiskEngine.analyze error: ${err.message}`);
      return null;
    }
  }
}