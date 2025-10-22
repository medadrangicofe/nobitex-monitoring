// src/services/dataFetcher.js
import fetch from "node-fetch";
import logger from "../utils/logger.js";

/**
 * Fetch market stats data from Nobitex API with retry and timeout logic.
 */
export async function fetchNobitexData() {
  const NOBITEX_API_URL = process.env.NOBITEX_API_URL || "https://apiv2.nobitex.ir/market/stats";
  const RETRY_COUNT = 3;
  const RETRY_DELAY = 5000; // ms
  const TIMEOUT = 10000; // ms (10 seconds)

  for (let attempt = 1; attempt <= RETRY_COUNT; attempt++) {
    logger.debug(`Fetching Nobitex API (Attempt ${attempt}/${RETRY_COUNT}): ${NOBITEX_API_URL}`);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT);

      const response = await fetch(NOBITEX_API_URL, {
        method: "GET",
        signal: controller.signal,
        headers: {
          "Accept": "application/json",
          "User-Agent": "NobitexMonitor/1.0",
        },
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();

      // Validate Nobitex response structure
      if (!data || typeof data !== "object" || !data.stats) {
        logger.error("⚠️ ساختار پاسخ نوبیتکس غیرمنتظره است", JSON.stringify(data));
        return null;
      }

      logger.success(`Nobitex data received successfully on attempt ${attempt}`);
      return data.stats;

    } catch (error) {
      const isLastAttempt = attempt === RETRY_COUNT;

      if (error.name === "AbortError") {
        logger.error(`⏱️ Timeout after ${TIMEOUT / 1000}s on attempt ${attempt}`);
      } else {
        logger.error(`❌ Fetch error on attempt ${attempt}: ${error.message}`);
      }

      if (!isLastAttempt) {
        logger.debug(`Retrying in ${RETRY_DELAY / 1000}s...`);
        await new Promise((r) => setTimeout(r, RETRY_DELAY));
      } else {
        logger.error("🚨 All Nobitex API fetch attempts failed.");
      }
    }
  }

  return null;
}