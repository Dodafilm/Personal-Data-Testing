import { normalizeOuraSleep, normalizeOuraHeartRate, normalizeOuraActivity } from './data-adapter.js';
import { saveDays, saveSettings, loadSettings } from './store.js';

const BASE_URL = 'https://api.ouraring.com';

export async function fetchOuraData(token, startDate, endDate, proxyUrl = '') {
  if (!token) throw new Error('No Oura API token provided');
  if (!startDate || !endDate) throw new Error('Start and end dates are required');

  const results = { sleep: [], heart: [], workout: [], errors: [] };

  const endpoints = [
    { path: '/v2/usercollection/daily_sleep', key: 'sleep', normalize: normalizeOuraSleep },
    { path: '/v2/usercollection/heartrate', key: 'heart', normalize: normalizeOuraHeartRate },
    { path: '/v2/usercollection/daily_activity', key: 'workout', normalize: normalizeOuraActivity },
  ];

  for (const ep of endpoints) {
    try {
      const data = await fetchEndpoint(token, ep.path, startDate, endDate, proxyUrl);
      const normalized = ep.normalize(data);
      results[ep.key] = normalized;
      saveDays(normalized);
    } catch (err) {
      results.errors.push({ endpoint: ep.key, error: err.message });
    }
  }

  return results;
}

async function fetchEndpoint(token, path, startDate, endDate, proxyUrl) {
  const params = new URLSearchParams({ start_date: startDate, end_date: endDate });
  const url = `${BASE_URL}${path}?${params}`;
  const fetchUrl = proxyUrl ? `${proxyUrl.replace(/\/+$/, '')}/${url}` : url;

  const response = await fetch(fetchUrl, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Oura API error ${response.status}: ${text || response.statusText}`);
  }

  return response.json();
}

export function initOuraSettings() {
  const settings = loadSettings();
  const tokenInput = document.getElementById('oura-token');
  const proxyInput = document.getElementById('cors-proxy');
  const startInput = document.getElementById('fetch-start');
  const endInput = document.getElementById('fetch-end');
  const fetchBtn = document.getElementById('fetch-oura');
  const statusEl = document.getElementById('fetch-status');

  if (settings.ouraToken) tokenInput.value = settings.ouraToken;
  if (settings.corsProxy) proxyInput.value = settings.corsProxy;

  // Default date range: last 30 days
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  startInput.value = startInput.value || formatDate(start);
  endInput.value = endInput.value || formatDate(end);

  fetchBtn.addEventListener('click', async () => {
    const token = tokenInput.value.trim();
    const proxy = proxyInput.value.trim();

    saveSettings({ ouraToken: token, corsProxy: proxy });

    if (!token) {
      statusEl.textContent = 'Please enter your Oura token';
      statusEl.className = 'status-msg error';
      return;
    }

    statusEl.textContent = 'Fetching data from Oura...';
    statusEl.className = 'status-msg loading';

    try {
      const results = await fetchOuraData(token, startInput.value, endInput.value, proxy);
      const total = results.sleep.length + results.heart.length + results.workout.length;
      let msg = `Imported ${total} records`;
      if (results.errors.length > 0) {
        msg += ` (${results.errors.length} endpoint(s) failed)`;
      }
      statusEl.textContent = msg;
      statusEl.className = 'status-msg success';

      // Dispatch event so the dashboard can refresh
      window.dispatchEvent(new CustomEvent('data-updated'));
    } catch (err) {
      statusEl.textContent = `Error: ${err.message}`;
      statusEl.className = 'status-msg error';
    }
  });
}

function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
