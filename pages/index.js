import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Trophy, Clock, Fuel, Timer, Users, TrendingUp, RefreshCw } from 'lucide-react';

// Supabase Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabase;
try {
  supabase = createClient(supabaseUrl, supabaseKey);
} catch (error) {
  console.error('Supabase initialization error:', error);
  supabase = null;
}

export default function Dashboard() {
  const [pitStops, setPitStops] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [error, setError] = useState(null);

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
      
      console.log('Lade Daten aus Supabase...');
      
      // Pit Stops laden mit verbessertem JOIN
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
        .limit(50);

      console.log('Pit Stops geladen:', { pitData, pitError });

      // Fahrer laden
      const { data: driverData, error: driverError } = await supabase
        .from('drivers')
        .select(`
          *,
          teams(team_name)
        `)
        .order('driver_name');

      console.log('Fahrer geladen:', { driverData, driverError });

      // Teams laden
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .order('team_name');

      console.log('Teams geladen:', { teamData, teamError });

      // Detaillierte Fehlerbehandlung
      if (pitError) {
        console.error('Pit Stops Fehler:', pitError);
        setError(`Pit Stops Fehler: ${pitError.message}`);
        return;
      }
      
      if (driverError) {
        console.error('Fahrer Fehler:', driverError);
        setError(`Fahrer Fehler: ${driverError.message}`);
        return;
      }
      
      if (teamError) {
        console.error('Teams Fehler:', teamError);
        setError(`Teams Fehler: ${teamError.message}`);
        return;
      }

      setPitStops(pitData || []);
      setDrivers(driverData || []);
      setTeams(teamData || []);
      setLastUpdate(new Date());
      
      console.log('Alle Daten erfolgreich geladen!', {
        pitStops: pitData?.length || 0,
        drivers: driverData?.length || 0,
        teams: teamData?.length || 0
      });
      
    } catch (error) {
      console.error('Fehler beim Laden der Daten:', error);
      setError(`Verbindungsfehler: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Initial load und Auto-Refresh
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Alle 30 Sekunden
    return () => clearInterval(interval);
  }, []);

  // Statistiken berechnen
  const stats = {
    totalPitStops: pitStops.length,
    avgPitTime: pitStops.length > 0 
      ? (pitStops.reduce((sum, stop) => sum + (stop.pit_time || 0), 0) / pitStops.length).toFixed(2)
      : 0,
    fastestPit: pitStops.length > 0 
      ? Math.min(...pitStops.map(stop => stop.pit_time || 999)).toFixed(2)
      : 0,
    totalDrivers: drivers.length
  };

  // Chart-Daten für Pit-Time Entwicklung
  const pitTimeChart = pitStops
    .slice(0, 20)
    .reverse()
    .map((stop, index) => ({
      stop: index + 1,
      pitTime: parseFloat(stop.pit_time || 0),
      driver: stop.drivers?.driver_name || 'Unbekannt',
      track: stop.track_name || 'Unbekannt'
    }));

  // Driver Performance Chart
  const driverStats = drivers.map(driver => {
    const driverPits = pitStops.filter(stop => stop.driver_id === driver.driver_id);
    const avgTime = driverPits.length > 0 
      ? driverPits.reduce((sum, stop) => sum + (stop.pit_time || 0), 0) / driverPits.length
      : 0;
    
    return {
      name: driver.driver_name || 'Unbekannt',
      avgPitTime: parseFloat(avgTime.toFixed(2)),
      totalStops: driverPits.length,
      fastestPit: driverPits.length > 0 ? Math.min(...driverPits.map(stop => stop.pit_time || 999)) : 0
    };
  }).filter(stat => stat.totalStops > 0);

  const formatTime = (seconds) => {
    if (!seconds || seconds === 0) return '0:00.0';
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(1);
    return `${mins}:${secs.padStart(4, '0')}`;
  };

  // Error State
  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-2xl mx-auto p-6">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-white text-2xl font-bold mb-2">Dashboard Fehler</h1>
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 mb-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
          <button 
            onClick={fetchData}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg text-white transition-colors"
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  // Loading State
  if (loading && pitStops.length === 0) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Dashboard wird geladen...</p>
          <p className="text-gray-400 text-sm mt-2">Lade Pit Stop Daten...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 p-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-blue-400">
              {process.env.NEXT_PUBLIC_TEAM_NAME || 'Slow Mo eSport'}
            </h1>
            <p className="text-gray-400 mt-1">iRacing Pit Stop Analytics</p>
          </div>
          <div className="text-right">
            <button 
              onClick={fetchData}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Aktualisieren
            </button>
            <p className="text-sm text-gray-400 mt-1">
              Letztes Update: {lastUpdate.toLocaleTimeString('de-DE')}
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Statistik Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Gesamt Pit Stops</p>
                <p className="text-2xl font-bold text-white">{stats.totalPitStops}</p>
              </div>
              <Trophy className="w-8 h-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">⌀ Pit Zeit</p>
                <p className="text-2xl font-bold text-white">{formatTime(stats.avgPitTime)}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Schnellster Pit</p>
                <p className="text-2xl font-bold text-green-400">{formatTime(stats.fastestPit)}</p>
              </div>
              <Timer className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Aktive Fahrer</p>
                <p className="text-2xl font-bold text-white">{stats.totalDrivers}</p>
              </div>
              <Users className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Charts */}
        {pitTimeChart.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Pit Time Trend */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                Pit Time Entwicklung
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={pitTimeChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="stop" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }}
                    formatter={(value) => [formatTime(value), 'Pit Zeit']}
                    labelFormatter={(label) => `Stop #${label}`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="pitTime" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Driver Performance */}
            {driverStats.length > 0 && (
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <h3 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-500" />
                  Fahrer Performance
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={driverStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" stroke="#9CA3AF" angle={-45} textAnchor="end" height={80} />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1F2937', 
                        border: '1px solid #374151',
                        borderRadius: '8px'
                      }}
                      formatter={(value, name) => {
                        if (name === 'avgPitTime') return [formatTime(value), '⌀ Pit Zeit'];
                        if (name === 'totalStops') return [value, 'Anzahl Stops'];
                        return [value, name];
                      }}
                    />
                    <Bar dataKey="avgPitTime" fill="#8B5CF6" name="avgPitTime" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* Recent Pit Stops Table */}
        {pitStops.length > 0 ? (
          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-500" />
                Letzte Pit Stops
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Zeit</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Fahrer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Team</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Strecke</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Pit Zeit</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Sprit</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Reifen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {pitStops.slice(0, 10).map((stop) => (
                    <tr key={stop.pit_stop_id} className="hover:bg-gray-700 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {new Date(stop.timestamp).toLocaleString('de-DE')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                        {stop.drivers?.driver_name || 'Unbekannt'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {stop.drivers?.teams?.team_name || 'Unbekannt'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {stop.track_name || 'Unbekannt'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`font-semibold ${
                          (stop.pit_time || 0) < 30 ? 'text-green-400' :
                          (stop.pit_time || 0) < 45 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {formatTime(stop.pit_time)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        <div className="flex items-center gap-1">
                          <Fuel className="w-4 h-4 text-orange-500" />
                          {(stop.fuel_added || 0).toFixed(1)} L
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          stop.tire_change ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-300'
                        }`}>
                          {stop.tire_change ? 'Gewechselt' : 'Nicht gewechselt'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-xl p-12 text-center border border-gray-700">
            <div className="text-6xl mb-4">🏁</div>
            <h3 className="text-xl font-semibold text-white mb-2">Noch keine Pit Stop Daten</h3>
            <p className="text-gray-400 mb-6">
              Das Dashboard ist bereit - starten Sie iRacing und der Python Logger wird automatisch Daten erfassen.
            </p>
            <button 
              onClick={fetchData}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg text-white transition-colors"
            >
              Erneut prüfen
            </button>
          </div>
        )}
      </div>
    </div>
  );
}