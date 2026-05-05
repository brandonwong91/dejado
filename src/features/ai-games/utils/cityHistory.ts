import type { City, SavedResult } from '../types';

const HISTORY_KEY = 'fq_played_history';
const CACHE_KEY_PREFIX = 'fq_cities_';
const RESULTS_KEY = 'fq_results';
const MAX_HISTORY = 60;
const MAX_RESULTS = 10;

export function getPlayedCities(): string[] {
  if (typeof window === 'undefined') return [];
  return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
}

export function addPlayedCity(cityName: string): void {
  const history = getPlayedCities();
  history.push(cityName);
  if (history.length > MAX_HISTORY) history.shift();
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function getCachedCities(dateKey: string): City[] | null {
  if (typeof window === 'undefined') return null;
  const cached = localStorage.getItem(CACHE_KEY_PREFIX + dateKey);
  return cached ? JSON.parse(cached) : null;
}

export function cacheCities(dateKey: string, cities: City[]): void {
  localStorage.setItem(CACHE_KEY_PREFIX + dateKey, JSON.stringify(cities));
}

export function getSavedResults(): SavedResult[] {
  if (typeof window === 'undefined') return [];
  return JSON.parse(localStorage.getItem(RESULTS_KEY) || '[]');
}

export function saveResult(result: SavedResult): void {
  const results = getSavedResults();
  // Most recent first; drop duplicates by date+city
  const filtered = results.filter(
    (r) => !(r.date === result.date && r.session.city === result.session.city)
  );
  filtered.unshift(result);
  if (filtered.length > MAX_RESULTS) filtered.length = MAX_RESULTS;
  localStorage.setItem(RESULTS_KEY, JSON.stringify(filtered));
}
