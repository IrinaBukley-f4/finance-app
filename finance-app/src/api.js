// api.js

const isNode = typeof process !== 'undefined' && !!process.env;

// В Node читаем process.env (запуск с --env-file=.env),
// в браузере под Vite — import.meta.env (переменные с префиксом VITE_).
const env = isNode
  ? process.env
  : import.meta.env ?? {};

const API_BASE = isNode ? env.CPA_API_BASE : env.VITE_CPA_API_BASE;
const API_KEY = isNode ? env.CPA_API_KEY : env.VITE_CPA_API_KEY;

if (!API_BASE) {
  throw new Error(
    'Переменная окружения CPA_API_BASE не задана. ' +
      'Создайте файл .env (см. .env.example) и запустите скрипт с флагом --env-file=.env'
  );
}

if (!API_KEY) {
  throw new Error(
    'Переменная окружения CPA_API_KEY не задана. ' +
      'Создайте файл .env (см. .env.example) и запустите скрипт с флагом --env-file=.env'
  );
}

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
