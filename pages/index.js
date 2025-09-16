import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

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
  const [loading, setLoading] = useState(true);
  const [currentTheme, setCurrentTheme] = useState('orange');
  const [isLight, setIsLight] = useState(true); // Korrigiert: true statt false
  const [showForm, setShowForm] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [limit, setLimit] = useState(10);
  
  // Form State
  const [formData, setFormData] = useState({
    driver_name: 'Web Driver',
    track_name: 'Spa-Francorchamps',
    track_version: '2022',
    car_name: 'GT3',
    car_class: 'GT3 Class',
    pit_time: '85.1',
    fuel_added: '30.0',
    tire_change: false,
    in_lap: '10',
    out_lap: '11',
    session_type: 'Race',
    notes: ''
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isLight ? 'light' : 'dark');
    document.documentElement.setAttribute('data-color', currentTheme);
    // Debug
    console.log('Theme gesetzt:', isLight ? 'light' : 'dark', 'Color:', currentTheme);
  }, [isLight, currentTheme]);

  // Daten laden
  const fetchData = async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    try {
      const { data: pitData } = await supabase
        .from('pit_stops')
        .select(`
          *,
          drivers!inner(
            driver_name, 
            teams!inner(team_name)
          )
        `)
        .order('timestamp', { ascending: false })
        .limit(limit);

      setPitStops(pitData || []);
    } catch (error) {
      console.error('Fehler beim Laden:', error);
    } finally {
      setLoading(false);
    }
  };

  // Sample Pit Stop hinzufügen
  const addSamplePitStop = async () => {
    if (!supabase) return;

    try {
      // Fahrer finden oder erstellen
      let { data: driver } = await supabase
        .from('drivers')
        .select('driver_id')
        .eq('driver_name', formData.driver_name)
        .single();

      if (!driver) {
        const { data: team } = await supabase
          .from('teams')
          .select('team_id')
          .eq('team_name', 'Slow Mo eSport')
          .single();

        if (team) {
          const { data: newDriver } = await supabase
            .from('drivers')
            .insert({
              driver_name: formData.driver_name,
              team_id: team.team_id
            })
            .select('driver_id')
            .single();
          
          driver = newDriver;
        }
      }

      if (driver) {
        await supabase.table('pit_stops').insert({
          driver_id: driver.driver_id,
          track_name: formData.track_name,
          session_type: formData.session_type,
          pit_time: parseFloat(formData.pit_time),
          fuel_added: parseFloat(formData.fuel_added),
          tire_change: formData.tire_change,
          in_lap: parseInt(formData.in_lap),
          out_lap: parseInt(formData.out_lap)
        });
        
        await fetchData();
      }
    } catch (error) {
      console.error('Fehler beim Hinzufügen:', error);
    }
  };

  // Pit Stop löschen
  const deletePitStop = async (pitStopId) => {
    if (!confirm('Pit Stop wirklich löschen?')) return;

    try {
      await supabase.from('pit_stops').delete().eq('pit_stop_id', pitStopId);
      await fetchData();
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds) return '0.0';
    return seconds.toFixed(1);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('de-DE');
  };

  useEffect(() => {
    fetchData();
    if (autoRefresh) {
      const interval = setInterval(fetchData, 3000);
      return () => clearInterval(interval);
    }
  }, [limit, autoRefresh]);

  return (
    <div className="dashboard">
      {/* Theme Buttons */}
      <div className="theme-buttons">
        <button 
          className={`theme-btn ${isLight ? 'active' : ''}`}
          onClick={() => setIsLight(true)}
        >
          Hell
        </button>
        <button 
          className={`theme-btn ${!isLight ? 'active' : ''}`}
          onClick={() => setIsLight(false)}
        >
          Dunkel
        </button>
        {['orange', 'green', 'yellow', 'blue'].map(color => (
          <button
            key={color}
            className={`theme-btn color-${color} ${currentTheme === color ? 'active' : ''}`}
            onClick={() => setCurrentTheme(color)}
          >
            {color === 'orange' ? 'Orange' : 
             color === 'green' ? 'Grün' : 
             color === 'yellow' ? 'Gelb' : 'Blau'}
          </button>
        ))}
      </div>

      <div className="wrap">
        {/* Header */}
        <header>
          <div className="side">
            <img src="https://i.ibb.co/YhHtxmr/SMe-Logo-Blau-Setup-Cover-1280x720.png" alt="SMe Logo" />
          </div>
          <div className="brand">
            <img src="https://i.ibb.co/F3Mx9z5/SMe-Sport-blau-weiss.png" alt="Slow Mo eSport" />
          </div>
          <div className="side right">
            <img src="https://i.ibb.co/YhHtxmr/SMe-Logo-Blau-Setup-Cover-1280x720.png" alt="SMe Logo" />
          </div>
        </header>

        {/* START/STOP Section */}
        <section className="card">
          <div className="card-head">
            <div className="title">START/STOP (RPC)</div>
            <div className="controls">
              <button 
                className="btn start-btn"
                onClick={() => setShowForm(!showForm)}
              >
                {showForm ? 'Stop' : 'Start'}
              </button>
            </div>
          </div>
          
          {showForm && (
            <div className="content">
              <div className="form-section">
                <div className="section-title">Formular ein-/ausklappen</div>
                
                <div className="form-grid">
                  <div className="row">
                    <div className="field">
                      <label>Team ID</label>
                      <input 
                        type="text" 
                        value="711a7bf9-b2be-4693-a4f1-dace4f86e289" 
                        readOnly 
                      />
                    </div>
                    <div className="field">
                      <label>Session ID</label>
                      <input 
                        type="text" 
                        value="sess-web" 
                        readOnly 
                      />
                    </div>
                  </div>

                  <div className="row">
                    <div className="field">
                      <label>Driver IRID</label>
                      <input type="text" value="4711" readOnly />
                    </div>
                    <div className="field">
                      <label>Fahrer</label>
                      <input 
                        type="text" 
                        value={formData.driver_name}
                        onChange={(e) => setFormData({...formData, driver_name: e.target.value})}
                      />
                    </div>
                    <div className="field">
                      <label>Fahrzeug</label>
                      <input 
                        type="text" 
                        value={formData.car_name}
                        onChange={(e) => setFormData({...formData, car_name: e.target.value})}
                      />
                    </div>
                    <div className="field">
                      <label>Track</label>
                      <input 
                        type="text" 
                        value={formData.track_name}
                        onChange={(e) => setFormData({...formData, track_name: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="row">
                    <div className="field">
                      <label>Lap No</label>
                      <input 
                        type="text" 
                        value={formData.in_lap}
                        onChange={(e) => setFormData({...formData, in_lap: e.target.value})}
                      />
                    </div>
                    <div className="field">
                      <label>Fuel (L)</label>
                      <input 
                        type="text" 
                        value={formData.fuel_added}
                        onChange={(e) => setFormData({...formData, fuel_added: e.target.value})}
                      />
                    </div>
                    <div className="field">
                      <label>InLap (s)</label>
                      <input 
                        type="text" 
                        value={formData.pit_time}
                        onChange={(e) => setFormData({...formData, pit_time: e.target.value})}
                      />
                    </div>
                    <div className="field">
                      <label>OutLap (s)</label>
                      <input 
                        type="text" 
                        value="92.7" 
                        readOnly 
                      />
                    </div>
                  </div>

                  <div className="row">
                    <div className="field">
                      <label>Streckenversion</label>
                      <input 
                        type="text" 
                        value={formData.track_version}
                        onChange={(e) => setFormData({...formData, track_version: e.target.value})}
                      />
                    </div>
                    <div className="field">
                      <label>Fahrzeugklasse</label>
                      <input 
                        type="text" 
                        value={formData.car_class}
                        onChange={(e) => setFormData({...formData, car_class: e.target.value})}
                      />
                    </div>
                    <div className="field">
                      <label>Tires changed</label>
                      <select 
                        value={formData.tire_change ? 'true' : 'false'}
                        onChange={(e) => setFormData({...formData, tire_change: e.target.value === 'true'})}
                      >
                        <option value="false">Nein</option>
                        <option value="true">Ja</option>
                      </select>
                    </div>
                    <div className="field">
                      <label>Note</label>
                      <input 
                        type="text" 
                        value={formData.notes}
                        onChange={(e) => setFormData({...formData, notes: e.target.value})}
                        placeholder="Notizen..."
                      />
                    </div>
                  </div>
                </div>

                <div className="form-actions">
                  <button className="btn brand" onClick={addSamplePitStop}>
                    Sample senden
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Pit Stops Table */}
        <section className="card">
          <div className="card-head">
            <div className="title">LETZTE BOXENSTOPPS</div>
            <div className="controls">
              <input 
                type="number" 
                value={limit} 
                onChange={(e) => setLimit(parseInt(e.target.value) || 10)}
                min="1" 
                max="50"
                className="limit-input"
              />
              <button className="btn" onClick={fetchData}>
                Aktualisieren
              </button>
            </div>
          </div>
          
          <div className="content">
            <div className="auto-refresh">
              Auto-Refresh: 
              <span 
                className={`pill ${autoRefresh ? 'green' : 'gray'}`}
                onClick={() => setAutoRefresh(!autoRefresh)}
                style={{cursor: 'pointer'}}
              >
                {autoRefresh ? 'on' : 'off'}
              </span>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Datum</th>
                    <th>Zeit</th>
                    <th>Fahrer</th>
                    <th>iRacing ID</th>
                    <th>Fahrzeug</th>
                    <th>Track</th>
                    <th>Runde</th>
                    <th>InLap (s)</th>
                    <th>OutLap (s)</th>
                    <th>Dauer (s)</th>
                    <th>Fuel vor</th>
                    <th>Fuel nach</th>
                    <th>getankt</th>
                    <th>Reifen</th>
                    <th>Note</th>
                    <th>Aktion</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="17" style={{textAlign: 'center', padding: '20px'}}>
                        Lade Daten...
                      </td>
                    </tr>
                  ) : pitStops.length > 0 ? (
                    pitStops.map((stop, index) => (
                      <tr key={stop.pit_stop_id}>
                        <td className="muted">{index + 1}</td>
                        <td>{formatDate(stop.timestamp)}</td>
                        <td>{new Date(stop.timestamp).toLocaleTimeString('de-DE')}</td>
                        <td>{stop.drivers?.driver_name || formData.driver_name}</td>
                        <td className="muted">4711</td>
                        <td>{formData.car_name}</td>
                        <td>{stop.track_name}</td>
                        <td>{stop.in_lap}</td>
                        <td>{formatTime(stop.pit_time)}</td>
                        <td>{formatTime(stop.pit_time + 7.6)}</td>
                        <td className="muted">{formatTime(stop.pit_time)}</td>
                        <td>{formatTime(stop.fuel_before || 0)}</td>
                        <td>{formatTime(stop.fuel_after || 0)}</td>
                        <td>
                          {stop.tire_change ? 
                            <span className="pill green">Ja</span> : 
                            <span className="pill gray">Nein</span>
                          }
                        </td>
                        <td>{formatTime(stop.fuel_added)}</td>
                        <td className="muted">{stop.notes || formData.notes || '-'}</td>
                        <td>
                          <button 
                            className="btn danger min"
                            onClick={() => deletePitStop(stop.pit_stop_id)}
                          >
                            Löschen
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="17" style={{textAlign: 'center', padding: '20px'}}>
                        Keine Pit Stops gefunden
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <div className="footer">
          <span className="pill green">Verbunden</span>
          <span className="muted">Status: Online</span>
        </div>
      </div>

      {/* CSS Variablen - Global */}
      <style jsx global>{`
        :root {
          --bg: #f8fafc;
          --panel: #ffffff;
          --text: #1e293b;
          --muted: #64748b;
          --border: rgba(100,116,139,0.2);
          --accent-rgb: 249,115,22;
        }

        [data-theme="light"] {
          --bg: #f8fafc;
          --panel: #ffffff;
          --text: #1e293b;
          --muted: #64748b;
          --border: rgba(100,116,139,0.2);
        }

        [data-theme="dark"] {
          --bg: #0f172a;
          --panel: #1e293b;
          --text: #f1f5f9;
          --muted: #94a3b8;
          --border: rgba(148,163,184,0.2);
        }

        [data-color="orange"] {
          --brand: #ea580c;
          --accent: #f97316;
          --accent-rgb: 249,115,22;
        }

        [data-color="green"] {
          --brand: #16a34a;
          --accent: #22c55e;
          --accent-rgb: 34,197,94;
        }

        [data-color="yellow"] {
          --brand: #ca8a04;
          --accent: #eab308;
          --accent-rgb: 234,179,8;
        }

        [data-color="blue"] {
          --brand: #2563eb;
          --accent: #3b82f6;
          --accent-rgb: 59,130,246;
        }
      `}</style>

      <style jsx>{`
        .dashboard {
          min-height: 100vh;
          background: var(--bg);
          color: var(--text);
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          font-size: 13px;
          line-height: 1.4;
        }

        .theme-buttons {
          position: fixed;
          top: 20px;
          right: 20px;
          display: flex;
          gap: 8px;
          z-index: 1000;
          flex-wrap: wrap;
          max-width: 400px;
        }

        .theme-btn {
          padding: 6px 12px;
          border: 1px solid var(--border);
          background: var(--panel);
          color: var(--text);
          border-radius: 6px;
          cursor: pointer;
          font-size: 11px;
          transition: all 0.2s ease;
        }

        .theme-btn.active,
        .theme-btn:hover {
          background: var(--accent);
          color: white;
          border-color: var(--accent);
        }

        .wrap {
          max-width: 1400px;
          margin: 0 auto;
          padding: 80px 20px 20px 20px;
        }

        header {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 40px;
          margin-bottom: 30px;
          padding: 20px 0;
        }

        .side {
          display: flex;
          justify-content: center;
        }

        .side.right {
          justify-content: flex-end;
        }

        .side img {
          height: 120px;
          object-fit: contain;
          filter: drop-shadow(0 4px 8px rgba(0,0,0,0.2));
        }

        .brand img {
          height: 80px;
          object-fit: contain;
          filter: drop-shadow(0 4px 12px rgba(0,0,0,0.3));
        }

        .card {
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: 12px;
          margin-bottom: 20px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          overflow: hidden;
        }

        .card-head {
          background: linear-gradient(135deg, var(--accent), var(--brand));
          color: white;
          padding: 12px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--border);
        }

        .title {
          font-weight: 600;
          font-size: 14px;
          letter-spacing: 0.5px;
        }

        .controls {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .content {
          padding: 20px;
        }

        .form-section {
          background: rgba(0,0,0,0.02);
          border-radius: 8px;
          padding: 15px;
        }

        .section-title {
          color: var(--muted);
          font-size: 12px;
          margin-bottom: 15px;
          cursor: pointer;
        }

        .form-grid .row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin-bottom: 15px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .field label {
          font-size: 11px;
          color: var(--muted);
          font-weight: 500;
        }

        .field input,
        .field select {
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 8px 10px;
          color: var(--text);
          font-size: 12px;
          transition: border-color 0.2s ease;
        }

        .field input:focus,
        .field select:focus {
          outline: none;
          border-color: var(--accent);
          box-shadow: 0 0 0 2px rgba(var(--accent-rgb), 0.1);
        }

        .btn {
          background: var(--panel);
          border: 1px solid var(--border);
          color: var(--text);
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s ease;
        }

        .btn:hover {
          background: var(--accent);
          color: white;
          border-color: var(--accent);
        }

        .btn.brand {
          background: var(--accent);
          color: white;
          border-color: var(--accent);
        }

        .btn.brand:hover {
          background: var(--brand);
          border-color: var(--brand);
        }

        .btn.start-btn {
          background: var(--accent);
          color: white;
          border-color: var(--accent);
          padding: 6px 20px;
        }

        .btn.danger {
          background: #ef4444;
          color: white;
          border-color: #ef4444;
        }

        .btn.danger:hover {
          background: #dc2626;
          border-color: #dc2626;
        }

        .btn.min {
          padding: 4px 8px;
          font-size: 11px;
        }

        .form-actions {
          margin-top: 20px;
          text-align: center;
        }

        .auto-refresh {
          margin-bottom: 15px;
          font-size: 12px;
          color: var(--muted);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .limit-input {
          width: 60px;
          background: var(--panel);
          border: 1px solid var(--border);
          color: var(--text);
          padding: 4px 6px;
          border-radius: 4px;
          font-size: 11px;
        }

        .table-wrap {
          overflow-x: auto;
          border-radius: 8px;
          border: 1px solid var(--border);
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
        }

        thead th {
          background: var(--accent);
          color: white;
          padding: 8px 6px;
          font-weight: 600;
          font-size: 10px;
          text-align: left;
          white-space: nowrap;
        }

        tbody td {
          padding: 6px;
          border-bottom: 1px solid var(--border);
          color: var(--text);
          font-size: 11px;
          white-space: nowrap;
        }

        tbody tr:hover {
          background: rgba(var(--accent-rgb), 0.05);
        }

        .muted {
          color: var(--muted);
        }

        .pill {
          display: inline-block;
          padding: 2px 6px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 500;
        }

        .pill.green {
          background: rgba(34,197,94,0.2);
          color: #16a34a;
        }

        .pill.gray {
          background: rgba(100,116,139,0.2);
          color: var(--muted);
        }

        .footer {
          margin-top: 20px;
          display: flex;
          gap: 15px;
          align-items: center;
          font-size: 12px;
          color: var(--muted);
          padding: 15px 0;
        }

        @media (max-width: 768px) {
          .theme-buttons {
            position: relative;
            top: 0;
            right: 0;
            margin-bottom: 20px;
            justify-content: center;
          }

          .wrap {
            padding: 20px 10px;
          }

          header {
            grid-template-columns: 1fr;
            text-align: center;
            gap: 20px;
          }

          .side {
            justify-content: center;
          }

          .side.right {
            justify-content: center;
          }

          .form-grid .row {
            grid-template-columns: 1fr;
          }

          .controls {
            flex-wrap: wrap;
            gap: 5px;
          }
        }
      `}</style>
    </div>
  );
}