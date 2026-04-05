import React, { useEffect, useRef } from 'react';
import { Phone, PhoneOff, Mic, MicOff } from 'lucide-react';

export default function CallOverlay({ callStatus, incomingCall, acceptCall, rejectCall, endCall, activeChat, remoteStream, isMuted, toggleMute, callDuration, currentUser, isUserSpeaking, isPartnerSpeaking }: any) {
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.play().catch(err => {
        console.error("Autoplay wurde blockiert:", err);
        // Optional: Zeige dem Nutzer einen Button "Ton aktivieren"
      });
    }
  }, [remoteStream]);

  if (callStatus === 'idle') return null;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // FIX: Wenn wir angerufen werden, priorisiere den Namen aus dem eingehenden Anruf
  const isIncoming = callStatus === 'ringing' && incomingCall;
  const displayName = isIncoming ? (incomingCall.callerName || incomingCall.callerId || "Unbekannt") : (activeChat?.name || "Anruf...");
  const avatarRing = callStatus === 'connected' ? 'ring-2 ring-green-500 animate-pulse' : '';

  // Vollbild-Overlay für eingehende Anrufe (Ringing)
  if (callStatus === 'ringing') {
    return (
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[999] backdrop-blur-md">
        <audio ref={remoteAudioRef} autoPlay playsInline controls={false} />
        <div className="bg-[#2f3136] p-10 rounded-3xl shadow-2xl flex flex-col items-center w-80 border border-white/10">
          <div className="w-24 h-24 rounded-full bg-[#4f545c] flex items-center justify-center text-white text-4xl font-bold mb-6 shadow-xl">
            {activeChat?.photoURL && activeChat?.name === displayName ? <img src={activeChat.photoURL} className="w-full h-full object-cover" alt="avatar" /> : displayName[0]?.toUpperCase()}
          </div>
          <h2 className="text-white text-2xl font-bold mb-1">{displayName}</h2>
          <p className="text-indigo-300 text-sm mb-10 uppercase tracking-widest animate-pulse">ruft an...</p>
          <div className="flex gap-10">
            <button onClick={acceptCall} className="bg-[#3ba55c] p-5 rounded-full text-white hover:scale-110 transition-transform shadow-lg"><Phone size={32} /></button>
            <button onClick={rejectCall} className="bg-[#ed4245] p-5 rounded-full text-white hover:scale-110 transition-transform shadow-lg"><PhoneOff size={32} /></button>
          </div>
        </div>
      </div>
    );
  }

  // Dynamische Ringe für Sprech-Erkennung
  const localAvatarRing = isUserSpeaking && !isMuted ? 'ring-4 ring-[#3ba55c] shadow-[0_0_15px_rgba(59,165,92,0.4)]' : 'ring-2 ring-transparent';
  const remoteAvatarRing = isPartnerSpeaking ? 'ring-4 ring-[#3ba55c] shadow-[0_0_15px_rgba(59,165,92,0.4)]' : 'ring-2 ring-transparent';

  // Schmaler Header im Chat für "calling" und "connected"
  return (
    <div className="w-full bg-[#202225] border-b border-[#1e1f22] py-6 flex flex-col items-center justify-center z-20 shrink-0 shadow-md gap-6">
      <audio ref={remoteAudioRef} autoPlay playsInline controls={false} />
      
      {/* Avatare zentriert nebeneinander */}
      <div className="flex items-center justify-center gap-2">
        {/* Eigener Avatar */}
        <div className="flex flex-col items-center gap-2">
          <div className={`w-24 h-24 rounded-full bg-[#4f545c] flex items-center justify-center text-white text-3xl font-bold overflow-hidden transition-all duration-150 ${localAvatarRing}`}>
            {currentUser?.photoURL ? <img src={currentUser.photoURL} alt="Du" className="w-full h-full object-cover" /> : currentUser?.username?.[0]?.toUpperCase() || 'D'}
          </div>
          <span className="text-[#b9bbbe] text-sm font-bold">{currentUser?.username || 'Du'}</span>
        </div>

        {/* Partner Avatar */}
        <div className="flex flex-col items-center gap-2">
          <div className={`w-24 h-24 rounded-full bg-[#4f545c] flex items-center justify-center text-white text-3xl font-bold overflow-hidden transition-all duration-300 ${remoteAvatarRing}`}>
            {activeChat?.photoURL ? <img src={activeChat.photoURL} alt={displayName} className="w-full h-full object-cover" /> : displayName?.[0]?.toUpperCase()}
          </div>
          <span className="text-[#b9bbbe] text-sm font-bold">{displayName}</span>
        </div>
      </div>

      {/* Timer & Controls darunter */}
      <div className="flex items-center gap-6">
        <div className="text-white font-mono text-lg font-bold min-w-[70px] text-center bg-black/20 px-3 py-1 rounded-md shadow-inner">
          {callStatus === 'connected' ? formatTime(callDuration) : 'Wählt...'}
        </div>
        <div className="flex items-center gap-4">
          {callStatus === 'connected' && (
            <button onClick={toggleMute} className={`${isMuted ? 'bg-[#ed4245] hover:bg-[#c13b3e]' : 'bg-[#4f545c] hover:bg-[#686d73]'} p-4 rounded-full text-white transition-colors shadow-lg`} title="Stummschalten">
              {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
            </button>
          )}
          <button onClick={endCall} className="bg-[#ed4245] hover:bg-[#c13b3e] p-4 rounded-full text-white transition-colors shadow-lg" title="Auflegen">
            <PhoneOff size={24} />
          </button>
        </div>
      </div>
    </div>
  );
}