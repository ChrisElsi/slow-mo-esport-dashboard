import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, AreaChart, Area } from 'recharts';

// Supabase Configuration
const supabaseUrl = 'https://hrgpnzzluijsvzrjenko.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhyZ3BuenpsdWlqc3Z6cmplbmtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5NDg4NTEsImV4cCI6MjA3MzUyNDg1MX0.rAM2q0xYrVR2UMbtQVyXgAMFnleQopR4QiIuBFcdPXM';

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
  const [isDark, setIsDark] = useState(true);
  const [currentTheme, setCurrentTheme] = useState('blue');
  const [showDeleteButtons, setShowDeleteButtons] = useState(false);

  // Theme setzen
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    const savedColor = localStorage.getItem('colorTheme') || 'blue';
    setIsDark(savedTheme === 'dark');
    setCurrentTheme(savedColor);
    document.documentElement.setAttribute('data-theme', savedTheme);
    document.documentElement.setAttribute('data-color', savedColor);
  }, []);

  useEffect(() => {
    const theme = isDark ? 'dark' : 'light';
    localStorage.setItem('theme', theme);
    localStorage.setItem('colorTheme', currentTheme);
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-color', currentTheme);
  }, [isDark, currentTheme]);

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

  const driverStats = drivers.map(driver => {
    const driverPits = pitStops.filter(stop => stop.driver_id === driver.driver_id);
    const avgTime = driverPits.length > 0 
      ? driverPits.reduce((sum, stop) => sum + (stop.pit_time || 0), 0) / driverPits.length
      : 0;
    
    return {
      name: driver.driver_name || 'Unbekannt',
      avgPitTime: parseFloat(avgTime.toFixed(2)),
      totalStops: driverPits.length
    };
  }).filter(stat => stat.totalStops > 0);

  const formatTime = (seconds) => {
    if (!seconds || seconds === 0) return '0:00.0';
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(1);
    return `${mins}:${secs.padStart(4, '0')}`;
  };

  if (error) {
    return (
      <div className="wrap">
        <div className="card">
          <div className="card-head">
            <div className="title">Dashboard Fehler</div>
          </div>
          <div className="content">
            <div className="status err">{error}</div>
            <button onClick={fetchData} className="btn brand">Erneut versuchen</button>
          </div>
        </div>
      </div>
    );
  }

  if (loading && pitStops.length === 0) {
    return (
      <div className="wrap">
        <div className="card">
          <div className="content" style={{ textAlign: 'center', padding: '40px' }}>
            <div className="status">Dashboard wird geladen...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Theme Toggle */}
      <button 
        className="theme-toggle" 
        onClick={() => setIsDark(!isDark)}
        title="Theme wechseln"
      >
        <span>{isDark ? '☀️' : '🌙'}</span>
      </button>

      {/* Color Theme Selector */}
      <div className="color-themes">
        {['orange', 'green', 'yellow', 'blue'].map(color => (
          <button
            key={color}
            className={`color-btn ${color} ${currentTheme === color ? 'active' : ''}`}
            onClick={() => setCurrentTheme(color)}
            title={`${color} Theme`}
          />
        ))}
      </div>

      <div className="wrap">
        {/* Header */}
        <header>
          <div className="side">
            <img src="https://i.ibb.co/YhHtxmr/SMe-Logo-Blau-Setup-Cover-1280x720.png" alt="SMe" />
          </div>
          <div className="brand">
            <img src="https://i.ibb.co/F3Mx9z5/SMe-Sport-blau-weiss.png" alt="Slow Mo eSport" />
          </div>
          <div className="side right">
            <button 
              onClick={() => setShowDeleteButtons(!showDeleteButtons)}
              className={`btn ${showDeleteButtons ? 'danger' : ''}`}
            >
              🗑️ {showDeleteButtons ? 'Delete AN' : 'Delete AUS'}
            </button>
          </div>
        </header>

        <div className="grid">
          {/* Stats Cards */}
          <section className="card">
            <div className="card-head">
              <div className="title">Live Statistiken</div>
              <div>
                <button onClick={fetchData} className="btn brand" disabled={loading}>
                  {loading ? 'Lädt...' : '🔄 Aktualisieren'}
                </button>
                <span className="status ok">
                  Update: {lastUpdate.toLocaleTimeString('de-DE')}
                </span>
              </div>
            </div>
            <div className="content">
              <div className="row4">
                <div className="stat-box">
                  <div className="stat-value">{stats.totalPitStops}</div>
                  <div className="stat-label">Gesamt Pit Stops</div>
                </div>
                <div className="stat-box">
                  <div className="stat-value">{formatTime(stats.avgPitTime)}</div>
                  <div className="stat-label">⌀ Pit Zeit</div>
                </div>
                <div className="stat-box">
                  <div className="stat-value">{formatTime(stats.fastestPit)}</div>
                  <div className="stat-label">Schnellster Pit</div>
                </div>
                <div className="stat-box">
                  <div className="stat-value">{stats.totalDrivers}</div>
                  <div className="stat-label">Aktive Fahrer</div>
                </div>
              </div>
            </div>
          </section>

          {/* Charts */}
          {pitTimeChart.length > 0 && (
            <div className="row">
              <section className="card">
                <div className="card-head">
                  <div className="title">📈 Pit Time Entwicklung</div>
                </div>
                <div className="content">
                  <div style={{ height: '300px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={pitTimeChart}>
                        <defs>
                          <linearGradient id="pitTimeGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.1}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="stop" stroke="var(--muted)" />
                        <YAxis stroke="var(--muted)" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'var(--panel)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius)',
                            color: 'var(--text)'
                          }}
                          formatter={(value) => [formatTime(value), 'Pit Zeit']}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="pitTime" 
                          stroke="var(--accent)"
                          fill="url(#pitTimeGradient)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </section>

              {driverStats.length > 0 && (
                <section className="card">
                  <div className="card-head">
                    <div className="title">👥 Fahrer Performance</div>
                  </div>
                  <div className="content">
                    <div style={{ height: '300px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={driverStats}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis dataKey="name" stroke="var(--muted)" angle={-45} textAnchor="end" height={80} />
                          <YAxis stroke="var(--muted)" />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'var(--panel)',
                              border: '1px solid var(--border)',
                              borderRadius: 'var(--radius)',
                              color: 'var(--text)'
                            }}
                            formatter={(value) => [formatTime(value), '⌀ Pit Zeit']}
                          />
                          <Bar 
                            dataKey="avgPitTime" 
                            fill="var(--accent)"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </section>
              )}
            </div>
          )}

          {/* Pit Stops Table */}
          <section className="card">
            <div className="card-head">
              <div className="title">🏁 Letzte Pit Stops</div>
              <div>
                <span className="pill green">Live: {stats.recentActivity}</span>
              </div>
            </div>
            <div className="content">
              {pitStops.length > 0 ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Zeit</th>
                        <th>Fahrer</th>
                        <th>Team</th>
                        <th>Strecke</th>
                        <th>Pit Zeit</th>
                        <th>Sprit</th>
                        <th>Reifen</th>
                        {showDeleteButtons && <th>Löschen</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {pitStops.slice(0, 20).map((stop) => (
                        <tr key={stop.pit_stop_id}>
                          <td className="muted">
                            {new Date(stop.timestamp).toLocaleString('de-DE')}
                          </td>
                          <td style={{ fontWeight: 600 }}>
                            {stop.drivers?.driver_name || 'Unbekannt'}
                          </td>
                          <td>
                            <span className="pill gray">
                              {stop.drivers?.teams?.team_name || 'Unbekannt'}
                            </span>
                          </td>
                          <td>{stop.track_name || 'Unbekannt'}</td>
                          <td>
                            <span className={`pill ${
                              (stop.pit_time || 0) < 25 ? 'green' :
                              (stop.pit_time || 0) < 30 ? 'yellow' :
                              (stop.pit_time || 0) < 35 ? 'orange' : 'red'
                            }`}>
                              {formatTime(stop.pit_time)}
                            </span>
                          </td>
                          <td>
                            {(stop.fuel_added || 0).toFixed(1)} L
                          </td>
                          <td>
                            <span className={`pill ${stop.tire_change ? 'red' : 'gray'}`}>
                              {stop.tire_change ? 'Gewechselt' : '—'}
                            </span>
                          </td>
                          {showDeleteButtons && (
                            <td>
                              <button
                                onClick={() => deletePitStop(stop.pit_stop_id)}
                                className="btn min danger"
                              >
                                🗑️
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏁</div>
                  <h3>Bereit für Action!</h3>
                  <p className="muted">Dashboard ist bereit. Starten Sie iRacing für Live-Daten.</p>
                  <button onClick={fetchData} className="btn brand">
                    Erneut prüfen
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="footer">
          <span className="pill green">Verbunden</span>
          <span className="muted">Auto-Refresh: 30s</span>
          <span className="muted">
            Letztes Update: {lastUpdate.toLocaleTimeString('de-DE')}
          </span>
        </div>
      </div>
    </>
  );
}