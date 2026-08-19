'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  WeatherData,
  GeoLocation,
  WEATHER_STORAGE_KEYS,
  CACHE_DURATIONS,
  getWmoCondition,
  celsiusToFahrenheit,
  formatDayLabel,
  FALLBACK_WEATHER,
} from '@/lib/weather';

interface UseWeatherReturn {
  weather: WeatherData | null;
  loading: boolean;
  isRefreshing: boolean;
  error: string | null;
  useFahrenheit: boolean;
  toggleUnit: () => void;
  refresh: () => Promise<void>;
}

export function useWeather(): UseWeatherReturn {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [useFahrenheit, setUseFahrenheit] = useState<boolean>(false);
  const isFetchingRef = useRef<boolean>(false);

  // Load temperature unit preference from localStorage on mount
  useEffect(() => {
    try {
      const savedUnit = localStorage.getItem(WEATHER_STORAGE_KEYS.TEMP_UNIT);
      if (savedUnit === 'F') {
        setUseFahrenheit(true);
      }
    } catch {
      // Ignore localStorage access errors
    }
  }, []);

  const toggleUnit = useCallback(() => {
    setUseFahrenheit((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(WEATHER_STORAGE_KEYS.TEMP_UNIT, next ? 'F' : 'C');
      } catch {
        // Ignore localStorage access errors
      }
      return next;
    });
  }, []);

  /**
   * Resolves the user's geolocation via cache or ipwho.is (no GPS needed)
   */
  const resolveLocation = async (forceRefresh = false): Promise<GeoLocation> => {
    if (!forceRefresh) {
      try {
        const cachedGeoStr = localStorage.getItem(WEATHER_STORAGE_KEYS.GEO_CACHE);
        if (cachedGeoStr) {
          const cachedGeo: GeoLocation = JSON.parse(cachedGeoStr);
          const isFresh = Date.now() - cachedGeo.timestamp < CACHE_DURATIONS.GEO_TTL_MS;
          if (isFresh && cachedGeo.lat && cachedGeo.lon) {
            return cachedGeo;
          }
        }
      } catch {
        // Ignore cache parsing errors
      }
    }

    try {
      const res = await fetch('https://ipwho.is/', { cache: 'no-store' });
      if (!res.ok) throw new Error(`ipwho.is returned ${res.status}`);
      const data = await res.json();

      if (data.success === false) {
        throw new Error(data.message || 'IP lookup failed');
      }

      const geo: GeoLocation = {
        city: data.city || data.region || 'Local',
        country: data.country_code || data.country || '',
        lat: Number(data.latitude) || 51.5074,
        lon: Number(data.longitude) || -0.1278,
        timestamp: Date.now(),
      };

      try {
        localStorage.setItem(WEATHER_STORAGE_KEYS.GEO_CACHE, JSON.stringify(geo));
      } catch {
        // Ignore localStorage errors
      }

      return geo;
    } catch (err) {
      console.warn('[useWeather] Location lookup failed, using fallback:', err);
      // Fallback location
      return {
        city: 'London',
        country: 'UK',
        lat: 51.5074,
        lon: -0.1278,
        timestamp: Date.now(),
      };
    }
  };

  /**
   * Fetches weather from Open-Meteo with local client caching
   */
  const fetchWeather = useCallback(async (force = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    if (force) {
      setIsRefreshing(true);
    }

    // 1. Check local weather cache first for instant 0ms load
    if (!force) {
      try {
        const cachedWeatherStr = localStorage.getItem(WEATHER_STORAGE_KEYS.WEATHER_CACHE);
        if (cachedWeatherStr) {
          const cachedWeather: WeatherData = JSON.parse(cachedWeatherStr);
          const isFresh = Date.now() - cachedWeather.lastUpdated < CACHE_DURATIONS.WEATHER_TTL_MS;
          if (isFresh) {
            setWeather(cachedWeather);
            setLoading(false);
            isFetchingRef.current = false;
            return;
          } else {
            // Serve stale cache while refreshing in background
            setWeather(cachedWeather);
            setLoading(false);
          }
        }
      } catch {
        // Ignore cache parsing errors
      }
    }

    try {
      // 2. Resolve coordinates without GPS
      const geo = await resolveLocation(force);

      // 3. Query Open-Meteo API
      const url = new URL('https://api.open-meteo.com/v1/forecast');
      url.searchParams.set('latitude', geo.lat.toFixed(4));
      url.searchParams.set('longitude', geo.lon.toFixed(4));
      url.searchParams.set('current', 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,is_day');
      url.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min');
      url.searchParams.set('forecast_days', '4');
      url.searchParams.set('timezone', 'auto');

      const res = await fetch(url.toString());
      if (!res.ok) {
        throw new Error(`Open-Meteo returned status ${res.status}`);
      }

      const data = await res.json();
      const current = data.current;
      const daily = data.daily;

      const weatherCode = Number(current.weather_code) || 0;
      const isDay = current.is_day === 1;
      const { condition, icon } = getWmoCondition(weatherCode, isDay);

      const tempC = Math.round(Number(current.temperature_2m));
      const feelsLikeC = Math.round(Number(current.apparent_temperature));
      const humidity = Math.round(Number(current.relative_humidity_2m));

      const dailyForecasts = (daily.time || []).slice(0, 4).map((dateStr: string, index: number) => {
        const dayCode = Number(daily.weather_code?.[index]) || 0;
        const { condition: dayCond, icon: dayIcon } = getWmoCondition(dayCode, true);
        return {
          day: formatDayLabel(dateStr, index),
          date: dateStr,
          highC: Math.round(Number(daily.temperature_2m_max?.[index])),
          lowC: Math.round(Number(daily.temperature_2m_min?.[index])),
          icon: dayIcon,
          condition: dayCond,
          weatherCode: dayCode,
        };
      });

      const highC = dailyForecasts[0]?.highC ?? tempC;
      const lowC = dailyForecasts[0]?.lowC ?? tempC;

      const formattedData: WeatherData = {
        city: geo.city,
        country: geo.country,
        tempC,
        tempF: celsiusToFahrenheit(tempC),
        condition,
        icon,
        feelsLikeC,
        humidity,
        highC,
        lowC,
        weatherCode,
        daily: dailyForecasts,
        lastUpdated: Date.now(),
      };

      // Save to localStorage cache
      try {
        localStorage.setItem(WEATHER_STORAGE_KEYS.WEATHER_CACHE, JSON.stringify(formattedData));
      } catch {
        // Ignore localStorage quota errors
      }

      setWeather(formattedData);
      setError(null);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to fetch weather';
      console.warn('[useWeather] Error fetching live weather:', errMsg);
      setError(errMsg);

      // Fallback: If we have no weather at all, use default fallback
      setWeather((prev) => prev || FALLBACK_WEATHER);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchWeather(false);
  }, [fetchWeather]);

  const refresh = useCallback(() => {
    return fetchWeather(true);
  }, [fetchWeather]);

  return {
    weather,
    loading,
    isRefreshing,
    error,
    useFahrenheit,
    toggleUnit,
    refresh,
  };
}
