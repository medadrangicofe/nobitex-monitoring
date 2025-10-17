/**
 * تحلیل روندها و تولید سیگنال
 * symbolData = { symbol: { price, trend, history } }
 */
export function analyzeTrends(symbolData) {
  const analysis = {};

  Object.keys(symbolData).forEach(symbol => {
    const data = symbolData[symbol];
    const trend = data.trend;
    const history = data.history || [];

    const upCount = history.filter(t => t.trend === 'up').length;
    const downCount = history.filter(t => t.trend === 'down').length;

    let signal = 'neutral';
    if (upCount >= 3) signal = 'buy';
    else if (downCount >= 3) signal = 'sell';

    analysis[symbol] = { trend, signal, price: data.price };
  });

  return analysis;
}