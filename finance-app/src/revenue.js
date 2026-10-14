// revenue.js

import { normalizeCurrency } from './currency.js';
import { toMinorUnits } from './money.js';

/**
 * Посчитать выручку из одного источника транзакций (источник №1).
 * Суммирование ведётся в целых минорных единицах каждой валюты.
 * @param {Array} transactions
 * @param {Object} options
 * @param {boolean} options.groupByCurrency — если true, вернуть разбивку по валютам
 * @returns {{ totals: Object, errors: Array }} — totals: { usd: 111000 } (минорные единицы)
 */
export function sumTransactions(transactions, { groupByCurrency = false } = {}) {
  const totals = {}; // { usd: 111000 } — минорные единицы
  const errors = [];

  if (!Array.isArray(transactions)) {
    errors.push('Поле "transactions" должно быть массивом');
    return { totals, errors };
  }

  transactions.forEach((tx, index) => {
    if (!tx || typeof tx !== 'object') {
      errors.push(`Транзакция №${index} не является объектом`);
      return;
    }

    if (tx.type !== 'paid') return; // игнорируем не-paid

    if (typeof tx.amount !== 'number' || !isFinite(tx.amount)) {
      errors.push(`Некорректная сумма в транзакции №${index}`);
      return;
    }

    if (typeof tx.currency !== 'string' || !tx.currency.trim()) {
      errors.push(`Некорректная валюта в транзакции №${index}`);
      return;
    }

    const code = normalizeCurrency(tx.currency);
    const minor = toMinorUnits(tx.amount, code);
    totals[code] = (totals[code] || 0) + minor;
  });

  return { totals, errors };
}

/**
 * Посчитать выручку из источника №2 (массив строк "300 USD").
 * Суммирование ведётся в целых минорных единицах каждой валюты.
 * @param {Array<string>} items
 * @returns {{ totals: Object, errors: Array }} — totals: { usd: 111000 } (минорные единицы)
 */
export function sumStrings(items) {
  const totals = {};
  const errors = [];

  if (!Array.isArray(items)) {
    errors.push('Источник №2 должен быть массивом');
    return { totals, errors };
  }

  items.forEach((item, index) => {
    if (typeof item !== 'string') {
      errors.push(`Элемент №${index} источника №2 не строка`);
      return;
    }

    // Принимаем любой регистр валюты: [A-Za-z]{3}
    const match = item.trim().match(/^(\d+(?:\.\d+)?)\s+([A-Za-z]{3})$/);
    if (!match) {
      errors.push(`Некорректный формат строки №${index}: "${item}"`);
      return;
    }

    const amount = parseFloat(match[1]);
    const code = normalizeCurrency(match[2]);

    if (isNaN(amount)) {
      errors.push(`Не удалось распарсить сумму №${index}: "${item}"`);
      return;
    }

    const minor = toMinorUnits(amount, code);
    totals[code] = (totals[code] || 0) + minor;
  });

  return { totals, errors };
}

/**
 * Объединить разбивки по валютам из нескольких источников (в минорных единицах).
 * @param  {...Object} totalsList — объекты вида { usd: 111000 }
 * @returns {Object}
 */
export function mergeTotals(...totalsList) {
  const merged = {};
  for (const totals of totalsList) {
    for (const [code, minor] of Object.entries(totals)) {
      merged[code] = (merged[code] || 0) + minor;
    }
  }
  return merged;
}
