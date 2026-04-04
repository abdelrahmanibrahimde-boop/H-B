import React, { useState, useEffect } from 'react';
import { UserPlus, Users, LogOut, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { createChat } from '../lib/chat';
import { sendFriendRequest, listenFriendRequests, acceptFriendRequest, rejectFriendRequest } from '../lib/friends';

interface SidebarProps {
  activeChat: { id: string; name: string; isSelf?: boolean; photoURL?: string };
  setActiveChat: (chat: { id: string; name: string; isSelf?: boolean; photoURL?: string }) => void;
  onLogout: () => void;
  user: any;
  onOpenSettings: () => void;
}

export default function Sidebar({ activeChat, setActiveChat, onLogout, user, onOpenSettings }: SidebarProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [friendUsername, setFriendUsername] = useState('');
  const [friendStatus, setFriendStatus] = useState({ type: '', text: '' });

  useEffect(() => {
    // Echtzeit-Listener auf alle Nutzer, um Freunde herauszufiltern
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const allUsers = snapshot.docs.map(doc => doc.data());
      const me = allUsers.find(u => u.uid === user.uid);
      const myFriendsIds = me?.friends || [];

      // Nur Freunde in der Sidebar anzeigen
      const myFriends = allUsers.filter(u => u.uid !== user.uid && myFriendsIds.includes(u.uid));
      setUsers(myFriends);
    });

    const unsubscribeRequests = listenFriendRequests(user.uid, setRequests);

    return () => { unsubscribeUsers(); unsubscribeRequests(); };
  }, [user.uid]);

  const handleSelfChatClick = async () => {
    const chatId = await createChat(user.uid, user.uid);
    setActiveChat({
      id: chatId,
      name: user.username,
      isSelf: true,
      photoURL: user.photoURL
    });
  };

  const handleUserClick = async (otherUser: any) => {
    const chatId = await createChat(user.uid, otherUser.uid);
    setActiveChat({
      id: chatId,
      name: otherUser.username || otherUser.name,
      photoURL: otherUser.photoURL
    });
  };

  const submitFriendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setFriendStatus({ type: '', text: '' });
    if (!friendUsername.trim()) return;

    try {
      const currentFriends = users.map(u => u.uid);
      await sendFriendRequest(user.uid, user.username, currentFriends, friendUsername.trim());
      setFriendStatus({ type: 'success', text: 'Freundschaftsanfrage gesendet!' });
      setTimeout(() => {
        closeAddFriendModal();
      }, 1500);
    } catch (error: any) {
      setFriendStatus({ type: 'error', text: error.message });
    }
  };

  const closeAddFriendModal = () => {
    setShowAddFriendModal(false);
    setFriendUsername('');
    setFriendStatus({ type: '', text: '' });
  };

  return (
    <div className="w-64 bg-[var(--bg-sec)] flex flex-col h-full border-r border-[var(--bg-ter)]">
      {/* Top Actions */}
      <div className="p-4 shadow-md z-10 flex flex-col gap-2 border-b border-[var(--bg-ter)]">
        <button onClick={() => setShowAddFriendModal(true)} className="relative flex items-center justify-center gap-2 w-full bg-[#3ba55c] hover:bg-[#2d7d46] text-white py-2 px-4 rounded transition-colors">
          <UserPlus size={18} />
          <span className="font-medium">Add Friend</span>
          {requests.length > 0 && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-[#ed4245] text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full animate-pulse shadow-sm">
              {requests.length}
            </span>
          )}
        </button>
        <button className="flex items-center justify-center gap-2 w-full bg-[#4f545c] hover:bg-[#686d73] text-white py-2 px-4 rounded transition-colors">
          <Users size={18} />
          <span className="font-medium">Create Group</span>
        </button>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
        {/* Self Chat */}
        <button
          onClick={handleSelfChatClick}
          className={cn(
            "flex items-center gap-3 w-full p-2 rounded transition-colors",
            activeChat.isSelf ? "bg-[var(--bg-hov)] text-[var(--text)]" : "text-[var(--text-channels)] hover:bg-[var(--bg)] hover:text-[var(--text)]"
          )}
        >
          <div className="w-8 h-8 rounded-full bg-[#7289da] flex items-center justify-center text-white font-bold overflow-hidden shrink-0">
            {user.photoURL ? <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" /> : user.username[0]?.toUpperCase()}
          </div>
          <span className="font-medium">{user.username} (Du)</span>
        </button>

        {/* Freundschaftsanfragen */}
        <div className="pt-4 pb-2 px-2">
          <div className="text-xs font-bold text-[var(--text-channels)] uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Friend Requests</span>
            {requests.length > 0 && <span className="bg-[#ed4245] text-white px-1.5 rounded-full">{requests.length}</span>}
          </div>
          {requests.length === 0 ? (
            <div className="px-2 text-xs text-[#72767d] italic">No requests</div>
          ) : (
            requests.map((req) => (
              <div key={req.id} className="flex items-center justify-between p-2 hover:bg-[var(--bg-hov)] bg-[var(--bg-ter)] rounded mb-1 border border-[var(--bg-ter)] shadow-sm transition-colors">
                <span className="text-sm font-medium text-[var(--text)] truncate mr-2" title={req.fromUsername}>{req.fromUsername}</span>
                <div className="flex gap-2">
                  <button onClick={() => acceptFriendRequest(req.id, user.uid, req.from)} className="bg-[#3ba55c] hover:bg-[#2d7d46] text-white text-xs px-2 py-1 rounded transition-colors shadow-sm">Accept</button>
                  <button onClick={() => rejectFriendRequest(req.id)} className="bg-[#ed4245] hover:bg-[#c13b3e] text-white text-xs px-2 py-1 rounded transition-colors shadow-sm">Reject</button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="pt-4 pb-1 px-2 text-xs font-bold text-[var(--text-channels)] uppercase tracking-wider">
          Direct Messages
        </div>
        {users.length === 0 && (
          <div className="px-2 text-xs text-[#72767d] italic">Noch keine Freunde.</div>
        )}

        {users.map((otherUser) => (
          <button
            key={otherUser.uid}
            onClick={() => handleUserClick(otherUser)}
            className={cn(
              "flex items-center gap-3 w-full p-2 rounded transition-colors",
              activeChat.name === (otherUser.username || otherUser.name) && !activeChat.isSelf ? "bg-[var(--bg-hov)] text-[var(--text)]" : "text-[var(--text-channels)] hover:bg-[var(--bg)] hover:text-[var(--text)]"
            )}
          >
            <div className="w-8 h-8 rounded-full bg-[#4f545c] flex items-center justify-center text-white font-bold overflow-hidden shrink-0">
              {otherUser.photoURL ? <img src={otherUser.photoURL} alt="Avatar" className="w-full h-full object-cover" /> : (otherUser.username || otherUser.name || '?')[0]?.toUpperCase()}
            </div>
            <span className="font-medium">{otherUser.username || otherUser.name}</span>
          </button>
        ))}

      </div>

      {/* User Area / Logout */}
      <div className="p-4 bg-[var(--bg-ter)] flex items-center justify-between border-t border-[var(--bg-ter)]">
        <div 
          className="flex items-center gap-2 cursor-pointer hover:bg-[var(--bg)] p-1 -ml-1 rounded transition-colors"
          onClick={onOpenSettings}
          title="Account Optionen"
        >
          <div className="w-8 h-8 rounded-full bg-[var(--bg)] flex items-center justify-center text-[var(--text)] font-bold overflow-hidden shrink-0">
            {user.photoURL ? <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" /> : user.username[0]?.toUpperCase()}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-[var(--text)] leading-tight">{user.username}</span>
            <span className="text-xs text-[var(--text-mut)] leading-tight hover:underline">Optionen</span>
          </div>
        </div>
        <button 
          onClick={onLogout}
          className="text-[var(--text-mut)] hover:text-red-400 transition-colors p-2 rounded hover:bg-[var(--bg)]"
          title="Logout"
        >
          <LogOut size={18} />
        </button>
      </div>

      {/* Add Friend Modal */}
      {showAddFriendModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#36393f] w-full max-w-md rounded-lg shadow-xl overflow-hidden p-6">
            <h2 className="text-xl font-bold text-white mb-2">ADD FRIEND</h2>
            <p className="text-[#b9bbbe] text-sm mb-6">
              Du kannst Freunde mit ihrem Discord-Benutzernamen hinzufügen.
            </p>
            <form onSubmit={submitFriendRequest}>
              <input
                type="text"
                value={friendUsername}
                onChange={(e) => setFriendUsername(e.target.value)}
                placeholder="Gebe einen Benutzernamen ein"
                className="w-full bg-[#202225] text-white rounded p-3 outline-none focus:ring-2 focus:ring-[#7289da] mb-2"
                autoFocus
              />
              {friendStatus.text && (
                <p className={`text-sm mb-4 font-medium ${friendStatus.type === 'error' ? 'text-[#ed4245]' : 'text-[#3ba55c]'}`}>
                  {friendStatus.text}
                </p>
              )}
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={closeAddFriendModal} className="text-white hover:underline px-4 py-2">Abbrechen</button>
                <button type="submit" disabled={!friendUsername.trim()} className="bg-[#5865f2] hover:bg-[#4752c4] disabled:opacity-50 text-white px-4 py-2 rounded font-medium transition-colors">
                  Freundschaftsanfrage senden
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
