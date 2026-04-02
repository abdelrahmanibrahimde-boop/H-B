import React from 'react';
import { UserPlus, Users, LogOut, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  activeChat: { id: string; name: string; isSelf?: boolean };
  setActiveChat: (chat: { id: string; name: string; isSelf?: boolean }) => void;
  onLogout: () => void;
  user: any;
  onOpenSettings: () => void;
}

export default function Sidebar({ activeChat, setActiveChat, onLogout, user, onOpenSettings }: SidebarProps) {
  return (
    <div className="w-64 bg-[#2f3136] flex flex-col h-full border-r border-[#202225]">
      {/* Top Actions */}
      <div className="p-4 shadow-md z-10 flex flex-col gap-2 border-b border-[#202225]">
        <button className="flex items-center justify-center gap-2 w-full bg-[#7289da] hover:bg-[#5b6eae] text-white py-2 px-4 rounded transition-colors">
          <UserPlus size={18} />
          <span className="font-medium">Add Friend</span>
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
          onClick={() => setActiveChat({ id: 'ich', name: 'ich', isSelf: true })}
          className={cn(
            "flex items-center gap-3 w-full p-2 rounded transition-colors",
            activeChat.id === 'ich' ? "bg-[#393c43] text-white" : "text-[#8e9297] hover:bg-[#36393f] hover:text-[#dcddde]"
          )}
        >
          <div className="w-8 h-8 rounded-full bg-[#7289da] flex items-center justify-center text-white font-bold">
            i
          </div>
          <span className="font-medium">ich</span>
        </button>

        <div className="pt-4 pb-1 px-2 text-xs font-bold text-[#8e9297] uppercase tracking-wider">
          Direct Messages
        </div>

      </div>

      {/* User Area / Logout */}
      <div className="p-4 bg-[#292b2f] flex items-center justify-between border-t border-[#202225]">
        <div 
          className="flex items-center gap-2 cursor-pointer hover:bg-[#36393f] p-1 -ml-1 rounded transition-colors"
          onClick={onOpenSettings}
          title="Account Optionen"
        >
          <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-white font-bold">
            {user.username[0]?.toUpperCase()}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white leading-tight">{user.username}</span>
            <span className="text-xs text-[#b9bbbe] leading-tight hover:underline">Optionen</span>
          </div>
        </div>
        <button 
          onClick={onLogout}
          className="text-[#b9bbbe] hover:text-red-400 transition-colors p-2 rounded hover:bg-[#36393f]"
          title="Logout"
        >
          <LogOut size={18} />
        </button>
      </div>
    </div>
  );
}
