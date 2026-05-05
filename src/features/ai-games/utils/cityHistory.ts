import type { City } from '../types';

const HISTORY_KEY = 'fq_played_history';
const CACHE_KEY_PREFIX = 'fq_cities_';
const MAX_HISTORY = 60;

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
