// src/monitor/monitorEngine.js (بازنویسی کامل و سازگار با fetchNobitexData جدید)
import { fetchNobitexData } from '../services/dataFetcher.js';
import { sendMonitorAlertTelegram } from '../services/monitorTelegram.js';
import logger from '../utils/logger.js';

let lastSignals = {};
let trendHistory = {};

const BATCH_SIZE = 7;
const SPECIAL_SIGNAL_THRESHOLD = 5;
const SPECIAL_SIGNAL_INTERVAL = 3 * 60 * 1000;
const POLL_INTERVAL_MS = Number(process.env.MONITOR_POLL_INTERVAL_MS || 5005);

// ✅ متد دسترسی به وضعیت برای API
function getStats() {
  return lastSignals;
}

export function monitorEngineStart(io) {
  setInterval(async () => {
    try {
      logger.info('🔍 Fetching Nobitex market stats...');

      // ✅ فراخوانی endpoint با fetchNobitexData (دارای timeout و retry داخلی)
      const res = await fetchNobitexData('/market/stats');

      if (!res || res.error) {
        logger.error('❌ دریافت آمار نوبیتکس ناموفق بود:', res?.error || res);
        io.emit('monitor:error', { message: 'Failed to fetch Nobitex data', details: res });
        return;
      }

      const payload = res.data || res;
      const stats = payload?.stats || payload?.data?.stats || null;

      if (!stats) {
        logger.warn('⚠️ ساختار پاسخ نوبیتکس غیرمنتظره است:', payload);
        io.emit('monitor:error', { message: 'Unexpected Nobitex response structure', payload });
        return;
      }

      // 🧮 استخراج داده‌های ساده‌شده
      const simplified = {};
      Object.keys(stats).forEach(key => {
        const item = stats[key] || {};
        const price = item.latest || item.last || item.dayClose || item.close || null;
        simplified[key] = {
          price,
          bestBuy: item.bestBuy || null,
          bestSell: item.bestSell || null,
          volumeSrc: item.volumeSrc || null,
        };
      });

      // 📈 پردازش و تشخیص روند
      Object.keys(simplified).forEach(symbol => {
        const prev = lastSignals[symbol]?.price ?? null;
        const price = simplified[symbol].price;
        let trend = 'neutral';

        if (prev !== null && price !== null) {
          if (price > prev) trend = 'up';
          else if (price < prev) trend = 'down';
        }

        trendHistory[symbol] = trendHistory[symbol] || [];
        trendHistory[symbol].push({ t: Date.now(), price, trend });
        if (trendHistory[symbol].length > 50) trendHistory[symbol].shift();

        const sameTrendCount = trendHistory[symbol]
          .slice(-SPECIAL_SIGNAL_THRESHOLD)
          .filter(x => x.trend === trend).length;

        if (sameTrendCount >= SPECIAL_SIGNAL_THRESHOLD && price !== null) {
          const lastAlertAt = lastSignals[symbol]?.lastAlertAt || 0;
          if (Date.now() - lastAlertAt > SPECIAL_SIGNAL_INTERVAL) {
            sendMonitorAlertTelegram({
              title: `Special trend for ${symbol}`,
              message: `Trend ${trend} for ${sameTrendCount} consecutive ticks. Price: ${price}`,
              level: 'critical',
            });
            lastSignals[symbol] = { ...simplified[symbol], price, trend, lastAlertAt: Date.now() };
          }
        } else {
          lastSignals[symbol] = { ...simplified[symbol], price, trend };
        }
      });

      io.emit('monitor:data', lastSignals);
      logger.success('✅ Monitor tick processed successfully.');

    } catch (err) {
      logger.error('🔥 monitorEngine exception:', err?.message || err);
      io.emit('monitor:error', { message: 'monitor engine error', details: err?.message || err });
    }
  }, POLL_INTERVAL_MS);
}

// ✅ اتصال تابع خروجی
monitorEngineStart.getStats = getStats;