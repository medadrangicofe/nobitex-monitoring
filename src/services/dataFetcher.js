// src/services/dataFetcher.js  (پیشنهادی - جایگزین کامل)
import fetch from 'node-fetch';
import logger from '../utils/logger.js';

const DEFAULT_BASE = 'https://apiv2.nobitex.ir'; // پیش‌فرض (مطابق نمونه‌های مستندات apiv2)
const NOBITEX_BASE_URL = process.env.NOBITEX_BASE_URL || DEFAULT_BASE;
const USER_AGENT = process.env.USER_AGENT || 'Nobitex-RadarBot/1.0';
const API_TOKEN = process.env.NOBITEX_TOKEN || null;
const DEFAULT_TIMEOUT_MS = Number(process.env.FETCH_TIMEOUT_MS || 15000);

function buildUrl(endpoint = '/market/stats', params = {}) {
  if (!endpoint) endpoint = '/market/stats';
  if (!endpoint.startsWith('/')) endpoint = '/' + endpoint;
  const url = new URL(NOBITEX_BASE_URL + endpoint);
  Object.keys(params).forEach(key => {
    const v = params[key];
    if (v !== undefined && v !== null) url.searchParams.append(key, String(v));
  });
  return url.toString();
}

async function fetchWithTimeout(url, options = {}, timeout = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

export async function fetchNobitexData(endpoint = '/market/stats', params = {}, opts = {}) {
  try {
    const url = buildUrl(endpoint, params);

    const headers = {
      'User-Agent': USER_AGENT,
      'Accept': 'application/json',
      ...(API_TOKEN ? { 'Authorization': `Token ${API_TOKEN}` } : {}),
    };

    const fetchOptions = {
      method: opts.method || 'GET',
      headers,
      ...(opts.body ? { body: opts.body } : {}),
    };

    logger.debug(`🔍 Fetching Nobitex API: ${url}`);

    const response = await fetchWithTimeout(url, fetchOptions, opts.timeout || DEFAULT_TIMEOUT_MS);

    if (!response) {
      logger.error('🔥 No response received from fetch');
      return { error: true, code: 0, message: 'No response' };
    }

    if (response.status === 401 || response.status === 403) {
      logger.error(`❌ Unauthorized/Forbidden (status ${response.status})`);
      return { error: true, code: response.status, message: 'Forbidden - Check token or access' };
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      logger.error(`❌ HTTP Error ${response.status} دریافت شد. جواب: ${text}`);
      return { error: true, code: response.status, message: 'HTTP Request Failed', details: text };
    }

    const data = await response.json().catch(() => null);
    if (data === null) {
      logger.error('❌ Failed to parse JSON from Nobitex response');
      return { error: true, code: 500, message: 'Invalid JSON' };
    }

    return { error: false, data };
  } catch (err) {
    const message = err.name === 'AbortError' ? 'Request timed out' : err.message;
    logger.error(`🔥 Fetch failed: ${message}`);
    return { error: true, code: 500, message: 'Fetch failed', details: message };
  }
}