import React, { useState } from 'react';
import { X } from 'lucide-react';

export default function Settings({ user, onClose, onSave }: any) {
  const [username, setUsername] = useState(user.username || '');
  const [email, setEmail] = useState(user.email || '');
  const [birthdate, setBirthdate] = useState(user.birthdate || '');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/user/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, birthdate }),
      });
      const data = await res.json();
      if (data.success) {
        onSave(data.user);
        onClose();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Fehler beim Speichern der Account-Daten');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-[#36393f] w-full max-w-md rounded-lg shadow-xl overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-[#202225]">
          <h2 className="text-xl font-bold text-white">Mein Account</h2>
          <button onClick={onClose} className="text-[#b9bbbe] hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="text-red-500 text-sm font-medium">{error}</div>}
          <div>
            <label className="block text-[#b9bbbe] text-xs font-bold uppercase mb-2">Username</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} required className="w-full bg-[#202225] text-white rounded p-3 outline-none focus:ring-2 focus:ring-[#7289da]" />
          </div>
          <div>
            <label className="block text-[#b9bbbe] text-xs font-bold uppercase mb-2">E-Mail</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="deine@email.de" className="w-full bg-[#202225] text-white rounded p-3 outline-none focus:ring-2 focus:ring-[#7289da]" />
          </div>
          <div>
            <label className="block text-[#b9bbbe] text-xs font-bold uppercase mb-2">Geburtsdatum</label>
            <input type="date" value={birthdate} onChange={e => setBirthdate(e.target.value)} className="w-full bg-[#202225] text-white rounded p-3 outline-none focus:ring-2 focus:ring-[#7289da]" />
          </div>
          
          <div className="pt-4 flex justify-end gap-3 border-t border-[#202225] mt-4 pt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 text-white hover:underline">Abbrechen</button>
            <button type="submit" className="bg-[#7289da] hover:bg-[#5b6eae] text-white px-4 py-2 rounded font-medium transition-colors">Speichern</button>
          </div>
        </form>
      </div>
    </div>
  );
}