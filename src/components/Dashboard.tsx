import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import ChatArea from './ChatArea';
import Settings from './Settings';
import { createChat } from '../lib/chat';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

interface DashboardProps {
  user: any;
  onLogout: () => void;
}

export default function Dashboard({ user, onLogout }: DashboardProps) {
  const [localUser, setLocalUser] = useState(user);
  const [showSettings, setShowSettings] = useState(false);
  const [activeChat, setActiveChat] = useState<{ id: string; name: string; isSelf?: boolean; photoURL?: string }>({
    id: `${user.uid}_${user.uid}`,
    name: user.username,
    isSelf: true,
    photoURL: user.photoURL,
  });

  useEffect(() => {
    createChat(user.uid, user.uid);
  }, [user.uid]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'default';
    document.documentElement.setAttribute('data-theme', localUser?.theme || savedTheme);
    if (localUser?.theme) {
      localStorage.setItem('theme', localUser.theme);
    }
  }, [localUser?.theme]);

  // 🔥 Realtime-Listener für das eigene User-Dokument
  useEffect(() => {
    if (!user?.uid) return;

    const unsub = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        setLocalUser({ uid: user.uid, id: user.uid, ...docSnap.data() });
      }
    });

    return () => unsub();
  }, [user.uid]);

  return (
    <div className="flex h-screen bg-[var(--bg)] text-[var(--text)] overflow-hidden theme-transition">
      <style>{`
        :root {
          --bg: #36393f;
          --bg-sec: #2f3136;
          --bg-ter: #202225;
          --bg-hov: #40444b;
          --text: #ffffff;
          --text-mut: #b9bbbe;
          --text-timestamp: #72767d;
          --text-channels: #8e9297;
        }
        [data-theme="dark"] {
          --bg: #1e1f22; --bg-sec: #2b2d31; --bg-ter: #111214; --bg-hov: #313338;
          --text: #ffffff; --text-mut: #949ba4; --text-timestamp: #80848e; --text-channels: #80848e;
        }
        [data-theme="light"] {
          --bg: #ffffff; --bg-sec: #f2f3f5; --bg-ter: #e3e5e8; --bg-hov: #ebedef;
          --text: #060607; --text-mut: #4e5058; --text-timestamp: #5c5e66; --text-channels: #5c5e66;
        }
        
        .theme-transition, .theme-transition * {
          transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
        }
      `}</style>

      <Sidebar 
        activeChat={activeChat} 
        setActiveChat={setActiveChat} 
        onLogout={onLogout} 
        user={localUser}
        onOpenSettings={() => setShowSettings(true)}
      />
      <ChatArea activeChat={activeChat} user={localUser} />
      {showSettings && (
        <Settings user={localUser} onClose={() => setShowSettings(false)} onSave={setLocalUser} />
      )}
    </div>
  );
}
