'use client';

import React, { useState } from 'react';
import { useWeather } from '@/hooks/useWeather';
import { celsiusToFahrenheit, formatTimeAgo, WeatherData } from '@/lib/weather';

interface ClockWeatherProps {
  initialWeather?: WeatherData;
}

export function ClockWeather({ initialWeather }: ClockWeatherProps) {
  const {
    weather: liveWeather,
    loading,
    isRefreshing,
    useFahrenheit,
    toggleUnit,
    refresh,
  } = useWeather();

  const [showForecast, setShowForecast] = useState(false);

  const weather = liveWeather || initialWeather;

  if (loading && !weather) {
    return (
      <div className="weather-clock-wrap">
        <div className="weather-clock-skeleton mono">
          <span className="skeleton-dot">●</span> Fetching local weather…
        </div>
      </div>
    );
  }

  if (!weather) return null;

  const displayTemp = useFahrenheit ? `${weather.tempF}°F` : `${weather.tempC}°C`;
  const highTemp = useFahrenheit
    ? `${celsiusToFahrenheit(weather.highC)}°`
    : `${weather.highC}°`;
  const lowTemp = useFahrenheit
    ? `${celsiusToFahrenheit(weather.lowC)}°`
    : `${weather.lowC}°`;
  const feelsLike = useFahrenheit
    ? `${celsiusToFahrenheit(weather.feelsLikeC)}°F`
    : `${weather.feelsLikeC}°C`;

  return (
    <div className="weather-clock-wrap">
      <div
        className="weather-clock-inline mono"
        onClick={() => setShowForecast((prev) => !prev)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setShowForecast((prev) => !prev);
          }
        }}
        title="Click to toggle 4-day forecast"
        aria-expanded={showForecast}
        aria-label={`Weather in ${weather.city}: ${weather.condition}, ${displayTemp}`}
      >
        <span className="weather-clock-icon">{weather.icon}</span>
        <span
          className="weather-clock-temp"
          onClick={(e) => {
            e.stopPropagation();
            toggleUnit();
          }}
          title="Click to toggle °C / °F"
        >
          {displayTemp}
        </span>
        <span className="weather-clock-dot">·</span>
        <span className="weather-clock-cond">{weather.condition}</span>
        <span className="weather-clock-dot">·</span>
        <span className="weather-clock-city">{weather.city}</span>
        <span className="weather-clock-range">
          (H:{highTemp} L:{lowTemp})
        </span>
      </div>

      {showForecast && (
        <div className="weather-clock-drawer mono" role="region" aria-label="4-Day Weather Forecast">
          <div className="weather-drawer-grid">
            {weather.daily.map((day, idx) => (
              <div key={idx} className="weather-drawer-day">
                <span className="drawer-day-label">{day.day}</span>
                <span className="drawer-day-icon">{day.icon}</span>
                <span className="drawer-day-temps">
                  {useFahrenheit
                    ? `${celsiusToFahrenheit(day.highC)}° / ${celsiusToFahrenheit(day.lowC)}°`
                    : `${day.highC}° / ${day.lowC}°`}
                </span>
              </div>
            ))}
          </div>

          <div className="weather-drawer-footer">
            <span className="drawer-sub-stat">
              Feels like {feelsLike} · Humidity {weather.humidity}%
            </span>
            <div className="drawer-refresh-group">
              <span className="drawer-updated-label">
                {formatTimeAgo(weather.lastUpdated)}
              </span>
              <button
                type="button"
                className={`weather-refresh-btn ${isRefreshing ? 'refreshing' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  refresh();
                }}
                title="Refresh weather"
                disabled={isRefreshing}
                aria-label="Refresh weather data"
              >
                ↻
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
