import { fetchNobitexData } from '../services/dataFetcher.js';
import { sendMonitorAlertTelegram } from '../services/monitorTelegram.js';

let lastSignals = {};
let trendHistory = {};

const BATCH_SIZE = 7; // تقسیم ارزها به دسته‌های هفت‌تایی
const SPECIAL_SIGNAL_THRESHOLD = 5; // تعداد روند ممتد برای سیگنال ویژه
const SPECIAL_SIGNAL_INTERVAL = 3 * 60 * 1000; // 3 دقیقه

/**
 * اجرای موتور مانیتورینگ و ارسال سیگنال‌ها
 * io = Socket.io instance
 */
export function monitorEngineStart(io) {
  setInterval(async () => {
    const data = await fetchNobitexData();
    if (!data) return;

    const symbols = Object.keys(data);
    const batches = [];

    // تقسیم ارزها به دسته‌های هفت‌تایی
    for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
      batches.push(symbols.slice(i, i + BATCH_SIZE));
    }

    for (const batch of batches) {
      batch.forEach(symbol => {
        const price = parseFloat(data[symbol].last);
        const prevPrice = lastSignals[symbol]?.price || price;
        let trend = 'stable';

        if (price > prevPrice) trend = 'up';
        else if (price < prevPrice) trend = 'down';

        // ذخیره تاریخچه روند برای سیگنال ویژه
        trendHistory[symbol] = trendHistory[symbol] || [];
        trendHistory[symbol].push({ trend, time: Date.now() });
        trendHistory[symbol] = trendHistory[symbol].filter(
          t => Date.now() - t.time <= SPECIAL_SIGNAL_INTERVAL
        );

        const sameTrendCount = trendHistory[symbol].filter(t => t.trend === trend).length;

        // ارسال سیگنال ویژه اگر شرایط برآورده شود
        if (trend !== 'stable' && sameTrendCount >= SPECIAL_SIGNAL_THRESHOLD) {
          sendMonitorAlertTelegram({
            title: `${symbol} Special Signal`,
            message: `Trend ${trend} for ${sameTrendCount} consecutive ticks`,
            level: 'critical'
          });
        }

        lastSignals[symbol] = { price, trend };
      });
    }

    // ارسال داده به فرانت‌اند
    io.emit('monitor:data', lastSignals);

  }, 5000); // هر ۵ ثانیه
}