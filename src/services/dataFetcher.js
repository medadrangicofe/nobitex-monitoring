// src/services/dataFetcher.js
import axios from 'axios';
import logger from '../utils/logger.js';

const API_BASE_URL = process.env.NOBITEX_API_BASE_URL || 'https://api.nobitex.ir';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2500;

/**
 * تأخیر تطبیقی برای retry درخواست‌های ناموفق
 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * ارسال درخواست امن به API نوبیتکس با مدیریت کامل خطا
 * @param {string} endpoint - مسیر نسبی درخواست (مثلاً /market/stats)
 * @param {object} params - پارامترهای درخواست
 * @returns {Promise<object|null>} دادهٔ دریافتی از نوبیتکس یا null در صورت خطا
 */
export async function fetchNobitexData(endpoint, params = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    try {
      const response = await axios.get(url, { params, timeout: 10000 });
      const data = response.data;

      if (!data || typeof data !== 'object') {
        throw new Error('Invalid API response structure');
      }

      // بررسی فیلدهای کلیدی در پاسخ
      if (data.status && data.status !== 'ok') {
        throw new Error(`Nobitex API returned status: ${data.status}`);
      }

      return data;
    } catch (err) {
      attempt++;
      const retrying = attempt < MAX_RETRIES;

      logger.warn(
        `[fetchNobitexData] Attempt ${attempt} failed for ${endpoint}: ${err.message}`
      );

      if (!retrying) {
        logger.error(`[fetchNobitexData] Max retries reached for ${endpoint}`);
        return null;
      }

      await delay(RETRY_DELAY_MS * attempt);
    }
  }

  return null;
}

/**
 * نمونهٔ خاص برای دریافت آمار بازار
 */
export async function fetchMarketStats() {
  const data = await fetchNobitexData('/market/stats');
  if (!data?.stats) {
    logger.error('[fetchMarketStats] Missing stats field in response');
    return null;
  }
  return data.stats;
}

/**
 * نمونهٔ خاص برای دریافت آخرین قیمت‌های تتر و بیت‌کوین
 */
export async function fetchTickerSymbols(symbols = ['USDT-IRT', 'BTC-IRT']) {
  const joinedSymbols = symbols.join(',');
  const data = await fetchNobitexData('/market/tickers', { symbols: joinedSymbols });

  if (!data?.ticks) {
    logger.error('[fetchTickerSymbols] Missing ticks field in response');
    return null;
  }

  return data.ticks;
}