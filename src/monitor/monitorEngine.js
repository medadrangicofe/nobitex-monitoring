// src/monitor/monitorEngine.js
import { fetchMarketStats, fetchTickerSymbols } from '../services/dataFetcher.js';
import { sendMonitorAlertTelegram } from '../services/monitorTelegram.js';
import logger from '../utils/logger.js';

let lastSignals = {};
let trendCache = {};
let isMonitoringActive = false;
let monitorInterval = null;

// تنظیم زمان‌بندی نظارت (پیش‌فرض: هر 30 ثانیه)
const MONITOR_INTERVAL_MS = Number(process.env.NOBITEX_MONITOR_INTERVAL_MS) || 30000;

/**
 * مقایسه‌ی داده‌ها برای تشخیص تغییرات قابل‌توجه
 */
function hasSignificantChange(symbol, currentPrice) {
  const last = lastSignals[symbol];
  if (!last) {
    lastSignals[symbol] = currentPrice;
    return false;
  }

  const changePercent = Math.abs((currentPrice - last) / last) * 100;
  if (changePercent >= 1.2) {
    lastSignals[symbol] = currentPrice;
    return true;
  }

  return false;
}

/**
 * محاسبه‌ی روند بازار بر اساس تغییرات اخیر
 */
function determineTrend(symbol, current, previous) {
  if (!previous) return 'unknown';
  const diff = current - previous;
  if (Math.abs(diff) < 1e-8) return trendCache[symbol] || 'neutral';
  return diff > 0 ? 'up' : 'down';
}

/**
 * دریافت و پردازش داده‌ها برای مانیتورینگ بازار
 */
async function processMarketData() {
  try {
    const [stats, tickers] = await Promise.all([
      fetchMarketStats(),
      fetchTickerSymbols(['USDT-IRT', 'BTC-IRT']),
    ]);

    if (!stats || !tickers) {
      logger.warn('[monitorEngine] Failed to fetch valid market data.');
      return;
    }

    for (const [symbol, data] of Object.entries(tickers)) {
      const currentPrice = parseFloat(data.latest);
      const lastPrice = lastSignals[symbol] || currentPrice;
      const trend = determineTrend(symbol, currentPrice, lastPrice);

      // ذخیره‌ی روند فعلی برای دفعات بعدی
      trendCache[symbol] = trend;

      if (hasSignificantChange(symbol, currentPrice)) {
        const changePercent = ((currentPrice - lastPrice) / lastPrice) * 100;
        const message = `📈 تغییر قابل توجه در ${symbol}\n` +
                        `قیمت فعلی: ${currentPrice.toLocaleString('fa-IR')} ریال\n` +
                        `تغییر: ${changePercent.toFixed(2)}٪ (${trend === 'up' ? '🔺 صعودی' : '🔻 نزولی'})`;

        await sendMonitorAlertTelegram(message);
        logger.info(`[monitorEngine] Alert sent for ${symbol}: ${changePercent.toFixed(2)}%`);
      }
    }

  } catch (err) {
    logger.error(`[monitorEngine] Error in processMarketData: ${err.message}`);
  }
}

/**
 * شروع مانیتورینگ نوبیتکس
 */
export function startMonitoring() {
  if (isMonitoringActive) {
    logger.warn('[monitorEngine] Monitoring already active.');
    return;
  }

  logger.info('[monitorEngine] Starting Nobitex market monitoring...');
  isMonitoringActive = true;
  processMarketData();

  monitorInterval = setInterval(() => {
    processMarketData();
  }, MONITOR_INTERVAL_MS);
}

/**
 * توقف مانیتورینگ نوبیتکس
 */
export function stopMonitoring() {
  if (!isMonitoringActive) {
    logger.warn('[monitorEngine] Monitoring already stopped.');
    return;
  }

  clearInterval(monitorInterval);
  monitorInterval = null;
  isMonitoringActive = false;
  logger.info('[monitorEngine] Monitoring stopped.');
}

/**
 * بررسی وضعیت فعلی مانیتورینگ
 */
export function getMonitorStatus() {
  return {
    active: isMonitoringActive,
    lastSignals,
    trendCache,
    interval: MONITOR_INTERVAL_MS,
  };
}

/**
 * سازگاری با index.js برای Render
 * (رفع خطای: monitorEngine.js does not provide an export named 'monitorEngineStart')
 */
export function monitorEngineStart() {
  startMonitoring();
}

// در صورت نیاز برای import پیش‌فرض در ماژول‌های قدیمی
export default {
  startMonitoring,
  stopMonitoring,
  getMonitorStatus,
  monitorEngineStart,
};