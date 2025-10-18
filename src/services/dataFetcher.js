// src/services/dataFetcher.js
import fetch from 'node-fetch';
import logger from '../utils/logger.js';

const NOBITEX_BASE_URL = 'https://api.nobitex.ir';
const USER_AGENT = 'Nobitex-RadarBot/1.0';
const API_TOKEN = process.env.NOBITEX_TOKEN || null;

export async function fetchNobitexData(endpoint, params = {}) {
  try {
    const url = new URL(NOBITEX_BASE_URL + endpoint);

    // افزودن پارامترها به URL در صورت نیاز (فقط برای GET)
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.append(key, params[key]);
      }
    });

    // ساخت هدرها بر اساس مستندات رسمی نوبیتکس
    const headers = {
      'User-Agent': USER_AGENT,
      'Accept': 'application/json'
    };

    // اگر توکن موجود باشد → اضافه کردن هدر Authorization (برای API خصوصی)
    if (API_TOKEN) {
      headers['Authorization'] = `Token ${API_TOKEN}`;
    }

    logger.info(`🔍 Fetching Nobitex API: ${url}`);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers,
      timeout: 8000 // 8 ثانیه timeout برای Render
    });

    // مدیریت خطاها
    if (response.status === 429) {
      logger.warn('⚠ Nobitex API Rate Limit - Too Many Requests (429)');
      return { error: true, code: 429, message: 'Rate limited by Nobitex' };
    }
    if (response.status === 403) {
      logger.error('⛔ Access Forbidden - 403 (Token یا مجوز اشتباه است)');
      return { error: true, code: 403, message: 'Forbidden - Check token or access' };
    }
    if (!response.ok) {
      logger.error(`❌ HTTP Error ${response.status} دریافت شد`);
      return { error: true, code: response.status, message: 'HTTP Request Failed' };
    }

    const data = await response.json();
    return { error: false, data };

  } catch (err) {
    logger.error(`🔥 Fetch failed: ${err.message}`);
    return { error: true, code: 500, message: 'Fetch failed', details: err.message };
  }
}