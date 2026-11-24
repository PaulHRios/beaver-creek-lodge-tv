import { CHANNELS } from './channels.mjs';

// Channel 80 is still the same TV input in the source lineup. The hotel now
// loans Roku devices; the original guide's Chromecast label is historical.
const GUEST_CHANNELS = Object.freeze(CHANNELS.map(channel => channel.id !== '80' ? channel : Object.freeze({
  ...channel,
  name: 'HDMI 1',
  aliases: Object.freeze(['hdmi', 'hdmi1', 'roku', 'netflix', 'youtube', 'streaming', 'stream', 'cast', 'chromecast']),
})));

/** Case, accents, punctuation and whitespace are irrelevant to a channel query. */
export function normalizeQuery(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

const compact = value => value.replace(/\s/g, '');
const indexCache = new WeakMap();

function indexFor(channels) {
  if (indexCache.has(channels)) return indexCache.get(channels);
  const index = channels.map(channel => ({
    channel,
    values: [...new Set([channel.name, channel.identifier, ...(channel.aliases ?? [])]
      .map(normalizeQuery).filter(Boolean))]
      .map(value => ({ value, compact: compact(value), words: value.split(' ') })),
  }));
  indexCache.set(channels, index);
  return index;
}

function directScore(entry, query, queryCompact, tokens) {
  let best = 0;
  for (const term of entry.values) {
    let score = 0;
    if (term.value === query) score = 1000;
    else if (term.compact === queryCompact) score = 980;
    else if (term.value.startsWith(query)) score = 850;
    else if (term.compact.startsWith(queryCompact)) score = 820;
    else if (tokens.every(token => term.words.some(word => word === token))) score = 760;
    else if (tokens.every(token => term.words.some(word => word.startsWith(token)))) score = 720;
    else if (queryCompact.length >= 3 && term.compact.includes(queryCompact)) score = 580;
    if (score) best = Math.max(best, score - Math.min(40, Math.abs(term.compact.length - queryCompact.length)));
  }
  return best;
}

/** Bounded edit distance, including a single adjacent-letter transposition. */
function editDistance(a, b, limit) {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  let beforePrevious = null;
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        current[j] = Math.min(current[j], beforePrevious[j - 2] + 1);
      }
      rowMin = Math.min(rowMin, current[j]);
    }
    if (rowMin > limit) return limit + 1;
    beforePrevious = previous;
    previous = current;
  }
  return previous[b.length];
}

/**
 * Return channel records in relevance order, with numerical order as the tie-break.
 * Empty query returns the full guide. Numeric queries match only the exact channel.
 * Typo tolerance is a fallback, so a correct acronym never attracts fuzzy noise.
 */
export function searchChannels(input, channels = GUEST_CHANNELS) {
  const query = normalizeQuery(input);
  if (!query) return [...channels].sort((a, b) => Number(a.id) - Number(b.id));

  const numeric = query.match(/^(?:(?:channel|ch|canal)\s*)?(\d+)$/);
  if (numeric) return channels.filter(channel => Number(channel.id) === Number(numeric[1]));

  const queryCompact = compact(query);
  const tokens = query.split(' ');
  const index = indexFor(channels);
  let matches = index.map(entry => ({
    channel: entry.channel,
    score: directScore(entry, query, queryCompact, tokens),
  })).filter(match => match.score > 0);

  if (!matches.length && queryCompact.length >= 3 && queryCompact.length <= 64) {
    const limit = queryCompact.length >= 8 ? 2 : 1;
    matches = index.map(entry => {
      let distance = limit + 1;
      for (const term of entry.values) {
        if (queryCompact.length === 3) {
          // For short acronyms allow a swapped pair, not arbitrary single-letter guesses.
          if (term.compact === queryCompact[1] + queryCompact[0] + queryCompact[2] ||
              term.compact === queryCompact[0] + queryCompact[2] + queryCompact[1]) distance = 1;
        } else {
          distance = Math.min(distance, editDistance(queryCompact, term.compact, limit));
        }
      }
      return { channel: entry.channel, score: distance <= limit ? 300 - distance * 30 : 0 };
    }).filter(match => match.score > 0);
  }

  return matches.sort((a, b) => b.score - a.score || Number(a.channel.id) - Number(b.channel.id))
    .map(match => match.channel);
}

export default searchChannels;
