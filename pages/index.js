import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Trophy, Clock, Users, RefreshCw, AlertTriangle } from 'lucide-react';

// Supabase Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export default function Dashboard() {
  const [connectionStatus, setConnectionStatus] = useState('testing');
  const [errorDetails, setErrorDetails] = useState('');
  const [supabaseClient, setSupabaseClient] = useState(null);

  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    console.log('=== DASHBOARD DEBUG INFO ===');
    console.log('Supabase URL:', supabaseUrl);
    console.log('Supabase Key (first 20 chars):', supabaseKey ? supabaseKey.substring(0, 20) + '...' : 'MISSING');
    
    // Check Environment Variables
    if (!supabaseUrl || !supabaseKey) {
      setConnectionStatus('env_error');
      setErrorDetails(`Fehlende Environment Variables:
        - SUPABASE_URL: ${supabaseUrl ? '✅' : '❌ FEHLT'}
        - SUPABASE_KEY: ${supabaseKey ? '✅' : '❌ FEHLT'}`);
      return;
    }

    try {
      // Create Supabase client
      const supabase = createClient(supabaseUrl, supabaseKey);
      setSupabaseClient(supabase);
      
      console.log('Supabase Client erstellt:', supabase);
      
      // Test simple query
      setConnectionStatus('connecting');
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .limit(1);
      
      console.log('Teams Query Result:', { data, error });
      
      if (error) {
        setConnectionStatus('query_error');
        setErrorDetails(`Datenbank-Fehler: ${error.message}
        
Mögliche Ursachen:
- Tabellen existieren nicht
- Row Level Security ist aktiviert
- Falsche API Keys`);
        return;
      }
      
      setConnectionStatus('connected');
      
    } catch (error) {
      console.error('Connection Error:', error);
      setConnectionStatus('connection_error');
      setErrorDetails(`Verbindungsfehler: ${error.message}`);
    }
  };

  const renderStatus = () => {
    switch (connectionStatus) {
      case 'testing':
        return (
          <div className="text-center">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Dashboard-Verbindung testen...</h2>
            <p className="text-gray-400">Prüfe Supabase-Konfiguration...</p>
          </div>
        );
        
      case 'env_error':
        return (
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-4">Environment Variables Fehler</h2>
            <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 text-left">
              <pre className="text-red-400 text-sm whitespace-pre-wrap">{errorDetails}</pre>
            </div>
            <div className="mt-6 space-y-2">
              <p className="text-gray-300">Lösung:</p>
              <p className="text-sm text-gray-400">1. Gehen Sie zu Vercel Settings → Environment Variables</p>
              <p className="text-sm text-gray-400">2. Fügen Sie die fehlenden Variablen hinzu</p>
              <p className="text-sm text-gray-400">3. Klicken Sie "Redeploy"</p>
            </div>
          </div>
        );
        
      case 'connecting':
        return (
          <div className="text-center">
            <RefreshCw className="w-8 h-8 text-yellow-500 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Verbinde mit Datenbank...</h2>
            <p className="text-gray-400">Teste Datenbankzugriff...</p>
          </div>
        );
        
      case 'query_error':
        return (
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-4">Datenbank-Problem</h2>
            <div className="bg-orange-900/20 border border-orange-500 rounded-lg p-4 text-left">
              <pre className="text-orange-400 text-sm whitespace-pre-wrap">{errorDetails}</pre>
            </div>
            <div className="mt-6 space-y-2">
              <p className="text-gray-300">Lösungshilfe:</p>
              <p className="text-sm text-gray-400">1. Gehen Sie zu Supabase SQL Editor</p>
              <p className="text-sm text-gray-400">2. Führen Sie das Schema-SQL nochmal aus</p>
              <p className="text-sm text-gray-400">3. Prüfen Sie RLS (Row Level Security)</p>
            </div>
          </div>
        );
        
      case 'connection_error':
        return (
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-4">Verbindungsfehler</h2>
            <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 text-left">
              <pre className="text-red-400 text-sm whitespace-pre-wrap">{errorDetails}</pre>
            </div>
          </div>
        );
        
      case 'connected':
        return (
          <div className="text-center">
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              ✓
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Verbindung erfolgreich! 🎉</h2>
            <p className="text-gray-400 mb-6">Supabase-Datenbank ist erreichbar</p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg text-white transition-colors"
            >
              Dashboard neu laden
            </button>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700 p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-blue-400">Slow Mo eSport Dashboard</h1>
          <p className="text-gray-400 mt-1">Diagnose & Fehlerbehebung</p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-gray-800 rounded-xl p-8 border border-gray-700">
          {renderStatus()}
        </div>

        {/* Debug Info */}
        <div className="mt-8 bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Debug Information</h3>
          <div className="space-y-2 text-sm">
            <p><span className="text-gray-400">Environment:</span> <span className="text-green-400">Production</span></p>
            <p><span className="text-gray-400">Supabase URL:</span> <span className="text-blue-400">{supabaseUrl || 'NICHT GESETZT'}</span></p>
            <p><span className="text-gray-400">Supabase Key:</span> <span className="text-blue-400">{supabaseKey ? 'GESETZT ✓' : 'NICHT GESETZT ❌'}</span></p>
            <p><span className="text-gray-400">Status:</span> <span className="text-yellow-400">{connectionStatus}</span></p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex gap-4 justify-center">
          <button 
            onClick={testConnection}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Erneut testen
          </button>
        </div>
      </div>
    </div>
  );
}