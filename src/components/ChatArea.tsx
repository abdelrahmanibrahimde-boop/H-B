import React, { useState, useRef, useEffect } from 'react';
import { Phone, Video, PlusCircle, Image as ImageIcon, FileText, Film, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatAreaProps {
  activeChat: { id: string; name: string; isSelf?: boolean };
  user: any;
}

export default function ChatArea({ activeChat, user }: ChatAreaProps) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<{ id: string; text: string; sender: string; timestamp: Date }[]>([]);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Reset messages when chat changes (stub logic)
  useEffect(() => {
    setMessages([
      {
        id: '1',
        text: activeChat.isSelf ? 'This is your personal space.' : `This is the beginning of your direct message history with @${activeChat.name}.`,
        sender: 'system',
        timestamp: new Date(),
      }
    ]);
  }, [activeChat.id]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setMessages(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        text: message,
        sender: user.username,
        timestamp: new Date(),
      }
    ]);
    setMessage('');
  };

  return (
    <div className="flex-1 flex flex-col bg-[#36393f] relative">
      {/* Header */}
      <div className="h-14 border-b border-[#202225] flex items-center px-4 shadow-sm z-10 relative">
        <div className="flex-1"></div>
        <div className="flex items-center gap-3 absolute left-1/2 transform -translate-x-1/2">
          <div className="w-8 h-8 rounded-full bg-[#4f545c] flex items-center justify-center text-white font-bold">
            {activeChat.isSelf ? 'i' : activeChat.name[0]}
          </div>
          <span className="font-bold text-white text-lg">
            {activeChat.name}
          </span>
        </div>
        <div className="flex-1 flex justify-end items-center gap-4 text-[#b9bbbe]">
          <button className="hover:text-[#dcddde] transition-colors">
            <Phone size={20} />
          </button>
          <button className="hover:text-[#dcddde] transition-colors">
            <Video size={20} />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        {messages.map((msg) => (
          <div key={msg.id} className={cn("flex gap-4", msg.sender === 'system' ? "justify-center" : "")}>
            {msg.sender !== 'system' && (
              <div className="w-10 h-10 rounded-full bg-black flex-shrink-0 flex items-center justify-center text-white font-bold mt-1 shadow-sm border border-[#202225]">
                {msg.sender[0]?.toUpperCase()}
              </div>
            )}
            <div className={cn("flex flex-col", msg.sender === 'system' ? "items-center text-center" : "")}>
              {msg.sender !== 'system' && (
                <div className="flex items-baseline gap-2">
                  <span className="font-medium text-white">{msg.sender}</span>
                  <span className="text-xs text-[#72767d]">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
              <div className={cn(
                "text-[#dcddde] leading-relaxed",
                msg.sender === 'system' ? "text-[#8e9297] text-sm font-medium mt-4" : ""
              )}>
                {msg.text}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 pt-0">
        <div className="bg-[#40444b] rounded-lg flex items-center px-4 py-2 relative">
          
          {/* Attach Menu */}
          <div className="relative">
            <button 
              type="button"
              onClick={() => setShowAttachMenu(!showAttachMenu)}
              className="text-[#b9bbbe] hover:text-[#dcddde] transition-colors p-2 -ml-2 rounded-full hover:bg-[#36393f]"
            >
              <PlusCircle size={24} />
            </button>

            {showAttachMenu && (
              <div className="absolute bottom-full left-0 mb-2 w-48 bg-[#2f3136] rounded-md shadow-lg border border-[#202225] py-2 z-20">
                <button className="w-full flex items-center gap-3 px-4 py-2 text-[#b9bbbe] hover:bg-[#40444b] hover:text-white transition-colors">
                  <ImageIcon size={18} className="text-green-400" />
                  <span>Upload Image</span>
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-2 text-[#b9bbbe] hover:bg-[#40444b] hover:text-white transition-colors">
                  <Film size={18} className="text-blue-400" />
                  <span>Upload Video</span>
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-2 text-[#b9bbbe] hover:bg-[#40444b] hover:text-white transition-colors">
                  <FileText size={18} className="text-yellow-400" />
                  <span>Upload File</span>
                </button>
              </div>
            )}
          </div>

          <form onSubmit={handleSendMessage} className="flex-1 flex items-center ml-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`Message @${activeChat.name}`}
              className="w-full bg-transparent text-[#dcddde] outline-none placeholder-[#72767d]"
            />
            <button 
              type="submit"
              disabled={!message.trim()}
              className="text-[#b9bbbe] hover:text-[#7289da] disabled:opacity-50 disabled:hover:text-[#b9bbbe] transition-colors p-2 -mr-2"
            >
              <Send size={20} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
