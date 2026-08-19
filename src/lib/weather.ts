export interface GeoLocation {
  city: string;
  country: string;
  lat: number;
  lon: number;
  timestamp: number;
}

export interface DailyForecast {
  day: string;
  date: string;
  highC: number;
  lowC: number;
  icon: string;
  condition: string;
  weatherCode: number;
}

export interface WeatherData {
  city: string;
  country: string;
  tempC: number;
  tempF: number;
  condition: string;
  icon: string;
  feelsLikeC: number;
  humidity: number;
  highC: number;
  lowC: number;
  weatherCode: number;
  daily: DailyForecast[];
  lastUpdated: number;
}

export const WEATHER_STORAGE_KEYS = {
  GEO_CACHE: 'ntd_geo_location_v1',
  WEATHER_CACHE: 'ntd_weather_cache_v1',
  TEMP_UNIT: 'ntd_temp_unit_v1',
} as const;

export const CACHE_DURATIONS = {
  GEO_TTL_MS: 24 * 60 * 60 * 1000, // 24 hours
  WEATHER_TTL_MS: 30 * 60 * 1000, // 30 minutes
} as const;

/**
 * Maps WMO weather interpretation codes to readable conditions and crisp icons.
 * Reference: Open-Meteo & World Meteorological Organization
 */
export function getWmoCondition(code: number, isDay = true): { condition: string; icon: string } {
  switch (code) {
    case 0:
      return { condition: 'Clear Sky', icon: isDay ? '☀️' : '🌙' };
    case 1:
      return { condition: 'Mainly Clear', icon: isDay ? '🌤️' : '🌤️' };
    case 2:
      return { condition: 'Partly Cloudy', icon: '⛅' };
    case 3:
      return { condition: 'Overcast', icon: '☁️' };
    case 45:
    case 48:
      return { condition: 'Foggy', icon: '🌫️' };
    case 51:
    case 53:
    case 55:
      return { condition: 'Drizzle', icon: '🌦️' };
    case 56:
    case 57:
      return { condition: 'Freezing Drizzle', icon: '🌨️' };
    case 61:
      return { condition: 'Light Rain', icon: '🌧️' };
    case 63:
      return { condition: 'Moderate Rain', icon: '🌧️' };
    case 65:
      return { condition: 'Heavy Rain', icon: '🌧️' };
    case 66:
    case 67:
      return { condition: 'Freezing Rain', icon: '🌨️' };
    case 71:
      return { condition: 'Slight Snow', icon: '❄️' };
    case 73:
      return { condition: 'Moderate Snow', icon: '❄️' };
    case 75:
      return { condition: 'Heavy Snow', icon: '❄️' };
    case 77:
      return { condition: 'Snow Grains', icon: '❄️' };
    case 80:
    case 81:
    case 82:
      return { condition: 'Rain Showers', icon: '🌦️' };
    case 85:
    case 86:
      return { condition: 'Snow Showers', icon: '🌨️' };
    case 95:
      return { condition: 'Thunderstorm', icon: '⛈️' };
    case 96:
    case 99:
      return { condition: 'Thunderstorm with Hail', icon: '⛈️' };
    default:
      return { condition: 'Fair', icon: '🌤️' };
  }
}

export function celsiusToFahrenheit(c: number): number {
  return Math.round((c * 9) / 5 + 32);
}

export function formatDayLabel(dateStr: string, index: number): string {
  if (index === 0) return 'Today';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short' });
  } catch {
    return 'Day';
  }
}

export function formatTimeAgo(timestamp: number): string {
  const elapsedMs = Date.now() - timestamp;
  const elapsedMinutes = Math.floor(elapsedMs / (60 * 1000));
  if (elapsedMinutes < 1) return 'Just now';
  if (elapsedMinutes === 1) return '1 min ago';
  if (elapsedMinutes < 60) return `${elapsedMinutes} mins ago`;
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  return `${elapsedHours}h ago`;
}

export const FALLBACK_WEATHER: WeatherData = {
  city: 'London',
  country: 'UK',
  tempC: 18,
  tempF: 64,
  condition: 'Partly Cloudy',
  icon: '⛅',
  feelsLikeC: 18,
  humidity: 65,
  highC: 21,
  lowC: 13,
  weatherCode: 2,
  daily: [
    { day: 'Today', date: '', highC: 21, lowC: 13, icon: '⛅', condition: 'Partly Cloudy', weatherCode: 2 },
    { day: 'Thu', date: '', highC: 20, lowC: 12, icon: '🌤️', condition: 'Mainly Clear', weatherCode: 1 },
    { day: 'Fri', date: '', highC: 23, lowC: 14, icon: '☀️', condition: 'Clear Sky', weatherCode: 0 },
    { day: 'Sat', date: '', highC: 19, lowC: 13, icon: '🌧️', condition: 'Light Rain', weatherCode: 61 },
  ],
  lastUpdated: Date.now(),
};
