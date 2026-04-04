import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

interface LoginProps {
  onLogin: (user: any) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', localStorage.getItem('theme') || 'default');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newUser = { uid: userCredential.user.uid, id: userCredential.user.uid, username, email, birthdate: '', friends: [], theme: 'default' };
        await setDoc(doc(db, 'users', userCredential.user.uid), newUser);
        localStorage.setItem('theme', 'default');
        document.documentElement.setAttribute('data-theme', 'default');
        onLogin(newUser);
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          localStorage.setItem('theme', data.theme || 'default');
          document.documentElement.setAttribute('data-theme', data.theme || 'default');
          onLogin(data);
        } else {
          onLogin({ uid: userCredential.user.uid, id: userCredential.user.uid, username: email });
        }
      }
    } catch (err) {
      console.error("Auth-Fehler:", err);
      setError(err instanceof Error ? err.message : 'Ein unbekannter Fehler ist aufgetreten.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] theme-transition">
      <style>{`
        :root { --bg: #36393f; --bg-sec: #2f3136; --bg-ter: #202225; --text: #ffffff; --text-mut: #b9bbbe; }
        [data-theme="dark"] { --bg: #1e1f22; --bg-sec: #2b2d31; --bg-ter: #111214; --text: #ffffff; --text-mut: #949ba4; }
        [data-theme="light"] { --bg: #ffffff; --bg-sec: #f2f3f5; --bg-ter: #e3e5e8; --text: #060607; --text-mut: #4e5058; }
        .theme-transition, .theme-transition * { transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease; }
      `}</style>

      <div className="bg-[var(--bg-sec)] p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold text-[var(--text)] text-center mb-6">
          {isSignUp ? 'Erstelle einen Account' : 'Welcome Back!'}
        </h2>
        <p className="text-[var(--text-mut)] text-center mb-8">
          {isSignUp ? 'Werde Teil unserer Community!' : "We're so excited to see you again!"}
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[var(--text-mut)] text-xs font-bold uppercase mb-2">
              E-Mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[var(--bg-ter)] text-[var(--text)] rounded p-3 outline-none focus:ring-2 focus:ring-[#7289da] transition-all"
              required
            />
          </div>
          
          {isSignUp && (
            <div>
              <label className="block text-[var(--text-mut)] text-xs font-bold uppercase mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[var(--bg-ter)] text-[var(--text)] rounded p-3 outline-none focus:ring-2 focus:ring-[#7289da] transition-all"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-[var(--text-mut)] text-xs font-bold uppercase mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[var(--bg-ter)] text-[var(--text)] rounded p-3 outline-none focus:ring-2 focus:ring-[#7289da] transition-all"
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
              <button type="button" onClick={() => { setIsSignUp(false); setError(''); }} className="text-[#00aff4] hover:underline">Log In</button>
            </p>
          ) : (
            <p>
              Noch keinen Account?{' '}
              <button type="button" onClick={() => { setIsSignUp(true); setError(''); }} className="text-[#00aff4] hover:underline">Registrieren</button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
