// index.js

import { fetchSource1, fetchSource2 } from './api.js';
import { sumTransactions, sumStrings, mergeTotals } from './revenue.js';
import { fetchExchangeRates, convertAmount } from './currency.js';

const CURRENCYFREAKS_API_KEY = process.env.CURRENCYFREAKS_API_KEY;
const TARGET_CURRENCY = 'USD';

/**
 * Главная функция: получить данные с серверов, посчитать выручку,
 * при необходимости сконвертировать всё в целевую валюту.
 * @param {Object} options
 * @param {boolean} options.convertToTarget — конвертировать ли валюты в целевую
 * @param {string} options.targetCurrency
 * @returns {Promise<Object>}
 */
export async function calculateDailyRevenueFromServer({
  convertToTarget = false,
  targetCurrency = TARGET_CURRENCY,
} = {}) {
  // ==================== 1. ЗАПРОСЫ ====================
  let source1, source2;
  try {
    [source1, source2] = await Promise.all([fetchSource1(), fetchSource2()]);
  } catch (err) {
    console.error('Ошибка при загрузке данных с сервера:', err.message);
    return null;
  }

  // ==================== 2. ВАЛИДАЦИЯ ====================
  if (!source1 || typeof source1 !== 'object' || Array.isArray(source1)) {
    console.error('Ошибка: Источник №1 должен быть объектом');
    return null;
  }
  if (!Array.isArray(source1.transactions)) {
    console.error('Ошибка: В источнике №1 отсутствует массив "transactions"');
    return null;
  }
  if (!Array.isArray(source2)) {
    console.error('Ошибка: Источник №2 должен быть массивом');
    return null;
  }

  // ==================== 3. ПОДСЧЁТ ====================
  const { totals: totals1, errors: errors1 } = sumTransactions(source1.transactions);
  const { totals: totals2, errors: errors2 } = sumStrings(source2);

  errors1.forEach((e) => console.error('Источник №1:', e));
  errors2.forEach((e) => console.error('Источник №2:', e));

  const totalsByCurrency = mergeTotals(totals1, totals2);

  if (Object.keys(totalsByCurrency).length === 0) {
    console.error('Ошибка: Не удалось получить ни одной валидной суммы');
    return null;
  }

  // ==================== 4. БЕЗ КОНВЕРТАЦИИ ====================
  if (!convertToTarget) {
    const codes = Object.keys(totalsByCurrency);

    if (codes.length === 1) {
      // Одна валюта — возвращаем как раньше
      const code = codes[0];
      return {
        total: totalsByCurrency[code],
        currency: code.toUpperCase(),
      };
    }

    // Несколько валют — возвращаем разбивку
    return {
      totalsByCurrency: Object.fromEntries(
        Object.entries(totalsByCurrency).map(([code, amount]) => [
          code.toUpperCase(),
          amount,
        ])
      ),
      note: 'Суммы в разных валютах не смешаны. Укажите convertToTarget: true для конвертации.',
    };
  }

  // ==================== 5. КОНВЕРТАЦИЯ В ЦЕЛЕВУЮ ВАЛЮТУ ====================
  let rates;
  try {
    rates = await fetchExchangeRates(CURRENCYFREAKS_API_KEY, targetCurrency);
  } catch (err) {
    console.error('Ошибка при получении курсов валют:', err.message);
    return null;
  }

  let totalInTarget = 0;
  const breakdown = {};

  for (const [code, amount] of Object.entries(totalsByCurrency)) {
    try {
      const converted = convertAmount(amount, code, targetCurrency, rates);
      totalInTarget += converted;
      breakdown[code.toUpperCase()] = {
        original: amount,
        converted: Number(converted.toFixed(2)),
      };
    } catch (err) {
      console.error(`Не удалось сконвертировать ${code}:`, err.message);
    }
  }

  return {
    total: Number(totalInTarget.toFixed(2)),
    currency: targetCurrency.toUpperCase(),
    breakdown,
  };
}

// ==================== ЗАПУСК ====================
(async () => {
  console.log('=== Без конвертации (Части 2–4) ===');
  console.log(await calculateDailyRevenueFromServer());

  console.log('\n=== С конвертацией в USD (Часть 5) ===');
  console.log(await calculateDailyRevenueFromServer({ convertToTarget: true }));
})();