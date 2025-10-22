// src/services/dataFetcher.js
// نسخه‌ی بهینه‌شده برای رندر – شامل timeout 15s، retry سه‌مرحله‌ای و delay 5s

import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const NOBITEX_API_URL = process.env.NOBITEX_API_URL || "https://apiv2.nobitex.ir/market/stats";

/**
 * تاخیر در اجرای async
 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * دریافت داده از Nobitex با مدیریت timeout، retry و خطاهای JSON
 */
export async function fetchNobitexData() {
  const MAX_RETRIES = 3;
  const TIMEOUT_MS = 15000; // ۱۵ ثانیه
  const RETRY_DELAY_MS = 5000; // ۵ ثانیه

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      console.debug(`[DEBUG] Fetching Nobitex API (Attempt ${attempt}/${MAX_RETRIES}): ${NOBITEX_API_URL}`);
      const response = await fetch(NOBITEX_API_URL, {
        method: "GET",
        signal: controller.signal,
        headers: { "Accept": "application/json" },
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      if (!data || typeof data !== "object") {
        throw new Error("Invalid JSON structure");
      }

      console.debug(`[SUCCESS] Nobitex data received successfully on attempt ${attempt}`);
      return data;

    } catch (error) {
      clearTimeout(timeout);

      if (error.name === "AbortError") {
        console.error(`[ERROR] Fetch attempt ${attempt} timed out after ${TIMEOUT_MS / 1000}s`);
      } else {
        console.error(`[ERROR] Fetch attempt ${attempt} failed: ${error.message}`);
      }

      // تلاش مجدد در صورت امکان
      if (attempt < MAX_RETRIES) {
        console.log(`[INFO] Retrying in ${RETRY_DELAY_MS / 1000}s...`);
        await delay(RETRY_DELAY_MS);
        continue;
      }

      // در صورت شکست نهایی
      console.error(`[FATAL] All ${MAX_RETRIES} fetch attempts failed.`);
      return {
        error: true,
        code: 500,
        message: "Fetch failed",
        details: error.message || "Unknown error",
      };
    }
  }
}