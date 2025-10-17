import fetch from 'node-fetch';

let lastFetchTime = 0;
const RATE_LIMIT_MS = 5000; // محدودیت فراخوانی هر ۵ ثانیه

/**
 * دریافت اطلاعات بازار از Nobitex
 * برمی‌گرداند: شیء حاوی آخرین قیمت‌ها برای همه نمادها
 */
export async function fetchNobitexData() {
  const now = Date.now();
  if (now - lastFetchTime < RATE_LIMIT_MS) return null; // رعایت نرخ محدودیت

  lastFetchTime = now;

  try {
    const response = await fetch('https://api.nobitex.ir/market/ticker/');
    const data = await response.json();
    return data;
  } catch (err) {
    console.error('Failed to fetch Nobitex data:', err);
    return null;
  }
}