import { fetchSource1, fetchSource2 } from './api.js';

const CURRENCY_RE = /^\s*(-?\d+(?:[.,]\d+)?)\s*([A-Za-z]{3,4})\s*$/;

function parseAmount(item) {
  if (typeof item === 'string') {
    const match = item.match(CURRENCY_RE);
    if (match) {
      return { amount: parseFloat(match[1].replace(',', '.')), currency: match[2].toUpperCase() };
    }
    return null;
  }
  if (item && typeof item === 'object') {
    const amount = item.amount ?? item.value ?? item.sum;
    const currency = item.currency ?? item.cur ?? item.code;
    if (typeof amount === 'number' && typeof currency === 'string') {
      return { amount, currency: currency.toUpperCase() };
    }
    if (typeof amount === 'string' && typeof currency === 'string') {
      return { amount: parseFloat(amount), currency: currency.toUpperCase() };
    }
  }
  return null;
}

function extractAmounts(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.transactions)) return data.transactions;
  return [];
}

function sumByCurrency(items) {
  const totals = {};
  for (const item of items) {
    const parsed = parseAmount(item);
    if (!parsed || Number.isNaN(parsed.amount)) continue;
    totals[parsed.currency] = (totals[parsed.currency] || 0) + parsed.amount;
  }
  return totals;
}

function renderTotals(element, totals) {
  element.innerHTML = '';
  const currencies = Object.keys(totals);
  if (!currencies.length) {
    element.textContent = 'Нет данных';
    return;
  }
  for (const [currency, sum] of currencies.sort().map((c) => [c, totals[c]])) {
    const div = document.createElement('div');
    div.className = 'flex justify-between';
    div.innerHTML = `<span>${currency}</span><span class="font-medium">${sum.toFixed(2)}</span>`;
    element.appendChild(div);
  }
}

function showError(message) {
  const box = document.getElementById('error-box');
  box.textContent = `Ошибка: ${message}`;
  box.classList.remove('hidden');
}

async function loadRates() {
  const response = await fetch('https://open.er-api.com/v6/latest/USD');
  if (!response.ok) throw new Error(`Не удалось получить курсы (HTTP ${response.status})`);
  const data = await response.json();
  if (!data.rates) throw new Error('Некорректный ответ сервиса курсов');
  const date = data.time_last_update_utc
    ? new Date(data.time_last_update_utc).toLocaleDateString('ru-RU')
    : null;
  return { rates: data.rates, date };
}

const ROW_STYLES = {
  paid: 'bg-green-50',
  pending: 'bg-yellow-50',
  rejected: 'bg-red-50',
};

const TYPE_BADGES = {
  paid: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  rejected: 'bg-red-100 text-red-700',
};

const CURRENCY_ICONS = {
  USD: '💵',
  EUR: '💶',
  GBP: '💷',
  JPY: '💴',
  RUB: '🇷🇺',
  BYN: '🇧🇾',
  UAH: '🇺🇦',
  PLN: '🇵🇱',
};

function parseTransaction(item) {
  const parsed = parseAmount(item);
  const type = item && typeof item === 'object'
    ? String(item.type ?? item.status ?? 'unknown').toLowerCase()
    : 'unknown';
  return { ...parsed, type };
}

function renderSource1(element, data) {
  element.innerHTML = '';
  const addressBox = document.getElementById('source1-address');
  if (data && typeof data.address === 'string') {
    addressBox.textContent = `Адрес: ${data.address}`;
    addressBox.classList.remove('hidden');
  }
  const transactions = extractAmounts(data);
  if (!transactions.length) {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="3" class="py-2 text-gray-400">Нет данных</td>';
    element.appendChild(row);
    return;
  }
  transactions.forEach((item) => {
    const { amount, currency, type } = parseTransaction(item);
    const row = document.createElement('tr');
    row.className = `border-b border-gray-100 last:border-0 ${ROW_STYLES[type] || ''}`;
    const badgeClass = TYPE_BADGES[type] || 'bg-gray-100 text-gray-600';
    row.innerHTML = `<td class="py-2 pr-2"><span class="inline-block px-2 py-0.5 rounded-full text-xs font-medium ${badgeClass}">${type}</span></td>` +
      `<td class="py-2 pr-2 font-medium text-gray-800">${amount ? amount.toFixed(2) : '—'}</td>` +
      `<td class="py-2">${currency || '—'}</td>`;
    element.appendChild(row);
  });
}

function renderSource2(element, data) {
  element.innerHTML = '';
  const items = extractAmounts(data);
  if (!items.length) {
    element.innerHTML = '<li class="text-gray-400">Нет данных</li>';
    return;
  }
  items.forEach((item) => {
    const parsed = parseAmount(item);
    const li = document.createElement('li');
    const label = parsed ? `${parsed.amount.toFixed(2)} ${parsed.currency}` : String(item);
    const icon = parsed ? CURRENCY_ICONS[parsed.currency] || '💱' : '💱';
    li.innerHTML = `<span class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 font-medium text-sm">
        <span class="text-base leading-none">${icon}</span>${label}
      </span>`;
    element.appendChild(li);
  });
}

function renderRates(element, rates, currencies, date) {
  element.innerHTML = '';
  const others = currencies.filter((c) => c !== 'USD' && rates[c]);
  if (!others.length) {
    element.textContent = 'Нет данных';
    return;
  }
  const parts = others.sort().map((currency) => `${currency} ${rates[currency].toFixed(4)}`);
  const line = document.createElement('div');
  line.className = 'font-medium text-gray-700';
  line.textContent = parts.join(' · ');
  element.appendChild(line);
  if (date) {
    const dateLine = document.createElement('div');
    dateLine.className = 'text-xs text-gray-400';
    dateLine.textContent = `курс ЦБ на ${date}`;
    element.appendChild(dateLine);
  }
}

async function main() {
  try {
    const [source1, source2, { rates, date }] = await Promise.all([
      fetchSource1(),
      fetchSource2(),
      loadRates(),
    ]);

    const totals1 = sumByCurrency(extractAmounts(source1));
    const totals2 = sumByCurrency(extractAmounts(source2));
    const combined = { ...totals1 };
    for (const [currency, sum] of Object.entries(totals2)) {
      combined[currency] = (combined[currency] || 0) + sum;
    }

    renderSource1(document.getElementById('source1-body'), source1);
    renderSource2(document.getElementById('source2'), source2);
    renderTotals(document.getElementById('totals'), combined);
    renderRates(document.getElementById('rates'), rates, Object.keys(combined), date);
  } catch (error) {
    showError(error.message);
    document.getElementById('source2').innerHTML = '<li class="text-red-500">—</li>';
    document.getElementById('source1-body').innerHTML = '<tr><td colspan="3" class="py-2 text-red-500">—</td></tr>';
    document.getElementById('rates').textContent = '—';
  }
}

main();
