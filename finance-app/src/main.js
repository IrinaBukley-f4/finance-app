// main.js

import { fetchSource1, fetchSource2 } from './api.js';
import { sumTransactions, sumStrings, mergeTotals } from './revenue.js';
import { fetchExchangeRates, convertAmount } from './currency.js';
import { toMinorUnits, fromMinorUnits } from './money.js';

const CURRENCYFREAKS_API_KEY = process.env.CURRENCYFREAKS_API_KEY;

if (!CURRENCYFREAKS_API_KEY) {
  throw new Error(
    'Переменная окружения CURRENCYFREAKS_API_KEY не задана. ' +
      'Создайте файл .env (см. .env.example) и запустите скрипт с флагом --env-file=.env'
  );
}

const TARGET_CURRENCY = 'USD';

/**
 * Форматировать сумму в минорных единицах для вывода (валюта + локаль).
 * @param {number} minor — целые минорные единицы
 * @param {string} code — код валюты
 * @returns {string}
 */
function formatMinor(minor, code) {
  const upper = code.toUpperCase();
  const value = fromMinorUnits(minor, upper);
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: upper }).format(value);
}

/**
 * Главная функция: получить данные с серверов, посчитать выручку,
 * при необходимости сконвертировать всё в целевую валюту.
 * Totals возвращаются в целых минорных единицах каждой валюты.
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

  // ==================== 3. ПОДСЧЁТ (в минорных единицах) ====================
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
      totalsByCurrency,
      note: 'Суммы в разных валютах не смешаны. Укажите convertToTarget: true для конвертации.',
    };
  }

  // ==================== 5. КОНВЕРТАЦИЯ В ЦЕЛЕВУЮ ВАЛЮТУ ====================
  // Ошибка здесь не роняет Части 2–4: они уже выполнены.
  let rates;
  try {
    rates = await fetchExchangeRates(CURRENCYFREAKS_API_KEY, targetCurrency);
  } catch (err) {
    console.error('Ошибка при получении курсов валют:', err.message);
    console.error('Разбивка по валютам (без конвертации):');
    for (const [code, minor] of Object.entries(totalsByCurrency)) {
      console.error(`  ${code.toUpperCase()}: ${formatMinor(minor, code)}`);
    }
    return null;
  }

  const targetCode = targetCurrency.toUpperCase();
  let totalMinor = 0; // сумма в минорных единицах целевой валюты
  const breakdown = {};

  for (const [code, minor] of Object.entries(totalsByCurrency)) {
    try {
      const converted = convertAmount(fromMinorUnits(minor, code), code, targetCode, rates);
      const convertedMinor = toMinorUnits(converted, targetCode);
      totalMinor += convertedMinor;
      breakdown[code.toUpperCase()] = {
        original: minor,
        converted: convertedMinor,
      };
    } catch (err) {
      console.error(`Не удалось сконвертировать ${code}:`, err.message);
    }
  }

  if (totalMinor === 0) {
    console.error('Ошибка: не удалось сконвертировать ни одной суммы');
    return null;
  }

  return {
    total: totalMinor,
    currency: targetCode,
    breakdown,
  };
}

// ==================== ЗАПУСК ====================
(async () => {
  console.log('=== Без конвертации (Части 2–4) ===');
  const plain = await calculateDailyRevenueFromServer();
  if (plain) {
    if (plain.totalsByCurrency) {
      for (const [code, minor] of Object.entries(plain.totalsByCurrency)) {
        console.log(`${code}: ${formatMinor(minor, code)} (${minor} минорных единиц)`);
      }
    } else {
      console.log(`${plain.currency}: ${formatMinor(plain.total, plain.currency)} (${plain.total} минорных единиц)`);
    }
  }

  console.log('\n=== С конвертацией в USD (Часть 5) ===');
  const converted = await calculateDailyRevenueFromServer({ convertToTarget: true });
  if (converted) {
    for (const [code, { original, converted: conv }] of Object.entries(converted.breakdown)) {
      console.log(`${code}: ${formatMinor(original, code)} → ${formatMinor(conv, converted.currency)}`);
    }
    console.log(`Итого: ${formatMinor(converted.total, converted.currency)} (${converted.total} минорных единиц)`);
  }
})();
