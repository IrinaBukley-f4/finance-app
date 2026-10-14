// currency.js

import { roundHalfEven, getMinorUnits } from './money.js';

/**
 * Нормализовать код валюты: обрезать пробелы и привести к нижнему регистру.
 * @param {string} code
 * @returns {string}
 */
export function normalizeCurrency(code) {
  return String(code).trim().toLowerCase();
}

/**
 * Проверить, что код валюты — 3 латинские буквы (в любом регистре).
 * @param {string} code
 * @returns {boolean}
 */
export function isValidCurrencyCode(code) {
  return /^[A-Za-z]{3}$/.test(String(code).trim());
}

/**
 * Получить курсы валют относительно целевой валюты (по умолчанию USD).
 * Использует CurrencyFreaks (бесплатный план, обновление раз в день).
 * @param {string} apiKey — ключ CurrencyFreaks
 * @param {string} base — целевая валюта (например, 'USD')
 * @returns {Promise<Object>} — объект { USD: 1, EUR: 0.888..., ... } (сколько целевой валюты в 1 единице валюты)
 */
export async function fetchExchangeRates(apiKey, base = 'USD') {
  const url = `https://api.currencyfreaks.com/v2.0/rates/latest?apikey=${apiKey}&base=${base}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Не удалось получить курсы валют: HTTP ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Курсы валют: ответ API не является объектом');
  }

  if (!data.rates || typeof data.rates !== 'object' || Array.isArray(data.rates)) {
    throw new Error('Курсы валют: в ответе API отсутствует объект "rates"');
  }

  const expectedBase = base.toUpperCase();
  if (data.base && String(data.base).toUpperCase() !== expectedBase) {
    console.warn(
      `Курсы валют: API вернул base="${data.base}", ожидался "${expectedBase}". Продолжаю с фактическим base.`
    );
  }

  // API возвращает rates как { EUR: "0.888494", ... } — 1 USD = 0.888 EUR
  // Нам нужно обратное: сколько USD в 1 EUR → 1 / 0.888
  const rates = {};
  let skipped = 0;
  for (const [code, value] of Object.entries(data.rates)) {
    const num = parseFloat(value);
    if (!isFinite(num) || num <= 0) {
      console.warn(`Курсы валют: пропускаю некорректный курс ${code}=${value}`);
      skipped++;
      continue;
    }
    rates[code.toUpperCase()] = 1 / num;
  }

  if (skipped > 0) {
    console.warn(`Курсы валют: пропущено некорректных курсов: ${skipped}`);
  }

  // Базовая валюта всегда 1:1
  rates[expectedBase] = 1;

  if (Object.keys(rates).length < 2) {
    throw new Error('API не вернул ни одного валидного курса');
  }

  return rates;
}

/**
 * Сконвертировать сумму из одной валюты в целевую.
 * Результат округляется банковским округлением до минорных единиц целевой валюты.
 * @param {number} amount
 * @param {string} from — исходная валюта
 * @param {string} to — целевая валюта
 * @param {Object} rates — курсы из fetchExchangeRates
 * @returns {number}
 */
export function convertAmount(amount, from, to, rates) {
  if (typeof amount !== 'number' || !isFinite(amount)) {
    throw new Error(`convertAmount: сумма должна быть конечным числом, получено: ${amount}`);
  }
  if (!rates || typeof rates !== 'object' || Array.isArray(rates)) {
    throw new Error('convertAmount: rates должен быть объектом с курсами');
  }

  const fromCode = from.toUpperCase();
  const toCode = to.toUpperCase();

  if (fromCode === toCode) return amount;

  const rate = rates[fromCode];
  if (rate === undefined) {
    throw new Error(`Нет курса для валюты ${fromCode}`);
  }
  if (!isFinite(rate) || rate <= 0) {
    throw new Error(`Некорректный курс для валюты ${fromCode}: ${rate}`);
  }

  const decimals = getMinorUnits(toCode);
  return roundHalfEven(amount * rate, decimals);
}
