// revenue.js

import { normalizeCurrency } from './currency.js';

/**
 * Посчитать выручку из одного источника транзакций (источник №1).
 * @param {Array} transactions
 * @param {Object} options
 * @param {boolean} options.groupByCurrency — если true, вернуть разбивку по валютам
 * @returns {{ totals: Object, errors: Array }}
 */
export function sumTransactions(transactions, { groupByCurrency = false } = {}) {
  const totals = {}; // { usd: 1110, eur: 200 }
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
    totals[code] = (totals[code] || 0) + tx.amount;
  });

  return { totals, errors };
}

/**
 * Посчитать выручку из источника №2 (массив строк "300 USD").
 * @param {Array<string>} items
 * @returns {{ totals: Object, errors: Array }}
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

    totals[code] = (totals[code] || 0) + amount;
  });

  return { totals, errors };
}

/**
 * Объединить разбивки по валютам из нескольких источников.
 * @param  {...Object} totalsList — объекты вида { usd: 1110, eur: 200 }
 * @returns {Object}
 */
export function mergeTotals(...totalsList) {
  const merged = {};
  for (const totals of totalsList) {
    for (const [code, amount] of Object.entries(totals)) {
      merged[code] = (merged[code] || 0) + amount;
    }
  }
  return merged;
}