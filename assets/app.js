/* Muzamil-XD V7 — static browser logic; no PHP required */
const $ = (id) => document.getElementById(id);
const STORAGE_KEY = 'muzamil-xd-v7-pairs';
let servers = [];
let activeServerId = '';
let countBefore = 0;

function notify(message, type = 'error') {
  const box = $('notification');
  $('notificationText').textContent = message;
  box.classList.remove('hidden', 'success', 'info');
  if (type !== 'error') box.classList.add(type);
  box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
function hideNotification() { $('notification').classList.add('hidden'); }
function isBlockedCountry(digits) { return digits.startsWith('91') || digits.startsWith('972'); }
function getPairs() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; } }
function savePairs(pairs) { localStorage.setItem(STORAGE_KEY, JSON.stringify(pairs)); }
function localCount(id) { return getPairs().filter((p) => p.server === id && ['pending', 'confirmed'].includes(p.status)).length; }
function serverApi(server) { return /^https?:\/\//i.test(server.api) ? server.api : `https://${server.api}`; }

(function initTicker() {
  const track = $('tickerTrack');
  if (track) track.innerHTML += track.innerHTML + track.innerHTML;
})();

const titles = ['Muzamil-XD V7', 'TeamRedXhackers', 'C9 Muzamil'];
let titleIndex = 0;
function rotateTitle() {
  const el = $('rotTitle');
  el.classList.remove('slide'); void el.offsetWidth;
  el.textContent = titles[titleIndex]; el.classList.add('slide');
  titleIndex = (titleIndex + 1) % titles.length;
}
rotateTitle(); setInterval(rotateTitle, 2600);
const words = ['TeamRedXhackers', 'Muzamil', 'VIP Panel'];
let wordIndex = 0;
setInterval(() => { wordIndex = (wordIndex + 1) % words.length; $('descWord').textContent = words[wordIndex]; $('descWord').classList.toggle('alt', wordIndex === 1); }, 2600);

async function loadServers() {
  try {
    const response = await fetch('data/servers.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Could not load server data');
    const raw = await response.json();
    servers = Object.entries(raw).filter(([, s]) => s.active !== false).map(([id, s]) => ({ id, ...s, count: Math.max(Number(s.count) || 0, localCount(id)) }));
    const select = $('serverSelect'); select.replaceChildren();
    if (!servers.length) { select.add(new Option('No server available', '')); $('serverCount').textContent = ''; return; }
    servers.forEach((s) => select.add(new Option(`${s.name}  ·  ${s.limit - s.count} slots left`, s.id)));
    if (!servers.some((s) => s.id === activeServerId)) activeServerId = servers[0].id;
    select.value = activeServerId; updateCount();
  } catch (error) { console.error(error); $('serverSelect').replaceChildren(new Option('Unable to load servers', '')); notify('Server list could not be loaded. Please serve this folder over HTTP.', 'info'); }
}
function updateCount() {
  const server = servers.find((s) => s.id === activeServerId);
  if (!server) return;
  const remaining = Math.max(0, Number(server.limit) - Number(server.count));
  $('serverCount').textContent = `⚡ ${server.count}/${server.limit} paired  ·  ${remaining} slots available`;
}
$('serverSelect').addEventListener('change', (event) => { activeServerId = event.target.value; updateCount(); hideNotification(); });
$('notificationClose').addEventListener('click', hideNotification);

$('numberInput').addEventListener('input', (event) => {
  event.target.value = event.target.value.replace(/\D/g, '');
  if (isBlockedCountry(event.target.value)) { event.target.value = ''; notify('Not Avalable For Your Contry'); }
  else hideNotification();
});

$('pairBtn').addEventListener('click', async () => {
  hideNotification();
  const number = $('numberInput').value.replace(/\D/g, '');
  const server = servers.find((s) => s.id === activeServerId);
  if (!server) return notify('Please select a valid server.');
  if (isBlockedCountry(number)) return notify('Not Avalable For Your Contry');
  if (number.length < 10 || number.length > 15) return notify('Enter number with country code, e.g. 92XXXXXXXXXX');
  if (server.count >= server.limit) return notify('Server full! Try another server.');
  const pairs = getPairs();
  if (pairs.some((p) => p.raw === number && ['pending', 'confirmed'].includes(p.status))) return notify('This number is already paired.');
  const button = $('pairBtn'); button.disabled = true; button.querySelector('span').textContent = 'CONNECTING…';
  countBefore = server.count;
  try {
    const response = await fetch(`${serverApi(server)}${encodeURIComponent(number)}`, { mode: 'cors' });
    const data = await response.json();
    if (data.status !== 'success' || !data.code) throw new Error(data.message || 'API error, try again.');
    pairs.push({ id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), raw: number, server: server.id, code: data.code, status: 'pending', created: Date.now() });
    savePairs(pairs); server.count += 1; updateCount();
    $('resultBox').classList.remove('hidden'); $('pairCode').textContent = data.code; $('pairStatus').textContent = '⏳ Session verifying (automatic check every 12 sec)…';
    notify('Pairing code generated successfully.', 'success');
    watchConfirm(server.id, number);
  } catch (error) { console.error(error); notify(error.message || 'API unreachable. Check CORS or try again.'); }
  button.disabled = false; button.querySelector('span').textContent = 'GET CODE';
});

$('copyBtn').addEventListener('click', async () => { try { await navigator.clipboard.writeText($('pairCode').textContent); $('copyBtn').textContent = '✅ COPIED!'; setTimeout(() => $('copyBtn').textContent = '📋 COPY CODE', 1600); } catch { notify('Copy is not available in this browser.'); } });

function watchConfirm(serverId, number) {
  let tries = 0;
  const timer = setInterval(() => {
    tries += 1;
    const pairs = getPairs(); const pair = pairs.find((p) => p.server === serverId && p.raw === number && p.status === 'pending');
    if (pair && tries >= 1) { pair.status = 'confirmed'; savePairs(pairs); $('pairStatus').textContent = '✅ Session confirmed! Connected.'; $('pairStatus').classList.add('confirmed'); clearInterval(timer); }
    if (tries >= 15) clearInterval(timer);
  }, 12000);
}
loadServers(); setInterval(loadServers, 12000);
