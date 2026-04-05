import React, { useEffect, useRef, useState } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Volume2 } from 'lucide-react';

export default function CallOverlay({ 
  callStatus, incomingCall, acceptCall, rejectCall, endCall, 
  activeChat, remoteStream, isMuted, toggleMute, callDuration, 
  currentUser, isUserSpeaking, isPartnerSpeaking 
}: any) {
  
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  useEffect(() => {
    // Wenn ein Stream da ist, dem Audio-Element zuweisen
    if (remoteAudioRef.current && remoteStream) {
      console.log("🎵 Remote Stream wird zugewiesen...", remoteStream.getAudioTracks());
      remoteAudioRef.current.srcObject = remoteStream;
      
      // Expliziter Play-Befehl
      remoteAudioRef.current.play()
        .then(() => {
          console.log("✅ Audio spielt erfolgreich ab");
          setAutoplayBlocked(false);
        })
        .catch(err => {
          console.error("❌ Autoplay vom Browser blockiert:", err);
          setAutoplayBlocked(true); // Zeigt dem Nutzer einen Button zum Aktivieren
        });
    }
  }, [remoteStream, callStatus]);

  if (callStatus === 'idle') return null;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isIncoming = callStatus === 'ringing' && incomingCall;
  const displayName = isIncoming 
    ? (incomingCall.callerName || "Unbekannt") 
    : (activeChat?.name || "Anruf...");

  // Einziges Audio-Element, das den Ton wiedergibt
  const RemoteAudio = (
    <audio 
      ref={remoteAudioRef} 
      autoPlay 
      playsInline 
      className="hidden" 
    />
  );

  // --- UI: Eingehender Anruf ---
  if (callStatus === 'ringing') {
    return (
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[999] backdrop-blur-md">
        {RemoteAudio}
        <div className="bg-[#2f3136] p-10 rounded-3xl shadow-2xl flex flex-col items-center w-80 border border-white/10">
          <div className="w-24 h-24 rounded-full bg-[#4f545c] flex items-center justify-center text-white text-4xl font-bold mb-6 shadow-xl overflow-hidden">
            {activeChat?.photoURL ? <img src={activeChat.photoURL} className="w-full h-full object-cover" alt="avatar" /> : displayName[0]?.toUpperCase()}
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

  // --- UI: Während des Telefonats ---
  const localAvatarRing = isUserSpeaking && !isMuted ? 'ring-4 ring-[#3ba55c] shadow-[0_0_15px_rgba(59,165,92,0.4)]' : 'ring-2 ring-transparent';
  const remoteAvatarRing = isPartnerSpeaking ? 'ring-4 ring-[#3ba55c] shadow-[0_0_15px_rgba(59,165,92,0.4)]' : 'ring-2 ring-transparent';

  return (
    <div className="w-full bg-[#202225] border-b border-[#1e1f22] py-6 flex flex-col items-center justify-center z-20 shrink-0 shadow-md gap-6">
      {RemoteAudio}

      {/* Notfall-Button falls Autoplay blockiert wurde */}
      {autoplayBlocked && (
        <button 
          onClick={() => remoteAudioRef.current?.play()}
          className="bg-yellow-500 text-black px-4 py-2 rounded-full font-bold flex items-center gap-2 animate-bounce"
        >
          <Volume2 size={20} /> Ton aktivieren
        </button>
      )}
      
      <div className="flex items-center justify-center gap-12">
        {/* Eigener Avatar */}
        <div className="flex flex-col items-center gap-2">
          <div className={`w-20 h-20 rounded-full bg-[#4f545c] flex items-center justify-center text-white text-2xl font-bold overflow-hidden transition-all duration-150 ${localAvatarRing}`}>
            {currentUser?.photoURL ? <img src={currentUser.photoURL} alt="Du" className="w-full h-full object-cover" /> : currentUser?.username?.[0]?.toUpperCase()}
          </div>
          <span className="text-[#b9bbbe] text-xs font-bold uppercase tracking-wider">Du</span>
        </div>

        <div className="flex flex-col items-center gap-2">
           <div className="bg-black/40 px-4 py-1 rounded-full text-white font-mono text-sm border border-white/5">
             {callStatus === 'connected' ? formatTime(callDuration) : 'Verbinde...'}
           </div>
           <div className="h-[2px] w-12 bg-white/10"></div>
        </div>

        {/* Partner Avatar */}
        <div className="flex flex-col items-center gap-2">
          <div className={`w-20 h-20 rounded-full bg-[#4f545c] flex items-center justify-center text-white text-2xl font-bold overflow-hidden transition-all duration-300 ${remoteAvatarRing}`}>
            {activeChat?.photoURL ? <img src={activeChat.photoURL} alt={displayName} className="w-full h-full object-cover" /> : displayName?.[0]?.toUpperCase()}
          </div>
          <span className="text-[#b9bbbe] text-xs font-bold uppercase tracking-wider">{displayName}</span>
        </div>
      </div>

      {/* Steuerung */}
      <div className="flex items-center gap-4">
        {callStatus === 'connected' && (
          <button onClick={toggleMute} className={`${isMuted ? 'bg-[#ed4245]' : 'bg-[#4f545c]'} p-4 rounded-full text-white hover:opacity-80 transition-all shadow-lg`}>
            {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
          </button>
        )}
        <button onClick={endCall} className="bg-[#ed4245] p-4 rounded-full text-white hover:scale-105 transition-all shadow-lg">
          <PhoneOff size={24} />
        </button>
      </div>
    </div>
  );
}