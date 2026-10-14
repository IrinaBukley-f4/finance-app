// money.js

/**
 * Минорные единицы валют: сколько знаков после запятой у валюты.
 * Неизвестная валюта — 2 знака (по умолчанию), с предупреждением.
 */
const MINOR_UNITS = {
  USD: 2,
  EUR: 2,
  BYN: 2,
  GBP: 2,
  JPY: 0,
  KRW: 0,
  BTC: 8,
  ETH: 18,
};

/**
 * Получить количество минорных знаков валюты.
 * @param {string} currency
 * @returns {number}
 */
export function getMinorUnits(currency) {
  const code = String(currency).toUpperCase();
  const decimals = MINOR_UNITS[code];
  if (decimals === undefined) {
    console.warn(`money.js: неизвестная валюта "${code}" — использую 2 минорных знака по умолчанию`);
    return 2;
  }
  return decimals;
}

/**
 * Банковское округление (half-even) до заданного числа знаков.
 * @param {number} value
 * @param {number} decimals
 * @returns {number}
 */
export function roundHalfEven(value, decimals = 2) {
  if (typeof value !== 'number' || !isFinite(value)) {
    throw new Error(`roundHalfEven: значение должно быть конечным числом, получено: ${value}`);
  }
  const factor = 10 ** decimals;
  const scaled = value * factor;
  const floor = Math.floor(scaled);
  const diff = scaled - floor;
  const EPS = 1e-9;
  let rounded;
  if (Math.abs(diff - 0.5) < EPS) {
    // ровно .5 — округляем к чётному
    rounded = floor % 2 === 0 ? floor : floor + 1;
  } else {
    rounded = Math.round(scaled);
  }
  return rounded / factor;
}

/**
 * Перевести сумму в целые минорные единицы (например, 1.005 USD → 100).
 * @param {number} amount
 * @param {string} currency
 * @returns {number} — целое число минорных единиц
 */
export function toMinorUnits(amount, currency) {
  if (typeof amount !== 'number' || !isFinite(amount)) {
    throw new Error(`toMinorUnits: сумма должна быть конечным числом, получено: ${amount}`);
  }
  const decimals = getMinorUnits(currency);
  // Сначала округляем десятичную часть банковским округлением, затем в целые
  return Math.round(roundHalfEven(amount, decimals) * 10 ** decimals);
}

/**
 * Перевести минорные единицы обратно в десятичную сумму.
 * @param {number} minor — целое число минорных единиц
 * @param {string} currency
 * @returns {number}
 */
export function fromMinorUnits(minor, currency) {
  if (typeof minor !== 'number' || !Number.isInteger(minor)) {
    throw new Error(`fromMinorUnits: ожидаются целые минорные единицы, получено: ${minor}`);
  }
  const decimals = getMinorUnits(currency);
  return minor / 10 ** decimals;
}
