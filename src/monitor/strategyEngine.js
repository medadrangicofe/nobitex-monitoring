// src/monitor/strategyEngine.js
// -------------------------------------------------------------
// Stable version (2025-10)
// Unified with fetchNobitexData and subscriptionManager logic.
// This module manages trading strategies, connects to live data
// streams, and evaluates them automatically.
// -------------------------------------------------------------

import { fetchNobitexData } from '../services/dataFetcher.js';
import { subscriptionManager } from './subscriptionManager.js';
import logger from '../utils/logger.js';

class StrategyEngine {
  constructor() {
    this.strategies = [];
    logger.info('[strategyEngine] Initialized.');
  }

  /**
   * ثبت استراتژی جدید معاملاتی
   * @param {Function} strategyFn - تابع استراتژی که روی داده بازار اعمال می‌شود
   */
  registerStrategy(strategyFn) {
    if (typeof strategyFn !== 'function') {
      logger.warn('[strategyEngine] Invalid strategyFn provided — must be a function.');
      return;
    }
    this.strategies.push(strategyFn);
    logger.info(`[strategyEngine] Strategy registered. Total: ${this.strategies.length}`);
  }

  /**
   * اجرای تمامی استراتژی‌ها بر اساس داده‌های لحظه‌ای بازار
   * @param {string} pair - نماد معاملاتی (مثل "USDTIRT")
   */
  async evaluate(pair) {
    try {
      const data = await fetchNobitexData(`/market/stats?symbol=${pair}`);
      if (!data) {
        logger.warn(`[strategyEngine] No data received for ${pair}`);
        return;
      }

      for (const strategy of this.strategies) {
        try {
          await strategy(data);
        } catch (err) {
          logger.error(`[strategyEngine] Strategy error for ${pair}: ${err.message}`);
        }
      }
    } catch (err) {
      logger.error(`[strategyEngine] Evaluation failed for ${pair}: ${err.message}`);
    }
  }

  /**
   * اتصال به سیستم اشتراک (SubscriptionManager)
   * جهت دریافت خودکار داده‌های جدید و اجرای استراتژی‌ها
   */
  connectToSubscriptions() {
    try {
      subscriptionManager.subscribe('USDTIRT', (data) => {
        this.evaluate('USDTIRT');
      });
      logger.info('[strategyEngine] Connected to SubscriptionManager for USDTIRT.');
    } catch (err) {
      logger.error(`[strategyEngine] Failed to connect to subscriptions: ${err.message}`);
    }
  }
}

// نمونهٔ اصلی موتور استراتژی برای استفاده در سایر بخش‌ها
export const strategyEngine = new StrategyEngine();