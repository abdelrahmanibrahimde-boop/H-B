import React, { useState } from 'react';
import Sidebar from './Sidebar';
import ChatArea from './ChatArea';
import Settings from './Settings';

interface DashboardProps {
  user: any;
  onLogout: () => void;
}

export default function Dashboard({ user, onLogout }: DashboardProps) {
  const [localUser, setLocalUser] = useState(user);
  const [showSettings, setShowSettings] = useState(false);
  const [activeChat, setActiveChat] = useState<{ id: string; name: string; isSelf?: boolean }>({
    id: 'ich',
    name: 'ich',
    isSelf: true,
  });

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
