import React, { useState, useRef } from 'react';
import { X, Camera, Loader2 } from 'lucide-react';
import { auth, db } from '../firebase';
import { doc, updateDoc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { EmailAuthProvider, reauthenticateWithCredential, deleteUser } from 'firebase/auth';

export default function Settings({ user, onClose, onSave }: any) {
  const [username, setUsername] = useState(user.username || '');
  const [email, setEmail] = useState(user.email || '');
  const [birthdate, setBirthdate] = useState(user.birthdate || '');
  const [theme, setTheme] = useState(user.theme || 'default');
  const [error, setError] = useState('');
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [photoURL, setPhotoURL] = useState(user.photoURL || '');

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const userId = user.uid;
      const userRef = doc(db, 'users', userId);
      const docSnap = await getDoc(userRef);
      
      const updatedData = { 
        username, 
        usernameLower: username.toLowerCase(), 
        email, 
        birthdate, 
        theme 
      };
      if (docSnap.exists()) {
        await updateDoc(userRef, updatedData);
      } else {
        await setDoc(userRef, updatedData);
      }
      
      onSave({ ...user, ...updatedData });
      onClose();
    } catch (err) {
      setError('Fehler beim Speichern der Account-Daten');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
      setError('Das Bild darf maximal 2MB groß sein.');
      return;
    }

    setIsUploading(true);
    setError('');

    const reader = new FileReader();

    reader.onloadend = async () => {
      try {
        const base64 = reader.result as string;
        const userId = user.uid;

        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, { photoURL: base64 });

        setPhotoURL(base64);
        onSave({ ...user, photoURL: base64 });
      } catch (err) {
        console.error(err);
        setError('Fehler beim Speichern in Firestore.');
      } finally {
        setIsUploading(false);
      }
    };

    reader.readAsDataURL(file);
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsDeleting(true);

    try {
      const currentUser = auth.currentUser;
      if (!currentUser || !currentUser.email) {
        throw new Error("Sitzung ungültig. Bitte logge dich neu ein.");
      }

      // 1. Nutzer zur Sicherheit re-authentifizieren
      const credential = EmailAuthProvider.credential(currentUser.email, deletePassword);
      await reauthenticateWithCredential(currentUser, credential);

      // 2. Nutzer-Daten aus Firestore löschen
      const userId = user.uid;
      await deleteDoc(doc(db, 'users', userId));

      // 3. Nutzer aus Firebase Auth löschen
      await deleteUser(currentUser);
    } catch (err: any) {
      setError(err.message.includes('auth/invalid-credential') ? 'Falsches Passwort.' : 'Fehler beim Löschen des Accounts.');
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-[var(--bg)] w-full max-w-md rounded-lg shadow-xl overflow-hidden border border-[var(--bg-ter)]">
        <div className="flex justify-between items-center p-6 border-b border-[var(--bg-ter)]">
          <h2 className="text-xl font-bold text-[var(--text)]">Mein Account</h2>
          <button onClick={onClose} className="text-[var(--text-mut)] hover:text-[var(--text)] transition-colors">
            <X size={24} />
          </button>
        </div>
        
        {showDeleteConfirm ? (
          <div className="p-6">
            <h3 className="text-xl font-bold text-[#ed4245] mb-4">Account endgültig löschen</h3>
            <p className="text-[var(--text-mut)] text-sm mb-4">
              Diese Aktion kann <strong>nicht rückgängig</strong> gemacht werden. Bitte gib dein Passwort ein, um zu bestätigen, dass du deinen Account wirklich löschen möchtest.
            </p>
            <form onSubmit={handleDeleteAccount} className="space-y-4">
              {error && <div className="text-[#ed4245] text-sm font-medium">{error}</div>}
              <div>
                <label className="block text-[var(--text-mut)] text-xs font-bold uppercase mb-2">Passwort</label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={e => setDeletePassword(e.target.value)}
                  required
                  className="w-full bg-[var(--bg-ter)] text-[var(--text)] rounded p-3 outline-none focus:ring-2 focus:ring-[#ed4245]"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => { setShowDeleteConfirm(false); setError(''); setDeletePassword(''); }} className="px-4 py-2 text-white hover:underline" disabled={isDeleting}>Abbrechen</button>
                <button type="submit" disabled={isDeleting || !deletePassword} className="bg-[#ed4245] hover:bg-[#c13b3e] disabled:opacity-50 text-white px-4 py-2 rounded font-medium transition-colors">
                  {isDeleting ? 'Lösche...' : 'Account löschen'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="flex flex-col items-center mb-6">
              <div 
                className="relative w-24 h-24 rounded-full bg-[var(--bg-sec)] flex items-center justify-center cursor-pointer group overflow-hidden border-4 border-[var(--bg)] shadow-lg"
                onClick={() => fileInputRef.current?.click()}
              >
                {photoURL ? (
                  <img src={photoURL} alt="Avatar" className="w-full h-full object-cover group-hover:opacity-30 transition-opacity" />
                ) : (
                  <span className="text-3xl font-bold text-[var(--text)] group-hover:opacity-30 transition-opacity">
                    {username[0]?.toUpperCase() || '?'}
                  </span>
                )}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50">
                  {isUploading ? <Loader2 className="animate-spin text-white" /> : <Camera className="text-white" size={28} />}
                </div>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                accept="image/*" 
                className="hidden" 
              />
              <p className="text-xs text-[var(--text-mut)] mt-2 font-medium hover:underline cursor-pointer" onClick={() => fileInputRef.current?.click()}>Avatar ändern (max 2MB)</p>
            </div>

            {error && <div className="text-red-500 text-sm font-medium">{error}</div>}
            <div>
              <label className="block text-[var(--text-mut)] text-xs font-bold uppercase mb-2">Username</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} required className="w-full bg-[var(--bg-ter)] text-[var(--text)] rounded p-3 outline-none focus:ring-2 focus:ring-[#7289da]" />
            </div>
            <div>
              <label className="block text-[var(--text-mut)] text-xs font-bold uppercase mb-2">E-Mail</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="deine@email.de" className="w-full bg-[var(--bg-ter)] text-[var(--text)] rounded p-3 outline-none focus:ring-2 focus:ring-[#7289da]" />
            </div>
            <div>
              <label className="block text-[var(--text-mut)] text-xs font-bold uppercase mb-2">Geburtsdatum</label>
              <input type="date" value={birthdate} onChange={e => setBirthdate(e.target.value)} className="w-full bg-[var(--bg-ter)] text-[var(--text)] rounded p-3 outline-none focus:ring-2 focus:ring-[#7289da]" />
            </div>
            
            <div>
              <label className="block text-[var(--text-mut)] text-xs font-bold uppercase mb-2">App Theme</label>
              <select value={theme} onChange={e => handleThemeChange(e.target.value)} className="w-full bg-[var(--bg-ter)] text-[var(--text)] rounded p-3 outline-none focus:ring-2 focus:ring-[#7289da]">
                <option value="default">Default (Dark)</option>
                <option value="dark">Midnight Dark</option>
                <option value="light">Light Mode</option>
              </select>
            </div>
            
            <div className="pt-4 flex justify-between items-center border-t border-[var(--bg-ter)] mt-4 pt-6">
              <button type="button" onClick={() => { setShowDeleteConfirm(true); setError(''); }} className="text-[#ed4245] hover:underline text-sm font-medium transition-colors">Account löschen</button>
              <div className="flex gap-3">
                <button type="button" onClick={onClose} className="px-4 py-2 text-white hover:underline">Abbrechen</button>
                <button type="submit" className="bg-[#7289da] hover:bg-[#5b6eae] text-white px-4 py-2 rounded font-medium transition-colors">Speichern</button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}