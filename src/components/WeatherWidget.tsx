import React, { useState, useEffect } from 'react';
import { Cloud, Droplets, Wind, Thermometer, AlertTriangle, RefreshCw, Sun, CloudRain } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface WeatherData {
  temp: number;
  humidity: number;
  wind: string;
  condition: string;
  alerts: string[];
}

export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData>({
    temp: 0,
    humidity: 0,
    wind: '0mph',
    condition: 'Detecting...',
    alerts: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = async (lat: number, lon: number) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&temperature_unit=fahrenheit&wind_speed_unit=mph`
      );
      const data = await response.json();
      const current = data.current;

      // Simple mapping of WMO weather codes to descriptions
      const getCondition = (code: number) => {
        if (code === 0) return 'Clear Sky';
        if (code <= 3) return 'Partly Cloudy';
        if (code <= 48) return 'Foggy';
        if (code <= 67) return 'Rainy';
        if (code <= 77) return 'Snowy';
        if (code <= 82) return 'Showers';
        return 'Stormy';
      };

      setWeather({
        temp: Math.round(current.temperature_2m),
        humidity: current.relative_humidity_2m,
        wind: `${Math.round(current.wind_speed_10m)}mph`,
        condition: getCondition(current.weather_code),
        alerts: [] // Open-Meteo doesn't provide alerts in the free current_weather endpoint usually
      });
    } catch (err) {
      console.error("Failed to fetch weather:", err);
      setError("Failed to fetch atmospheric data");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
      (err) => {
        console.error(err);
        setError("Location access denied");
        setLoading(false);
      }
    );
  };

  useEffect(() => {
    handleRefresh();
  }, []);

  return (
    <section className="bg-white dark:bg-neutral-900 rounded-3xl p-6 shadow-sm border border-neutral-100 dark:border-neutral-800 h-full transition-colors">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Cloud className="h-5 w-5 text-blue-500" />
          <h2 className="text-lg font-bold dark:text-white">Atmospheric Data</h2>
        </div>
        <button 
          onClick={handleRefresh} 
          disabled={loading}
          className="p-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-xl transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 text-neutral-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error ? (
        <div className="text-center py-8">
          <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
          <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">{error}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-800 flex flex-col items-center justify-center text-center">
            <Thermometer className="h-6 w-6 text-orange-500 mb-2" />
            <span className="text-2xl font-bold text-neutral-900 dark:text-white">{loading ? '--' : weather.temp}°F</span>
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Temperature</span>
          </div>
          
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-800 flex flex-col items-center justify-center text-center">
            <Droplets className="h-6 w-6 text-blue-500 mb-2" />
            <span className="text-2xl font-bold text-neutral-900 dark:text-white">{loading ? '--' : weather.humidity}%</span>
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Humidity</span>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-800 flex flex-col items-center justify-center text-center">
            <Wind className="h-6 w-6 text-neutral-500 mb-2" />
            <span className="text-sm font-bold text-neutral-900 dark:text-white">{loading ? '--' : weather.wind}</span>
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Wind Speed</span>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-800 flex flex-col items-center justify-center text-center">
            {weather.condition.includes('Cloudy') ? <Cloud className="h-6 w-6 text-neutral-400 mb-2" /> : <Sun className="h-6 w-6 text-amber-500 mb-2" />}
            <span className="text-sm font-bold text-neutral-900 dark:text-white">{loading ? '...' : weather.condition}</span>
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Conditions</span>
          </div>
        </div>
      )}

      {!loading && weather.alerts.length > 0 && (
        <div className="mt-4 p-3 rounded-2xl bg-amber-50 border border-amber-100 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
          <div>
            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1">Alerts</p>
            {weather.alerts.map((alert, i) => (
              <p key={i} className="text-xs font-medium text-amber-900">{alert}</p>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
