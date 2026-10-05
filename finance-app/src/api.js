// api.js

const API_BASE = 'https://cpa-server-vtel.onrender.com/api';
const API_KEY = 'prodcpakey333';

/**
 * Универсальный GET-запрос с заголовком x-api-key.
 * @param {string} url
 * @returns {Promise<any>}
 */
async function fetchWithKey(url) {
  const response = await fetch(url, {
    headers: {
      'x-api-key': API_KEY,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} при запросе ${url}`);
  }

  return response.json();
}

/**
 * Получить данные источника №1 (объект с transactions и address).
 * @returns {Promise<Object>}
 */
export async function fetchSource1() {
  return fetchWithKey(`${API_BASE}/finance1`);
}

/**
 * Получить данные источника №2 (массив строк "300 USD").
 * @returns {Promise<Array<string>>}
 */
export async function fetchSource2() {
  return fetchWithKey(`${API_BASE}/finance2`);
}