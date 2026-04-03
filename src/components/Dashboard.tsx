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
    <div className="flex h-screen bg-[#36393f] text-white overflow-hidden">
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
