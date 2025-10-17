import fetch from 'node-fetch';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

/**
 *     
 * alert = { title, message, level }
 */
export async function sendMonitorAlertTelegram(alert) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn('Telegram credentials not set');
    return;
  }

  const messageText = alert.message || '';
  const message = ` [${(alert.level || 'info').toUpperCase()}] ${alert.title}\n${messageText}`;
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message })
    });
    console.log(`Monitor alert sent to Telegram: ${alert.title}`);
  } catch (err) {
    console.error('Failed to send monitor alert to Telegram:', err);
  }
}