import { searchChannels } from './search.mjs';

const messages = {
  en: {
    heading: 'TV Channel Finder', placeholder: 'Search by channel name or number',
    skip: 'Skip to channel search', empty: 'No channels found.', list: 'Channels',
    clear: 'Clear search', light: 'Light mode', channel: 'Channel',
    roku: 'Ask the front desk to bring a Roku to your room for Netflix or YouTube.',
    results: count => `${count} ${count === 1 ? 'channel' : 'channels'} found.`,
  },
  es: {
    heading: 'Buscador de canales de TV', placeholder: 'Busca por nombre o número de canal',
    skip: 'Ir al buscador de canales', empty: 'No se encontraron canales.', list: 'Canales',
    clear: 'Borrar búsqueda', light: 'Modo claro', channel: 'Canal',
    roku: 'Pide en recepción que te lleven un Roku a tu habitación para ver Netflix o YouTube.',
    results: count => count === 1 ? 'Se encontró 1 canal.' : `Se encontraron ${count} canales.`,
  },
};
const find = selector => document.querySelector(selector);
const root = document.documentElement;
const input = find('#channel-search');
const list = find('#channels');
const status = find('#status');
const clear = find('#clear');
const theme = find('#theme');
const language = find('#language');
const empty = find('#no-results');
const titleMeta = find('meta[name="theme-color"]');
const read = key => { try { return localStorage.getItem(key); } catch { return null; } };
const save = (key, value) => { try { localStorage.setItem(key, value); } catch { /* optional persistence */ } };
let lang = read('bcl-tv-language') === 'es' ? 'es' : 'en';
let announceTimer;

function render(announce = true) {
  const result = searchChannels(input.value);
  const copy = messages[lang];
  const fragment = document.createDocumentFragment();
  for (const { id, name } of result) {
    const item = document.createElement('li');
    item.className = 'channel';
    const label = document.createElement('span');
    label.className = 'channel-name';
    label.textContent = name;
    if (id === '80' && input.value.trim()) {
      const note = document.createElement('span');
      note.className = 'channel-note';
      note.textContent = copy.roku;
      label.append(note);
    }
    const number = document.createElement('span');
    number.className = 'channel-number';
    number.textContent = id;
    const prefix = document.createElement('span');
    prefix.className = 'sr-only';
    prefix.textContent = copy.channel + ' ';
    number.prepend(prefix);
    item.append(label, number);
    fragment.append(item);
  }
  list.replaceChildren(fragment);
  clear.hidden = !input.value;
  empty.hidden = !!result.length;
  clearTimeout(announceTimer);
  if (announce) {
    announceTimer = setTimeout(() => {
      status.textContent = result.length ? copy.results(result.length) : copy.empty;
    }, 180);
  }
}

function updateLanguage(announce) {
  root.lang = lang;
  const copy = messages[lang];
  document.querySelectorAll('[data-copy]').forEach(el => { el.textContent = copy[el.dataset.copy]; });
  document.title = copy.heading + ' | Beaver Creek Lodge';
  input.placeholder = copy.placeholder;
  list.setAttribute('aria-label', copy.list);
  clear.setAttribute('aria-label', copy.clear);
  theme.setAttribute('aria-label', copy.light);
  language.textContent = lang === 'en' ? 'ES' : 'EN';
  language.lang = lang === 'en' ? 'es' : 'en';
  language.setAttribute('aria-label', lang === 'en' ? 'Cambiar a español' : 'Switch to English');
  render(announce);
}

function updateTheme(value, persist = false) {
  const isLight = value === 'light';
  root.dataset.theme = isLight ? 'light' : 'dark';
  theme.setAttribute('aria-pressed', String(isLight));
  titleMeta.content = isLight ? '#f6f3ed' : '#151717';
  if (persist) save('bcl-tv-theme', root.dataset.theme);
}

function clearQuery() {
  input.value = '';
  render();
  input.focus();
}

find('#search-form').addEventListener('submit', event => event.preventDefault());
input.addEventListener('input', () => render());
input.addEventListener('keydown', event => {
  if (event.key === 'Escape' && input.value) {
    event.preventDefault();
    clearQuery();
  }
});
clear.addEventListener('click', clearQuery);
theme.addEventListener('click', () => updateTheme(root.dataset.theme === 'light' ? 'dark' : 'light', true));
language.addEventListener('click', () => {
  lang = lang === 'en' ? 'es' : 'en';
  save('bcl-tv-language', lang);
  updateLanguage(true);
});
updateTheme(root.dataset.theme);
updateLanguage(false);
