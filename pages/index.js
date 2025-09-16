import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, AreaChart, Area } from 'recharts';
import { Trophy, Clock, Fuel, Timer, Users, TrendingUp, RefreshCw, Zap, Target, Award, Trash2, Sun, Moon, Palette } from 'lucide-react';

// Supabase Configuration - Ihre echten Daten
const supabaseUrl = 'https://hrgpnzzluijsvzrjenko.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhyZ3BuenpsdWlqc3Z6cmplbmtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5NDg4NTEsImV4cCI6MjA3MzUyNDg1MX0.rAM2q0xYrVR2UMbtQVyXgAMFnleQopR4QiIuBFcdPXM';

let supabase;
try {
  supabase = createClient(supabaseUrl, supabaseKey);
} catch (error) {
  console.error('Supabase initialization error:', error);
  supabase = null;
}

// Theme-Konfigurationen
const themes = {
  orange: {
    name: 'Orange',
    primary: '#f97316',
    secondary: '#fb923c',
    gradient: 'from-orange-500 to-red-500',
    cardGradient: 'from-orange-500/20 to-red-500/20',
    borderColor: 'border-orange-500/30'
  },
  green: {
    name: 'Grün',
    primary: '#22c55e',
    secondary: '#4ade80',
    gradient: 'from-green-500 to-emerald-500',
    cardGradient: 'from-green-500/20 to-emerald-500/20',
    borderColor: 'border-green-500/30'
  },
  yellow: {
    name: 'Gelb',
    primary: '#eab308',
    secondary: '#facc15',
    gradient: 'from-yellow-500 to-amber-500',
    cardGradient: 'from-yellow-500/20 to-amber-500/20',
    borderColor: 'border-yellow-500/30'
  },
  blue: {
    name: 'Blau',
    primary: '#3b82f6',
    secondary: '#60a5fa',
    gradient: 'from-blue-500 to-cyan-500',
    cardGradient: 'from-blue-500/20 to-cyan-500/20',
    borderColor: 'border-blue-500/30'
  }
};

export default function Dashboard() {
  const [pitStops, setPitStops] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [error, setError] = useState(null);
  const [isDark, setIsDark] = useState(true);
  const [currentTheme, setCurrentTheme] = useState('blue');
  const [showDeleteButtons, setShowDeleteButtons] = useState(false);

  const theme = themes[currentTheme];

  // Daten laden
  const fetchData = async () => {
    if (!supabase) {
      setError('Supabase nicht konfiguriert');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const { data: pitData, error: pitError } = await supabase
        .from('pit_stops')
        .select(`
          *,
          drivers!inner(
            driver_name, 
            team_id,
            teams!inner(team_name)
          )
        `)
        .order('timestamp', { ascending: false })
        .limit(100);

      const { data: driverData, error: driverError } = await supabase
        .from('drivers')
        .select(`*, teams(team_name)`)
        .order('driver_name');

      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .order('team_name');

      if (pitError) {
        setError(`Pit Stops Fehler: ${pitError.message}`);
        return;
      }

      setPitStops(pitData || []);
      setDrivers(driverData || []);
      setTeams(teamData || []);
      setLastUpdate(new Date());
      
    } catch (error) {
      setError(`Verbindungsfehler: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Pit Stop löschen
  const deletePitStop = async (pitStopId) => {
    if (!confirm('Pit Stop wirklich löschen?')) return;

    try {
      const { error } = await supabase
        .from('pit_stops')
        .delete()
        .eq('pit_stop_id', pitStopId);

      if (error) {
        alert('Fehler beim Löschen: ' + error.message);
      } else {
        await fetchData();
      }
    } catch (error) {
      alert('Fehler beim Löschen: ' + error.message);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Statistiken
  const stats = {
    totalPitStops: pitStops.length,
    avgPitTime: pitStops.length > 0 
      ? (pitStops.reduce((sum, stop) => sum + (stop.pit_time || 0), 0) / pitStops.length).toFixed(2)
      : 0,
    fastestPit: pitStops.length > 0 
      ? Math.min(...pitStops.map(stop => stop.pit_time || 999)).toFixed(2)
      : 0,
    totalDrivers: drivers.length,
    recentActivity: pitStops.filter(stop => 
      new Date() - new Date(stop.timestamp) < 3600000
    ).length
  };

  // Chart-Daten
  const pitTimeChart = pitStops
    .slice(0, 20)
    .reverse()
    .map((stop, index) => ({
      stop: index + 1,
      pitTime: parseFloat(stop.pit_time || 0),
      driver: stop.drivers?.driver_name || 'Unbekannt'
    }));

  const formatTime = (seconds) => {
    if (!seconds || seconds === 0) return '0:00.0';
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(1);
    return `${mins}:${secs.padStart(4, '0')}`;
  };

  if (error) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDark ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900' 
                : 'bg-gradient-to-br from-gray-100 via-blue-100 to-purple-100'
      }`}>
        <div className="text-center max-w-2xl mx-auto p-6">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
            Dashboard Fehler
          </h1>
          <div className={`backdrop-blur-sm border rounded-xl p-4 mb-4 ${
            isDark ? 'bg-red-500/10 border-red-500/30 text-red-300' 
                  : 'bg-red-100 border-red-300 text-red-700'
          }`}>
            <p className="text-sm">{error}</p>
          </div>
          <button 
            onClick={fetchData}
            className={`px-6 py-3 rounded-xl text-white transition-all bg-gradient-to-r ${theme.gradient}`}
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  if (loading && pitStops.length === 0) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDark ? 'bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900'
               : 'bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50'
      }`}>
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: theme.primary }} />
          <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
            Dashboard wird geladen...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen text-white ${
      isDark ? 'bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900'
             : 'bg-gradient-to-br from-gray-50 via-slate-100 to-gray-50'
    }`}>
      {/* Header */}
      <header className={`relative z-10 backdrop-blur-lg border-b p-6 ${
        isDark ? 'bg-black/20 border-white/10' : 'bg-white/20 border-black/10'
      }`}>
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className={`text-4xl font-bold bg-gradient-to-r ${theme.gradient} bg-clip-text text-transparent`}>
              Slow Mo eSport
            </h1>
            <p className={`mt-1 flex items-center gap-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              <Zap className="w-4 h-4" style={{ color: theme.secondary }} />
              iRacing Pit Stop Analytics
            </p>
          </div>
          
          {/* Controls */}
          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <button
              onClick={() => setIsDark(!isDark)}
              className={`p-3 rounded-xl backdrop-blur-sm border transition-all ${
                isDark ? 'bg-white/10 border-white/20 hover:bg-white/20' 
                      : 'bg-black/10 border-black/20 hover:bg-black/20'
              }`}
            >
              {isDark ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-blue-600" />}
            </button>

            {/* Color Themes */}
            <div className="flex gap-2">
              {Object.entries(themes).map(([key, themeOption]) => (
                <button
                  key={key}
                  onClick={() => setCurrentTheme(key)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    currentTheme === key ? 'border-white scale-110' : 'border-gray-400 opacity-70'
                  }`}
                  style={{ backgroundColor: themeOption.primary }}
                />
              ))}
            </div>

            {/* Delete Toggle */}
            <button
              onClick={() => setShowDeleteButtons(!showDeleteButtons)}
              className={`p-3 rounded-xl backdrop-blur-sm border transition-all ${
                showDeleteButtons 
                  ? 'bg-red-500/20 border-red-500/30' 
                  : isDark ? 'bg-white/10 border-white/20'
                          : 'bg-black/10 border-black/20'
              }`}
            >
              <Trash2 className={`w-5 h-5 ${showDeleteButtons ? 'text-red-400' : isDark ? 'text-white' : 'text-gray-600'}`} />
            </button>

            {/* Refresh */}
            <button 
              onClick={fetchData}
              className={`px-6 py-3 rounded-xl flex items-center gap-2 transition-all text-white bg-gradient-to-r ${theme.gradient}`}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Aktualisieren
            </button>
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-7xl mx-auto p-6 space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <div className={`backdrop-blur-sm rounded-2xl p-6 border transition-all bg-gradient-to-br ${theme.cardGradient} ${theme.borderColor}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Gesamt Pit Stops</p>
                <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>{stats.totalPitStops}</p>
              </div>
              <Trophy className="w-8 h-8" style={{ color: theme.primary }} />
            </div>
          </div>

          <div className={`backdrop-blur-sm rounded-2xl p-6 border transition-all bg-gradient-to-br ${theme.cardGradient} ${theme.borderColor}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>⌀ Pit Zeit</p>
                <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>{formatTime(stats.avgPitTime)}</p>
              </div>
              <Clock className="w-8 h-8" style={{ color: theme.primary }} />
            </div>
          </div>

          <div className={`backdrop-blur-sm rounded-2xl p-6 border transition-all bg-gradient-to-br ${theme.cardGradient} ${theme.borderColor}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Schnellster Pit</p>
                <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>{formatTime(stats.fastestPit)}</p>
              </div>
              <Timer className="w-8 h-8" style={{ color: theme.primary }} />
            </div>
          </div>

          <div className={`backdrop-blur-sm rounded-2xl p-6 border transition-all bg-gradient-to-br ${theme.cardGradient} ${theme.borderColor}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Aktive Fahrer</p>
                <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>{stats.totalDrivers}</p>
              </div>
              <Users className="w-8 h-8" style={{ color: theme.primary }} />
            </div>
          </div>

          <div className={`backdrop-blur-sm rounded-2xl p-6 border transition-all bg-gradient-to-br ${theme.cardGradient} ${theme.borderColor}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Live Activity</p>
                <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>{stats.recentActivity}</p>
              </div>
              <Zap className="w-8 h-8" style={{ color: theme.primary }} />
            </div>
          </div>
        </div>

        {/* Charts */}
        {pitTimeChart.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className={`backdrop-blur-lg rounded-2xl p-6 border ${
              isDark ? 'bg-black/20 border-white/10' : 'bg-white/20 border-black/10'
            }`}>
              <h3 className={`text-xl font-semibold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                <TrendingUp className="w-5 h-5" style={{ color: theme.primary }} />
                Pit Time Entwicklung
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={pitTimeChart}>
                  <defs>
                    <linearGradient id="pitTimeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={theme.primary} stopOpacity={0.8}/>
                      <stop offset="95%" stopColor={theme.secondary} stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="stop" stroke={isDark ? "#9CA3AF" : "#6B7280"} />
                  <YAxis stroke={isDark ? "#9CA3AF" : "#6B7280"} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.9)',
                      border: `1px solid ${theme.primary}`,
                      borderRadius: '12px',
                      color: isDark ? 'white' : 'black'
                    }}
                    formatter={(value) => [formatTime(value), 'Pit Zeit']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="pitTime" 
                    stroke={theme.primary}
                    fill="url(#pitTimeGradient)"
                    strokeWidth={3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Pit Stops Table */}
        {pitStops.length > 0 ? (
          <div className={`backdrop-blur-lg rounded-2xl border overflow-hidden ${
            isDark ? 'bg-black/20 border-white/10' : 'bg-white/20 border-black/10'
          }`}>
            <div className={`p-6 border-b ${isDark ? 'border-white/10' : 'border-black/10'}`}>
              <h3 className={`text-xl font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                <Clock className="w-5 h-5" style={{ color: theme.primary }} />
                Letzte Pit Stops
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={isDark ? 'bg-black/30' : 'bg-white/30'}>
                  <tr>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Zeit</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Fahrer</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Strecke</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Pit Zeit</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Sprit</th>
                    {showDeleteButtons && (
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Löschen</th>
                    )}
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-white/10' : 'divide-black/10'}`}>
                  {pitStops.slice(0, 20).map((stop) => (
                    <tr key={stop.pit_stop_id} className={`transition-colors ${
                      isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'
                    }`}>
                      <td className={`px-6 py-4 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        {new Date(stop.timestamp).toLocaleString('de-DE')}
                      </td>
                      <td className={`px-6 py-4 text-sm font-medium ${isDark ? 'text-white' : 'text-gray-800'}`}>
                        {stop.drivers?.driver_name || 'Unbekannt'}
                      </td>
                      <td className={`px-6 py-4 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        {stop.track_name || 'Unbekannt'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`font-bold text-lg ${
                          (stop.pit_time || 0) < 25 ? 'text-green-400' :
                          (stop.pit_time || 0) < 30 ? 'text-yellow-400' :
                          (stop.pit_time || 0) < 35 ? 'text-orange-400' : 'text-red-400'
                        }`}>
                          {formatTime(stop.pit_time)}
                        </span>
                      </td>
                      <td className={`px-6 py-4 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        <div className="flex items-center gap-1">
                          <Fuel className="w-4 h-4 text-orange-400" />
                          {(stop.fuel_added || 0).toFixed(1)} L
                        </div>
                      </td>
                      {showDeleteButtons && (
                        <td className="px-6 py-4">
                          <button
                            onClick={() => deletePitStop(stop.pit_stop_id)}
                            className="p-2 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className={`backdrop-blur-lg rounded-2xl p-12 text-center border ${
            isDark ? 'bg-black/20 border-white/10' : 'bg-white/20 border-black/10'
          }`}>
            <div className="text-6xl mb-6">🏁</div>
            <h3 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>
              Bereit für Action!
            </h3>
            <p className={`mb-6 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Dashboard ist bereit. Starten Sie iRacing für Live-Daten.
            </p>
            <button 
              onClick={fetchData}
              className={`px-6 py-3 rounded-xl text-white bg-gradient-to-r ${theme.gradient}`}
            >
              Erneut prüfen
            </button>
          </div>
        )}
      </div>
    </div>
  );
}