import React, { useState, useRef, useEffect } from 'react';
import { Phone, Video, PlusCircle, Image as ImageIcon, FileText, Film, Send, Trash2, Pencil, X, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { listenMessages, sendMessage, deleteMessage, editMessage } from '../lib/chat';
import { useCall } from '../lib/useCall';
import CallOverlay from './CallOverlay';

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

  // 🔥 File Upload & Media State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadType, setUploadType] = useState<'image' | 'video' | 'file'>('image');
  const [fullscreenMedia, setFullscreenMedia] = useState<{ url: string; type: 'image' | 'video' } | null>(null);

  // 🔥 Initialize the WebRTC call hook
  const {
    createCall,
    acceptCall,
    rejectCall,
    endCall,
    localStream,
    remoteStream,
    localStreams,
    remoteStreams,
    incomingCall,
    callStatus,
    isScreenSharing,
    toggleScreenShare,
    isCameraOn,
    toggleCamera,
    remoteUid,
  } = useCall(user.uid);

  // 🔥 Manage Call State for Chat Messages
  const isCallerRef = useRef(false);
  const prevCallStatusRef = useRef(callStatus);
  const callStartTimeRef = useRef<number | null>(null);

  const handleCallClick = () => {
    if (activeChat.isSelf) {
      console.log('Cannot call yourself!');
      return;
    }
    
    // Extract the friend's UID from the composite chat ID (uidA_uidB)
    const friendUid = activeChat.id.split('_').find((id) => id !== user.uid);
    if (friendUid) {
      console.log('Calling UID:', friendUid);
      isCallerRef.current = true;
      createCall(friendUid);
      sendMessage(activeChat.id, user.uid, user.username, "📞 Call started");
    }
  };

  // Detect call transitions to post auto chat messages
  useEffect(() => {
    if (prevCallStatusRef.current === 'calling' && callStatus === 'idle') {
      if (isCallerRef.current) {
        sendMessage(activeChat.id, user.uid, user.username, "📞 Missed call");
      }
      isCallerRef.current = false;
    }
    if (callStatus === 'connected' && prevCallStatusRef.current !== 'connected') {
      callStartTimeRef.current = Date.now();
    }
    if (prevCallStatusRef.current === 'connected' && callStatus === 'idle') {
      if (isCallerRef.current && callStartTimeRef.current) {
        const durationSeconds = Math.floor((Date.now() - callStartTimeRef.current) / 1000);
        const mins = Math.floor(durationSeconds / 60);
        const secs = durationSeconds % 60;
        const formatted = `${mins}:${secs.toString().padStart(2, '0')}`;
        sendMessage(activeChat.id, user.uid, user.username, `📞 Call ended • ${formatted}`);
      }
      callStartTimeRef.current = null;
      isCallerRef.current = false;
    }
    prevCallStatusRef.current = callStatus;
  }, [callStatus, activeChat.id, user.uid, user.username]);

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

  // 🔥 Handle File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Die Datei ist zu groß. Die maximale Größe beträgt 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      await sendMessage(activeChat.id, user.uid, user.username, "", uploadType, base64, file.name);
      setShowAttachMenu(false);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const triggerUpload = (type: 'image' | 'video' | 'file') => {
    setUploadType(type);
    if (fileInputRef.current) {
      if (type === 'image') fileInputRef.current.accept = 'image/*';
      else if (type === 'video') fileInputRef.current.accept = 'video/*';
      else fileInputRef.current.accept = '*/*';
      fileInputRef.current.click();
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[var(--bg)] relative">

      {/* 🔥 Call Overlay */}
      <CallOverlay
        callStatus={callStatus}
        incomingCall={incomingCall}
        acceptCall={acceptCall}
        rejectCall={rejectCall}
        endCall={endCall}
        localStream={localStream}
        remoteStream={remoteStream}
        localStreams={localStreams}
        remoteStreams={remoteStreams}
        currentUser={user}
        activeChat={activeChat}
        isScreenSharing={isScreenSharing}
        toggleScreenShare={toggleScreenShare}
        isCameraOn={isCameraOn}
        toggleCamera={toggleCamera}
        remoteUid={remoteUid}
      />

      {/* Header */}
      <div className="h-14 border-b border-[var(--bg-ter)] flex items-center px-4 shadow-sm z-10 relative">
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
          <span className="font-bold text-[var(--text)] text-lg">
            {activeChat.name}
          </span>
        </div>

        <div className="flex-1 flex justify-end items-center gap-4 text-[var(--text-mut)]">
          <button onClick={handleCallClick} className="hover:text-[var(--text)] transition-colors" title="Start Voice Call">
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
              <div className="text-xs text-[var(--text-timestamp)] mb-1">
                {msg.senderUsername || msg.senderId}
              </div>

                <div className={`flex items-center gap-2 ${msg.senderId === user.uid ? "flex-row-reverse" : "flex-row"}`}>
                {editingMessageId === msg.id ? (
                  <div className="flex flex-col gap-1 min-w-[200px]">
                    <input
                      type="text"
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="bg-[var(--bg-sec)] text-[var(--text)] px-3 py-2 rounded-lg outline-none border border-[#7289da] w-full text-sm"
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
                        ? "bg-transparent border border-[var(--bg-hov)] text-[var(--text-timestamp)] italic"
                        : msg.type === 'image' || msg.type === 'video'
                        ? "bg-transparent px-0 py-0"
                        : msg.senderId === user.uid
                        ? "bg-[#5865f2] text-white"
                        : "bg-[var(--bg-sec)] text-[var(--text)]"
                    }`}
                  >
                    {msg.deleted ? (
                      "Diese Nachricht wurde gelöscht."
                    ) : msg.type === 'image' ? (
                      <img 
                        src={msg.fileUrl} 
                        alt="attachment" 
                        className="max-w-[300px] max-h-[300px] object-cover cursor-pointer hover:opacity-90 transition-opacity rounded-lg border border-[#202225]"
                        onClick={() => setFullscreenMedia({ url: msg.fileUrl, type: 'image' })}
                      />
                    ) : msg.type === 'video' ? (
                      <video 
                        src={msg.fileUrl} 
                        controls
                        className="max-w-[300px] max-h-[300px] rounded-lg border border-[#202225] bg-black cursor-pointer"
                        onDoubleClick={() => setFullscreenMedia({ url: msg.fileUrl, type: 'video' })}
                      />
                    ) : msg.type === 'file' ? (
                      <div className="flex items-center gap-3 bg-[var(--bg-sec)] p-3 rounded-lg border border-[var(--bg-ter)] min-w-[250px]">
                        <div className="p-2 bg-[var(--bg-hov)] rounded">
                          <FileText size={24} className="text-[var(--text-mut)]" />
                        </div>
                        <div className="flex flex-col flex-1 overflow-hidden">
                          <span className="text-sm font-medium text-[var(--text)] truncate" title={msg.fileName}>{msg.fileName || "File"}</span>
                          <a href={msg.fileUrl} download={msg.fileName} className="text-[#00aff4] hover:underline text-xs flex items-center gap-1 mt-1">
                            <Download size={12} /> Herunterladen
                          </a>
                        </div>
                      </div>
                    ) : (
                      msg.text
                    )}
                    {msg.edited && !msg.deleted && (
                      <span className="text-[10px] opacity-70 ml-2">(bearbeitet)</span>
                    )}
                  </div>
                )}
                
                {msg.senderId === user.uid && !msg.deleted && editingMessageId !== msg.id && (
                  <div className="flex opacity-0 group-hover:opacity-100 transition-all gap-1">
                    <button 
                      onClick={() => { setEditingMessageId(msg.id); setEditContent(msg.text); }}
                      className="p-1.5 text-[var(--text-mut)] hover:bg-[var(--bg-sec)] rounded"
                      title="Nachricht bearbeiten"
                    >
                      <Pencil size={16} />
                    </button>
                    <button 
                      onClick={() => setMessageToDelete(msg.id)}
                      className="p-1.5 text-[#ed4245] hover:bg-[var(--bg-sec)] rounded"
                      title="Nachricht löschen"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
              <div className="text-[10px] text-[var(--text-timestamp)] mt-1 px-1 min-h-[15px]">
                {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : ''}
              </div>
              </div>
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 pt-0">
        <div className="bg-[var(--bg-hov)] rounded-lg flex items-center px-4 py-2 relative">

          {/* Attach */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowAttachMenu((prev) => !prev)}
              className="text-[var(--text-mut)] hover:text-[var(--text)] transition-colors p-2 -ml-2 rounded-full hover:bg-[var(--bg)]"
            >
              <PlusCircle size={24} />
            </button>

            {showAttachMenu && (
              <div className="absolute bottom-full left-0 mb-2 w-48 bg-[var(--bg-sec)] rounded-md shadow-lg border border-[var(--bg-ter)] py-2 z-20">
                <button onClick={() => triggerUpload('image')} className="w-full flex items-center gap-3 px-4 py-2 text-[var(--text-mut)] hover:bg-[var(--bg-hov)] hover:text-[var(--text)] transition-colors">
                  <ImageIcon size={18} className="text-green-400" />
                  <span>Upload Image</span>
                </button>
                <button onClick={() => triggerUpload('video')} className="w-full flex items-center gap-3 px-4 py-2 text-[var(--text-mut)] hover:bg-[var(--bg-hov)] hover:text-[var(--text)] transition-colors">
                  <Film size={18} className="text-blue-400" />
                  <span>Upload Video</span>
                </button>
                <button onClick={() => triggerUpload('file')} className="w-full flex items-center gap-3 px-4 py-2 text-[var(--text-mut)] hover:bg-[var(--bg-hov)] hover:text-[var(--text)] transition-colors">
                  <FileText size={18} className="text-yellow-400" />
                  <span>Upload File</span>
                </button>
              </div>
            )}
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
          </div>

          {/* Input */}
          <form onSubmit={handleSendMessage} className="flex-1 flex items-center ml-2">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`Message @${activeChat.name}`}
              className="w-full bg-transparent text-[var(--text)] outline-none placeholder-[var(--text-timestamp)]"
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

      {/* Fullscreen Media Modal */}
      {fullscreenMedia && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-4" onClick={() => setFullscreenMedia(null)}>
          <button 
            className="absolute top-6 right-6 text-[#b9bbbe] hover:text-white transition-colors p-2 bg-black/50 rounded-full"
            onClick={() => setFullscreenMedia(null)}
          >
            <X size={32} />
          </button>
          {fullscreenMedia.type === 'image' ? (
            <img src={fullscreenMedia.url} className="max-w-full max-h-full object-contain" onClick={e => e.stopPropagation()} alt="Fullscreen" />
          ) : (
            <video src={fullscreenMedia.url} controls autoPlay className="max-w-full max-h-full" onClick={e => e.stopPropagation()} />
          )}
        </div>
      )}
    </div>
  );
}