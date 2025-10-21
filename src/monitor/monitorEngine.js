// src/monitor/monitorEngine.js (اصلاح‌شده)
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
  // نمونه پیاده‌سازی: هر چند ثانیه آمار بازار را می‌گیریم و پردازش می‌کنیم
  setInterval(async () => {
    try {
      // فراخوانی endpoint مشخص (اجتناب از undefined)
      const res = await fetchNobitexData('/market/stats');
      if (res.error) {
        logger.error('❌ دریافت آمار نوبیتکس ناموفق بود', res);
        // انتشار لاگ به فرانت‌اند با خطا (اختیاری)
        io.emit('monitor:error', { message: 'Failed to fetch Nobitex data', details: res });
        return;
      }

      const payload = res.data;
      const stats = payload?.stats || payload?.data?.stats || null;
      if (!stats) {
        logger.error('⚠️ ساختار پاسخ نوبیتکس غیرمنتظره است', payload);
        io.emit('monitor:error', { message: 'Unexpected Nobitex response structure', payload });
        return;
      }

      // نمونه ساده: استخراج قیمت latest (یا مقدار مشابه) و محاسبه روند
      const simplified = {};
      Object.keys(stats).forEach(key => {
        const item = stats[key] || {};
        // چند نام ممکن در پاسخ: latest, last, dayClose - سعی می‌کنیم همه را پوشش دهیم
        const price = item.latest || item.last || item.dayClose || item.close || null;
        simplified[key] = {
          price,
          bestBuy: item.bestBuy || null,
          bestSell: item.bestSell || null,
          volumeSrc: item.volumeSrc || null,
        };
      });

      // مثال پردازش: مقایسه با مقدار قبلی برای تشخیص ترند
      Object.keys(simplified).forEach(symbol => {
        const prev = lastSignals[symbol]?.price ?? null;
        const price = simplified[symbol].price;
        let trend = 'neutral';
        if (prev !== null && price !== null) {
          if (price > prev) trend = 'up';
          else if (price < prev) trend = 'down';
        }
        // history tracking
        trendHistory[symbol] = trendHistory[symbol] || [];
        trendHistory[symbol].push({ t: Date.now(), price, trend });
        if (trendHistory[symbol].length > 50) trendHistory[symbol].shift();

        // ساده‌سازی سیگنال‌ها
        const sameTrendCount = trendHistory[symbol].slice(-SPECIAL_SIGNAL_THRESHOLD).filter(x => x.trend === trend).length;
        if (sameTrendCount >= SPECIAL_SIGNAL_THRESHOLD && price !== null) {
          // ارسال هشدار تلگرام (با جلوگیری از اسپم)
          const lastAlertAt = lastSignals[symbol]?.lastAlertAt || 0;
          if (Date.now() - lastAlertAt > SPECIAL_SIGNAL_INTERVAL) {
            sendMonitorAlertTelegram({
              title: `Special trend for ${symbol}`,
              message: `Trend ${trend} for ${sameTrendCount} consecutive ticks. Price: ${price}`,
              level: 'critical'
            });
            lastSignals[symbol] = { ...simplified[symbol], price, trend, lastAlertAt: Date.now() };
          }
        } else {
          lastSignals[symbol] = { ...simplified[symbol], price, trend };
        }
      });

      // ارسال به فرانت‌اند
      io.emit('monitor:data', lastSignals);
    } catch (err) {
      logger.error('🔥 monitorEngine exception:', err?.message || err);
      io.emit('monitor:error', { message: 'monitor engine error', details: err?.message || err });
    }
  }, POLL_INTERVAL_MS);
}

// ✅ اتصال تابع خروجی
monitorEngineStart.getStats = getStats;