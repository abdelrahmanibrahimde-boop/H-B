import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface LoginProps {
  onLogin: (user: any) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const endpoint = isSignUp ? '/api/signup' : '/api/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("API-Fehler: Der Server antwortet nicht mit JSON. Bitte stelle sicher, dass du http://localhost:3000 nutzt.");
      }

      const data = await res.json();

      if (data.success) {
        onLogin(data.user);
      } else {
        setError(data.message || (isSignUp ? 'Registrierung fehlgeschlagen' : 'Login fehlgeschlagen'));
      }
    } catch (err) {
      console.error("Auth-Fehler:", err);
      setError(err instanceof Error ? err.message : 'Ein unbekannter Fehler ist aufgetreten.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#36393f]">
      <div className="bg-[#2f3136] p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold text-white text-center mb-6">
          {isSignUp ? 'Erstelle einen Account' : 'Welcome Back!'}
        </h2>
        <p className="text-[#b9bbbe] text-center mb-8">
          {isSignUp ? 'Werde Teil unserer Community!' : "We're so excited to see you again!"}
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[#b9bbbe] text-xs font-bold uppercase mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#202225] text-white rounded p-3 outline-none focus:ring-2 focus:ring-[#7289da] transition-all"
              required
            />
          </div>
          
          <div>
            <label className="block text-[#b9bbbe] text-xs font-bold uppercase mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#202225] text-white rounded p-3 outline-none focus:ring-2 focus:ring-[#7289da] transition-all"
              required
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            className="w-full bg-[#7289da] hover:bg-[#5b6eae] text-white font-bold py-3 rounded transition-colors"
          >
            {isSignUp ? 'Registrieren' : 'Log In'}
          </button>
        </form>

        <div className="mt-4 text-sm text-[#b9bbbe]">
          {isSignUp ? (
            <p>
              Du hast schon einen Account?{' '}
              <button type="button" onClick={() => setIsSignUp(false)} className="text-[#00aff4] hover:underline">Log In</button>
            </p>
          ) : (
            <p>
              Noch keinen Account?{' '}
              <button type="button" onClick={() => setIsSignUp(true)} className="text-[#00aff4] hover:underline">Registrieren</button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
