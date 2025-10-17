import { sendMonitorAlertTelegram } from '../services/monitorTelegram.js';

/**
 * ارزیابی ریسک و ارسال هشدار
 * symbolAnalysis = { symbol: { trend, signal, price } }
 */
export function evaluateRisk(symbolAnalysis) {
  Object.keys(symbolAnalysis).forEach(symbol => {
    const { signal, price } = symbolAnalysis[symbol];

    if (signal === 'buy' || signal === 'sell') {
      sendMonitorAlertTelegram({
        title: `${symbol} Risk Alert`,
        message: `Signal: ${signal}, Price: ${price}`,
        level: 'warn'
      });
    }
  });
}