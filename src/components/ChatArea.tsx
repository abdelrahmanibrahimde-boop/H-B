import React, { useState, useRef, useEffect } from 'react';
import { Phone, PlusCircle, Image as ImageIcon, FileText, Film, Send, Trash2, Pencil, X, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { listenMessages, sendMessage, deleteMessage, editMessage } from '../lib/chat';
import { useCall } from '../lib/useCall';
import CallOverlay from './CallOverlay';

interface ChatAreaProps {
  activeChat: { id: string; name: string; isSelf?: boolean; photoURL?: string; uid?: string };
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadType, setUploadType] = useState<'image' | 'video' | 'file'>('image');
  const [fullscreenMedia, setFullscreenMedia] = useState<{ url: string; type: 'image' | 'video' } | null>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);

  // 🔥 Nur noch die benötigten Audio-Funktionen aus dem Hook holen
  const {
    createCall,
    acceptCall,
    rejectCall,
    endCall,
    localStream,
    remoteStream,
    incomingCall,
    callStatus,
    isMuted,
    toggleMute,
    callDuration,
    isUserSpeaking,
    isPartnerSpeaking,
  } = useCall(user.uid);

  const isCallerRef = useRef(false);
  const prevCallStatusRef = useRef(callStatus);
  const callStartTimeRef = useRef<number | null>(null);

  const handleCallClick = () => {
    if (callStatus !== 'idle' || activeChat.isSelf) return;
    
    // Partner-ID aus der Chat-ID extrahieren
    const friendUid = activeChat.id.split('_').find((id) => id !== user.uid);
    if (friendUid) {
      isCallerRef.current = true;
      createCall(friendUid, user.username);
      sendMessage(activeChat.id, user.uid, user.username, "📞 Anruf gestartet");
    }
  };

  // Automatische Chat-Nachrichten bei Anruf-Ende
  useEffect(() => {
    if (prevCallStatusRef.current === callStatus) return;
    if (callStatus === 'connected') callStartTimeRef.current = Date.now();
    
    if (prevCallStatusRef.current === 'connected' && callStatus === 'idle' && isCallerRef.current) {
      const duration = Math.floor((Date.now() - (callStartTimeRef.current || 0)) / 1000);
      const mins = Math.floor(duration / 60);
      const secs = duration % 60;
      sendMessage(activeChat.id, user.uid, user.username, `📞 Anruf beendet (${mins}:${secs.toString().padStart(2, '0')})`);
    }
    prevCallStatusRef.current = callStatus;
  }, [callStatus, activeChat.id, user.uid, user.username]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!activeChat?.id) return;
    const unsubscribe = listenMessages(activeChat.id, setMessages);
    return () => unsubscribe();
  }, [activeChat.id]);

  // UX: Menü schließen, wenn man außerhalb klickt
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (attachMenuRef.current && !attachMenuRef.current.contains(event.target as Node)) {
        setShowAttachMenu(false);
      }
    };
    if (showAttachMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAttachMenu]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    await sendMessage(activeChat.id, user.uid, user.username, text);
    setText('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 700KB Limit-Prüfung zum Schutz der Firestore-Datenbank (1MB Doc-Limit)
    if (file.size > 700 * 1024) {
      alert("Datei zu groß (max 700KB)");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      await sendMessage(activeChat.id, user.uid, user.username, "", uploadType, reader.result as string, file.name);
      setShowAttachMenu(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsDataURL(file);
  };

  const triggerUpload = (type: 'image' | 'video' | 'file') => {
    setUploadType(type);
    if (fileInputRef.current) {
      fileInputRef.current.accept = type === 'image' ? 'image/*' : type === 'video' ? 'video/*' : '*/*';
      fileInputRef.current.click();
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[var(--bg)] relative">

      {/* Fullscreen Media Viewer */}
      {fullscreenMedia && fullscreenMedia.type === 'image' && (
        <div className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center backdrop-blur-sm" onClick={() => setFullscreenMedia(null)}>
          <button 
            className="absolute top-6 right-6 text-white hover:text-gray-300 bg-white/10 p-2 rounded-full transition-colors" 
            onClick={(e) => { e.stopPropagation(); setFullscreenMedia(null); }}
          >
            <X size={32} />
          </button>
          <img 
            src={fullscreenMedia.url} 
            alt="Fullscreen" 
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl" 
            onClick={(e) => e.stopPropagation()} 
          />
        </div>
      )}

      {/* 🔥 Call Overlay (Audio Only) */}
      <CallOverlay
        callStatus={callStatus}
        incomingCall={incomingCall}
        acceptCall={acceptCall}
        rejectCall={rejectCall}
        endCall={endCall}
        activeChat={activeChat}
        remoteStream={remoteStream}
        isMuted={isMuted}
        toggleMute={toggleMute}
        callDuration={callDuration}
        currentUser={user}
        isUserSpeaking={isUserSpeaking}
        isPartnerSpeaking={isPartnerSpeaking}
      />

      {/* Header */}
      <div className="h-14 border-b border-[var(--bg-ter)] flex items-center px-4 shadow-sm z-10 relative">
        <div className="flex-1"></div>
        <div className="flex items-center gap-3 absolute left-1/2 transform -translate-x-1/2 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setShowProfileModal(true)}>
          <div className="w-8 h-8 rounded-full bg-[#4f545c] flex items-center justify-center text-white font-bold overflow-hidden shrink-0">
            {activeChat.photoURL ? <img src={activeChat.photoURL} className="w-full h-full object-cover" alt="avatar" /> : activeChat.name[0]?.toUpperCase()}
          </div>
          <span className="font-bold text-[var(--text)] text-lg">{activeChat.name}</span>
        </div>

        <div className="flex-1 flex justify-end items-center gap-4 text-[var(--text-mut)]">
          <button 
            onClick={handleCallClick} 
            disabled={callStatus !== 'idle'}
            className={cn("transition-colors", callStatus !== 'idle' ? "opacity-30 cursor-not-allowed" : "hover:text-green-400")} 
          >
            <Phone size={22} />
          </button>
          {/* Video Button wurde hier entfernt */}
        </div>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.senderId === user.uid ? "justify-end" : "justify-start"} group mb-2`}>
            <div className={`flex max-w-[80%] gap-3 ${msg.senderId === user.uid ? "flex-row-reverse" : "flex-row"}`}>
              <div className="w-8 h-8 rounded-full bg-[#4f545c] shrink-0 flex items-center justify-center text-white font-bold overflow-hidden mt-1">
                {msg.senderId === user.uid ? (user.photoURL && <img src={user.photoURL} className="w-full h-full object-cover" alt="avatar" />) : (activeChat.photoURL && <img src={activeChat.photoURL} className="w-full h-full object-cover" alt="avatar" />)}
                {!user.photoURL && !activeChat.photoURL && (msg.senderUsername || "?")[0].toUpperCase()}
              </div>
              <div className={`flex flex-col ${msg.senderId === user.uid ? "items-end" : "items-start"}`}>
                <div className={`rounded-lg ${msg.type === 'image' || msg.type === 'video' ? 'bg-transparent p-0' : msg.type === 'file' ? 'bg-[var(--bg-sec)] text-[var(--text)] px-3 py-2' : (msg.senderId === user.uid ? 'bg-[#5865f2] text-white px-3 py-2' : 'bg-[var(--bg-sec)] text-[var(--text)] px-3 py-2')}`}>
                  {msg.type === 'text' || !msg.type ? (
                    msg.text
                  ) : msg.type === 'image' ? (
                    <img 
                      src={msg.fileUrl} 
                      alt="attachment" 
                      className="max-w-[250px] max-h-[250px] rounded-lg border border-white/5 cursor-pointer hover:opacity-90 transition-opacity" 
                      onClick={() => setFullscreenMedia({ url: msg.fileUrl, type: 'image' })} 
                    />
                  ) : msg.type === 'video' ? (
                    <video 
                      src={msg.fileUrl} 
                      controls 
                      className="max-w-[300px] max-h-[250px] rounded-lg border border-white/5"
                    />
                  ) : msg.type === 'file' ? (
                    <div className="flex items-center gap-3 bg-black/20 p-3 rounded-md">
                      <FileText size={32} className={msg.senderId === user.uid ? "text-white" : "text-indigo-400"} />
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm truncate max-w-[150px]" title={msg.fileName}>{msg.fileName}</span>
                        <a href={msg.fileUrl} download={msg.fileName} className="text-xs opacity-80 hover:underline flex items-center gap-1 mt-1">
                          <Download size={12} /> Herunterladen
                        </a>
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="text-[10px] text-[var(--text-timestamp)] mt-1">
                   {msg.createdAt?.toDate?.().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Field */}
      <div className="p-4 pt-0">
        <div className="bg-[var(--bg-hov)] rounded-lg flex items-center px-4 py-2 relative">
          
          {/* Wrapper für das Menü & den Button (für Click-Outside) */}
          <div ref={attachMenuRef} className="relative flex items-center">
            {/* Attachment Menu Popover */}
            {showAttachMenu && (
              <div className="absolute bottom-12 left-0 bg-[#2b2d31] border border-[#1e1f22] rounded-lg shadow-xl p-2 w-48 z-50 flex flex-col gap-1">
                <button type="button" onClick={() => triggerUpload('image')} className="flex items-center gap-3 px-3 py-2 text-[#b9bbbe] hover:bg-[#4752c4] hover:text-white rounded-md transition-colors">
                  <ImageIcon size={18} /> <span>Bild hochladen</span>
                </button>
                <button type="button" onClick={() => triggerUpload('video')} className="flex items-center gap-3 px-3 py-2 text-[#b9bbbe] hover:bg-[#4752c4] hover:text-white rounded-md transition-colors">
                  <Film size={18} /> <span>Video hochladen</span>
                </button>
                <button type="button" onClick={() => triggerUpload('file')} className="flex items-center gap-3 px-3 py-2 text-[#b9bbbe] hover:bg-[#4752c4] hover:text-white rounded-md transition-colors">
                  <FileText size={18} /> <span>Datei hochladen</span>
                </button>
              </div>
            )}

            <button onClick={() => setShowAttachMenu(!showAttachMenu)} className="text-[var(--text-mut)] hover:text-white p-2">
              <PlusCircle size={24} />
            </button>
          </div>

          {/* Versteckter File-Input */}
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleFileUpload} 
          />

          <form onSubmit={handleSendMessage} className="flex-1 flex items-center ml-2">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`Nachricht an @${activeChat.name}`}
              className="w-full bg-transparent text-white outline-none"
            />
            <button type="submit" disabled={!text.trim()} className="text-[#b9bbbe] hover:text-[#7289da] ml-2"><Send size={20} /></button>
          </form>
        </div>
      </div>
    </div>
  );
}