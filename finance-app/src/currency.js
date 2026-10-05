// currency.js

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
    throw new Error(`Не удалось получить курсы валют: HTTP ${response.status}`);
  }

  const data = await response.json();

  // API возвращает rates как { EUR: "0.888494", ... } — 1 USD = 0.888 EUR
  // Нам нужно обратное: сколько USD в 1 EUR → 1 / 0.888
  const rates = {};
  for (const [code, value] of Object.entries(data.rates)) {
    const num = parseFloat(value);
    if (!isNaN(num) && num !== 0) {
      rates[code.toUpperCase()] = 1 / num;
    }
  }

  // Базовая валюта всегда 1:1
  rates[base.toUpperCase()] = 1;

  return rates;
}

/**
 * Сконвертировать сумму из одной валюты в целевую.
 * @param {number} amount
 * @param {string} from — исходная валюта
 * @param {string} to — целевая валюта
 * @param {Object} rates — курсы из fetchExchangeRates
 * @returns {number}
 */
export function convertAmount(amount, from, to, rates) {
  const fromCode = from.toUpperCase();
  const toCode = to.toUpperCase();

  if (fromCode === toCode) return amount;

  const rate = rates[fromCode];
  if (rate === undefined) {
    throw new Error(`Нет курса для валюты ${fromCode}`);
  }

  return amount * rate;
}