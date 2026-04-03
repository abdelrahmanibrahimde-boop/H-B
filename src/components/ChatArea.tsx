import React, { useState, useRef, useEffect } from 'react';
import { Phone, Video, PlusCircle, Image as ImageIcon, FileText, Film, Send, Trash2, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { listenMessages, sendMessage, deleteMessage, editMessage } from '../lib/chat';

interface ChatAreaProps {
  activeChat: { id: string; name: string; isSelf?: boolean; photoURL?: string };
  user: any;
}

export default function ChatArea({ activeChat, user }: ChatAreaProps) {
  const [text, setText] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showProfileModal, setShowProfileModal] = useState(false);

  // 🔥 Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 🔥 Realtime messages (DYNAMISCH!)
  useEffect(() => {
    if (!activeChat?.id) return;

    const unsubscribe = listenMessages(activeChat.id, setMessages);

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [activeChat.id]);

  // 🔥 Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    await sendMessage(activeChat.id, user.uid, user.username, text);
    setText('');
  };

  return (
    <div className="flex-1 flex flex-col bg-[#36393f] relative">

      {/* Header */}
      <div className="h-14 border-b border-[#202225] flex items-center px-4 shadow-sm z-10 relative">
        <div className="flex-1"></div>

        <div 
          className="flex items-center gap-3 absolute left-1/2 transform -translate-x-1/2 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => setShowProfileModal(true)}
        >
          <div className="w-8 h-8 rounded-full bg-[#4f545c] flex items-center justify-center text-white font-bold overflow-hidden shrink-0">
            {(activeChat.isSelf ? user.photoURL : activeChat.photoURL) ? (
              <img src={activeChat.isSelf ? user.photoURL : activeChat.photoURL} className="w-full h-full object-cover" alt="avatar" />
            ) : (
              activeChat.isSelf ? user.username[0]?.toUpperCase() : activeChat.name[0]?.toUpperCase()
            )}
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.senderId === user.uid ? "justify-end" : "justify-start"} group mb-2`}
          >
            <div className={`flex max-w-[80%] gap-3 ${msg.senderId === user.uid ? "flex-row-reverse" : "flex-row"}`}>
              {/* Avatar Icon */}
              <div className="w-8 h-8 rounded-full bg-[#4f545c] shrink-0 flex items-center justify-center text-white font-bold overflow-hidden mt-1 shadow-sm">
                {(msg.senderId === user.uid ? user.photoURL : activeChat.photoURL) ? (
                  <img src={msg.senderId === user.uid ? user.photoURL : activeChat.photoURL} className="w-full h-full object-cover" alt="avatar" />
                ) : (
                  (msg.senderUsername || msg.senderId)[0]?.toUpperCase()
                )}
              </div>

              <div className={`flex flex-col ${msg.senderId === user.uid ? "items-end" : "items-start"}`}>
              <div className="text-xs text-[#72767d] mb-1">
                {msg.senderUsername || msg.senderId}
              </div>

                <div className={`flex items-center gap-2 ${msg.senderId === user.uid ? "flex-row-reverse" : "flex-row"}`}>
                {editingMessageId === msg.id ? (
                  <div className="flex flex-col gap-1 min-w-[200px]">
                    <input
                      type="text"
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="bg-[#2f3136] text-[#dcddde] px-3 py-2 rounded-lg outline-none border border-[#7289da] w-full text-sm"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && editContent.trim()) {
                          editMessage(activeChat.id, msg.id, editContent.trim());
                          setEditingMessageId(null);
                        } else if (e.key === 'Escape') {
                          setEditingMessageId(null);
                        }
                      }}
                    />
                    <span className="text-[10px] text-[#b9bbbe]">ESC zum Abbrechen • ENTER zum Speichern</span>
                  </div>
                ) : (
                  <div
                    className={`px-3 py-2 rounded-lg relative ${
                      msg.deleted
                        ? "bg-transparent border border-[#40444b] text-[#72767d] italic"
                        : msg.senderId === user.uid
                        ? "bg-[#5865f2] text-white"
                        : "bg-[#2f3136] text-[#dcddde]"
                    }`}
                  >
                    {msg.deleted ? "Diese Nachricht wurde gelöscht." : msg.text}
                    {msg.edited && !msg.deleted && (
                      <span className="text-[10px] opacity-70 ml-2">(bearbeitet)</span>
                    )}
                  </div>
                )}
                
                {msg.senderId === user.uid && !msg.deleted && editingMessageId !== msg.id && (
                  <div className="flex opacity-0 group-hover:opacity-100 transition-all gap-1">
                    <button 
                      onClick={() => { setEditingMessageId(msg.id); setEditContent(msg.text); }}
                      className="p-1.5 text-[#b9bbbe] hover:bg-[#2f3136] rounded"
                      title="Nachricht bearbeiten"
                    >
                      <Pencil size={16} />
                    </button>
                    <button 
                      onClick={() => setMessageToDelete(msg.id)}
                      className="p-1.5 text-[#ed4245] hover:bg-[#2f3136] rounded"
                      title="Nachricht löschen"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
              </div>
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 pt-0">
        <div className="bg-[#40444b] rounded-lg flex items-center px-4 py-2 relative">

          {/* Attach */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowAttachMenu((prev) => !prev)}
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

          {/* Input */}
          <form onSubmit={handleSendMessage} className="flex-1 flex items-center ml-2">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`Message @${activeChat.name}`}
              className="w-full bg-transparent text-[#dcddde] outline-none placeholder-[#72767d]"
            />

            <button
              type="submit"
              disabled={!text.trim()}
              className="text-[#b9bbbe] hover:text-[#7289da] disabled:opacity-50 transition-colors p-2 -mr-2"
            >
              <Send size={20} />
            </button>
          </form>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {messageToDelete && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#36393f] p-6 rounded-lg shadow-xl w-full max-w-sm border border-[#202225]">
            <h3 className="text-lg font-bold text-white mb-2">Nachricht löschen</h3>
            <p className="text-[#b9bbbe] text-sm mb-6">Möchtest du diese Nachricht wirklich löschen?</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setMessageToDelete(null)} 
                className="px-4 py-2 text-white hover:underline text-sm font-medium"
              >
                Abbrechen
              </button>
              <button 
                onClick={() => {
                  deleteMessage(activeChat.id, messageToDelete);
                  setMessageToDelete(null);
                }} 
                className="bg-[#ed4245] hover:bg-[#c13b3e] text-white px-4 py-2 rounded font-medium text-sm transition-colors"
              >
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Picture Modal */}
      {showProfileModal && (
        <div 
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" 
          onClick={() => setShowProfileModal(false)}
        >
          <div 
            className="bg-[#36393f] rounded-lg shadow-xl w-full max-w-sm overflow-hidden border border-[#202225] transform transition-all"
            onClick={(e) => e.stopPropagation()} // Verhindert, dass das Modal schließt, wenn man IN das Fenster klickt
          >
            <div className="bg-[#202225] p-8 flex justify-center border-b border-[#2f3136]">
              <div className="w-32 h-32 rounded-full bg-[#4f545c] flex items-center justify-center text-white font-bold text-5xl overflow-hidden shadow-lg border-4 border-[#36393f]">
                {(activeChat.isSelf ? user.photoURL : activeChat.photoURL) ? (
                  <img src={activeChat.isSelf ? user.photoURL : activeChat.photoURL} className="w-full h-full object-cover" alt="avatar" />
                ) : (
                  activeChat.isSelf ? user.username[0]?.toUpperCase() : activeChat.name[0]?.toUpperCase()
                )}
              </div>
            </div>
            <div className="p-6 text-center">
              <h3 className="text-2xl font-bold text-white mb-1">{activeChat.name}</h3>
              <p className="text-sm text-[#b9bbbe] mb-6">{activeChat.isSelf ? 'Das bist du!' : 'Chat Partner'}</p>
              
              <button 
                onClick={() => setShowProfileModal(false)}
                className="bg-[#5865f2] hover:bg-[#4752c4] text-white px-6 py-2.5 rounded font-medium text-sm transition-colors w-full"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}