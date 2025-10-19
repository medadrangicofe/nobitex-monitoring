import { fetchNobitexData } from '../services/dataFetcher.js';
import { sendMonitorAlertTelegram } from '../services/monitorTelegram.js';

let lastSignals = {};
let trendHistory = {};

const BATCH_SIZE = 7;
const SPECIAL_SIGNAL_THRESHOLD = 5;
const SPECIAL_SIGNAL_INTERVAL = 3 * 60 * 1000;

// ✅ متد دسترسی به وضعیت برای API
function getStats() {
  return lastSignals;
}

export function monitorEngineStart(io) {
  setInterval(async () => {
    const data = await fetchNobitexData();
    if (!data) return;

    const symbols = Object.keys(data);
    const batches = [];

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

        trendHistory[symbol] = trendHistory[symbol] || [];
        trendHistory[symbol].push({ trend, time: Date.now() });
        trendHistory[symbol] = trendHistory[symbol].filter(
          t => Date.now() - t.time <= SPECIAL_SIGNAL_INTERVAL
        );

        const sameTrendCount = trendHistory[symbol].filter(t => t.trend === trend).length;

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

    io.emit('monitor:data', lastSignals);
  }, 5005);
}

// ✅ اتصال تابع خروجی
monitorEngineStart.getStats = getStats;