import React, { useEffect, useRef, useState } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Headphones, Video, MonitorUp, Minimize2, Maximize2, Maximize } from 'lucide-react';

interface CallOverlayProps {
  callStatus: 'idle' | 'calling' | 'ringing' | 'connected';
  incomingCall: { callId: string; callerId: string } | null;
  acceptCall: (callId: string) => void;
  rejectCall: (callId: string) => void;
  endCall: () => void;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  localStreams: { camera: MediaStream | null, screen: MediaStream | null };
  remoteStreams: { camera: MediaStream | null, screen: MediaStream | null };
  currentUser: any;
  activeChat: any;
  isScreenSharing: boolean;
  toggleScreenShare: () => void;
  isCameraOn: boolean;
  toggleCamera: () => void;
}

export default function CallOverlay({
  callStatus,
  incomingCall,
  acceptCall,
  rejectCall,
  endCall,
  localStream,
  remoteStream,
  localStreams,
  remoteStreams,
  currentUser,
  activeChat,
  isScreenSharing,
  toggleScreenShare,
  isCameraOn,
  toggleCamera,
}: CallOverlayProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const localAvatarRef = useRef<HTMLDivElement>(null);
  const remoteAvatarRef = useRef<HTMLDivElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteScreenRef = useRef<HTMLVideoElement>(null);
  const localScreenRef = useRef<HTMLVideoElement>(null);

  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);

  const isMutedRef = useRef(isMuted);
  const isDeafenedRef = useRef(isDeafened);

  // Prevent duplicating the current user if calling oneself
  const currentUserId = currentUser.uid;
  const remoteUserId = activeChat.members?.find((id: string) => id !== currentUserId) || activeChat.id.split("_").find((id: string) => id !== currentUserId);
  const displayRemoteName = activeChat.userData?.[remoteUserId]?.username || activeChat.name || "Remote User";
  const displayRemotePhoto = activeChat.userData?.[remoteUserId]?.photoURL || activeChat.photoURL || null;

  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  useEffect(() => { isDeafenedRef.current = isDeafened; }, [isDeafened]);

  // Call Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callStatus === 'connected') {
      interval = setInterval(() => setDuration((d) => d + 1), 1000);
    } else {
      setDuration(0);
    }
    return () => clearInterval(interval);
  }, [callStatus]);

  // Voice Activity Analyzer
  useEffect(() => {
    if (callStatus !== 'connected') return;

    let localReq: number, remoteReq: number;
    let localCtx: AudioContext | null = null;
    let remoteCtx: AudioContext | null = null;

    const setupStream = (stream: MediaStream, avatarRef: React.RefObject<HTMLDivElement>, isLocal: boolean) => {
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (stream.getAudioTracks().length === 0) return ctx;

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        const source = ctx.createMediaStreamSource(stream);
        source.connect(analyser);
        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const update = () => {
          analyser.getByteFrequencyData(dataArray);
          const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          const forceOff = isLocal ? isMutedRef.current : isDeafenedRef.current;

          if (avatarRef.current) {
            if (avg > 10 && !forceOff) {
              avatarRef.current.classList.add('ring-4', 'ring-[#3ba55c]', 'shadow-[0_0_15px_rgba(59,165,92,0.5)]');
            } else {
              avatarRef.current.classList.remove('ring-4', 'ring-[#3ba55c]', 'shadow-[0_0_15px_rgba(59,165,92,0.5)]');
            }
          }
          if (isLocal) localReq = requestAnimationFrame(update);
          else remoteReq = requestAnimationFrame(update);
        };
        update();
        return ctx;
      } catch (e) {
        console.error("Audio analyser error:", e);
        return null;
      }
    };

    if (localStream) localCtx = setupStream(localStream, localAvatarRef, true);
    if (remoteStream) remoteCtx = setupStream(remoteStream, remoteAvatarRef, false);

    return () => {
      if (localReq) cancelAnimationFrame(localReq);
      if (remoteReq) cancelAnimationFrame(remoteReq);
      if (localCtx) localCtx.close();
      if (remoteCtx) remoteCtx.close();
    };
  }, [callStatus, localStream, remoteStream]);

  useEffect(() => {
    if (!audioRef.current) return;

    audioRef.current.srcObject = remoteStream;
    audioRef.current.play().catch(() => {});
  }, [remoteStream]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isDeafened;
    }
  }, [isDeafened]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStreams.camera) {
      remoteVideoRef.current.srcObject = remoteStreams.camera;
    }
  }, [remoteStreams.camera]);

  useEffect(() => {
    if (remoteScreenRef.current && remoteStreams.screen) {
      remoteScreenRef.current.srcObject = remoteStreams.screen;
    }
  }, [remoteStreams.screen]);

  useEffect(() => {
    if (localVideoRef.current && localStreams.camera) {
      localVideoRef.current.srcObject = localStreams.camera;
    }
  }, [localStreams.camera]);

  useEffect(() => {
    if (localScreenRef.current && localStreams.screen) {
      localScreenRef.current.srcObject = localStreams.screen;
    }
  }, [localStreams.screen]);

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleDeafen = () => {
    setIsDeafened(!isDeafened);
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const toggleFullscreen = (ref: React.RefObject<HTMLVideoElement>) => {
    if (!document.fullscreenElement) {
      ref.current?.requestFullscreen().catch(err => console.error(err));
    } else {
      document.exitFullscreen().catch(err => console.error(err));
    }
  };

  useEffect(() => {
    if (callStatus === 'idle') {
      setIsMinimized(false);
    }
  }, [callStatus]);

  if (callStatus === 'idle' && !incomingCall) return null;

  return (
    <>
      <div className={`absolute inset-0 bg-[#1e1f22] z-50 flex flex-col transition-opacity duration-200 ${isMinimized ? 'opacity-0 pointer-events-none hidden' : 'opacity-100'}`}>
        {/* Remote Audio */}
        <audio ref={audioRef} autoPlay playsInline className="hidden" />

        {/* 1. Header Bar */}
        <div className="h-16 bg-[#2b2d31] flex items-center justify-between px-6 border-b border-[#1e1f22] shadow-sm shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex -space-x-3">
              <div className="w-8 h-8 rounded-full border-2 border-[#2b2d31] bg-[#4f545c] flex items-center justify-center text-white text-xs overflow-hidden z-10">
                {currentUser.photoURL ? <img src={currentUser.photoURL} className="w-full h-full object-cover" /> : currentUser.username[0]?.toUpperCase()}
              </div>
              <div className="w-8 h-8 rounded-full border-2 border-[#2b2d31] bg-[#4f545c] flex items-center justify-center text-white text-xs overflow-hidden">
                {displayRemotePhoto ? <img src={displayRemotePhoto} className="w-full h-full object-cover" /> : displayRemoteName[0]?.toUpperCase()}
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-white font-bold text-sm">{displayRemoteName}</span>
              <span className="text-[#b9bbbe] text-xs capitalize">{callStatus === 'connected' ? 'In Call' : callStatus}</span>
            </div>
          </div>
          <button onClick={() => setIsMinimized(true)} className="bg-[#1e1f22] hover:bg-[#40444b] text-[#b9bbbe] hover:text-white p-2 rounded-full transition-colors" title="Back to Chat">
            <Minimize2 size={20} />
          </button>
        </div>

      {/* 2. Center UI */}
      <div className="flex-1 flex flex-col items-center justify-center bg-[#1e1f22] p-8 w-full">
        
        {/* Screen Share Area */}
        {(localStreams.screen || remoteStreams.screen) && (
          <div className="flex gap-6 justify-center items-center w-full max-w-[1100px] mb-8">
            {remoteStreams.screen && (
              <div className="relative group flex-1 aspect-video">
                <video ref={remoteScreenRef} onDoubleClick={() => toggleFullscreen(remoteScreenRef)} autoPlay playsInline className="w-full h-full bg-black rounded-lg object-cover border border-[#2b2d31] shadow-lg cursor-pointer" />
                <span className="absolute bottom-3 left-3 bg-black/70 text-white text-xs px-2 py-1 rounded">{displayRemoteName}'s Bildschirm</span>
                <button onClick={() => toggleFullscreen(remoteScreenRef)} className="absolute top-3 right-3 bg-black/70 hover:bg-black/90 text-[#b9bbbe] hover:text-white p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10" title="Fullscreen">
                  <Maximize size={16} />
                </button>
              </div>
            )}
            
            {localStreams.screen && (
              <div className="relative w-[280px] aspect-video shrink-0">
                <video ref={localScreenRef} autoPlay playsInline muted className="w-full h-full bg-black rounded-lg object-cover shadow-lg" />
                <span className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] px-2 py-1 rounded">Preview</span>
                <button onClick={() => toggleFullscreen(localScreenRef)} className="absolute top-2 right-2 bg-black/70 hover:bg-black/90 text-[#b9bbbe] hover:text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10" title="Fullscreen">
                  <Maximize size={14} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Users Row */}
        <div className="flex flex-row items-center gap-16 mb-8">
          
          {/* Local User */}
          <div className="flex flex-col items-center gap-4">
            {localStreams.camera ? (
              <div className="relative group">
                <video ref={localVideoRef} onDoubleClick={() => toggleFullscreen(localVideoRef)} autoPlay playsInline muted className="w-64 aspect-video bg-black rounded-lg object-cover border border-[#2b2d31] shadow-lg cursor-pointer" />
                <button onClick={() => toggleFullscreen(localVideoRef)} className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-[#b9bbbe] hover:text-white p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10" title="Fullscreen">
                  <Maximize size={16} />
                </button>
                {isMuted && (
                  <div className="absolute bottom-2 right-2 bg-[#ed4245] p-1.5 rounded-full border-2 border-[#2b2d31]">
                    <MicOff size={14} className="text-white" />
                  </div>
                )}
              </div>
            ) : (
              <div ref={localAvatarRef} className="w-32 h-32 rounded-full bg-[#2b2d31] flex items-center justify-center text-white text-5xl overflow-hidden transition-all duration-150 relative">
                {currentUser.photoURL ? <img src={currentUser.photoURL} className="w-full h-full object-cover" /> : currentUser.username[0]?.toUpperCase()}
                {isMuted && (
                  <div className="absolute bottom-1 right-1 bg-[#ed4245] p-1.5 rounded-full border-2 border-[#2b2d31]">
                    <MicOff size={14} className="text-white" />
                  </div>
                )}
              </div>
            )}
            <span className="text-white font-medium text-lg">{currentUser.username}</span>
          </div>

          {/* Remote User */}
          <div className="flex flex-col items-center gap-4">
            {remoteStreams.camera ? (
              <div className="relative group">
                <video ref={remoteVideoRef} onDoubleClick={() => toggleFullscreen(remoteVideoRef)} autoPlay playsInline className="w-64 aspect-video bg-black rounded-lg object-cover border border-[#2b2d31] shadow-lg cursor-pointer" />
                <button onClick={() => toggleFullscreen(remoteVideoRef)} className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-[#b9bbbe] hover:text-white p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10" title="Fullscreen">
                  <Maximize size={16} />
                </button>
                {isDeafened && (
                  <div className="absolute bottom-2 right-2 bg-[#ed4245] p-1.5 rounded-full border-2 border-[#2b2d31]">
                    <Headphones size={14} className="text-white" />
                  </div>
                )}
              </div>
            ) : (
              <div ref={remoteAvatarRef} className="w-32 h-32 rounded-full bg-[#2b2d31] flex items-center justify-center text-white text-5xl overflow-hidden transition-all duration-150 relative">
                {displayRemotePhoto ? <img src={displayRemotePhoto} className="w-full h-full object-cover" /> : displayRemoteName[0]?.toUpperCase()}
                {isDeafened && (
                  <div className="absolute bottom-1 right-1 bg-[#ed4245] p-1.5 rounded-full border-2 border-[#2b2d31]">
                    <Headphones size={14} className="text-white" />
                  </div>
                )}
              </div>
            )}
            <span className="text-white font-medium text-lg">{displayRemoteName}</span>
          </div>
        </div>

        <div className="text-[#b9bbbe] text-xl font-medium tracking-wide">
          {callStatus === 'connected' ? formatDuration(duration) : callStatus === 'ringing' ? 'Incoming Call...' : 'Calling...'}
        </div>
      </div>

      {/* 3. Controls Bottom */}
      <div className="h-24 bg-[#2b2d31] flex items-center justify-center gap-4 shrink-0 px-6">
        {incomingCall && callStatus === 'ringing' ? (
          <>
            <button onClick={() => acceptCall(incomingCall.callId)} className="bg-[#3ba55c] hover:bg-[#2d7d46] text-white p-4 rounded-full transition-colors shadow-lg" title="Accept">
              <Phone size={24} />
            </button>
            <button onClick={() => rejectCall(incomingCall.callId)} className="bg-[#ed4245] hover:bg-[#c13b3e] text-white p-4 rounded-full transition-colors shadow-lg" title="Reject">
              <PhoneOff size={24} />
            </button>
          </>
        ) : (
          <>
            <button 
              onClick={toggleCamera} 
              className={`${isCameraOn ? 'bg-[#ed4245] text-white hover:bg-[#c13b3e]' : 'bg-[#1e1f22] text-[#b9bbbe] hover:text-white hover:bg-[#40444b]'} p-4 rounded-full transition-colors`} 
              title={isCameraOn ? "Turn off Camera" : "Turn on Camera"}
            >
              <Video size={24} />
            </button>
            <button 
              onClick={toggleScreenShare} 
              className={`${isScreenSharing ? 'bg-[#ed4245] text-white hover:bg-[#c13b3e]' : 'bg-[#1e1f22] text-[#b9bbbe] hover:text-white hover:bg-[#40444b]'} p-4 rounded-full transition-colors`} 
              title={isScreenSharing ? "Stop Screen Share" : "Share Screen"}
            >
              <MonitorUp size={24} />
            </button>
            <button
              onClick={toggleMute}
              className={`${isMuted ? 'bg-[#ed4245] text-white hover:bg-[#c13b3e]' : 'bg-[#1e1f22] text-[#b9bbbe] hover:text-white hover:bg-[#40444b]'} p-4 rounded-full transition-colors`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
            </button>
            <button
              onClick={toggleDeafen}
              className={`${isDeafened ? 'bg-[#ed4245] text-white hover:bg-[#c13b3e]' : 'bg-[#1e1f22] text-[#b9bbbe] hover:text-white hover:bg-[#40444b]'} p-4 rounded-full transition-colors`}
              title={isDeafened ? 'Undeafen' : 'Deafen'}
            >
              <Headphones size={24} />
            </button>
            <button onClick={endCall} className="bg-[#ed4245] hover:bg-[#c13b3e] text-white p-4 rounded-full transition-colors shadow-lg ml-4" title="Disconnect">
              <PhoneOff size={24} />
            </button>
          </>
        )}
      </div>
    </div>

    {/* Minimized Call Bar */}
    {isMinimized && (
      <div className="absolute top-14 left-0 right-0 h-14 bg-[#2b2d31] border-b border-[#1e1f22] z-40 flex items-center justify-between px-4 shadow-md animate-in slide-in-from-top-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full border border-[#1e1f22] bg-[#4f545c] flex items-center justify-center text-white text-xs overflow-hidden">
              {displayRemotePhoto ? <img src={displayRemotePhoto} className="w-full h-full object-cover" /> : displayRemoteName[0]?.toUpperCase()}
          </div>
          <div className="flex flex-col">
              <span className="text-white text-sm font-bold leading-tight">{displayRemoteName}</span>
            <span className="text-[#3ba55c] text-xs font-medium leading-tight">
              {callStatus === 'connected' ? `Connected • ${formatDuration(duration)}` : callStatus === 'ringing' ? 'Incoming...' : 'Calling...'}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {incomingCall && callStatus === 'ringing' ? (
            <>
              <button onClick={() => acceptCall(incomingCall.callId)} className="bg-[#3ba55c] hover:bg-[#2d7d46] text-white p-2 rounded-full transition-colors shadow-sm" title="Accept">
                <Phone size={16} />
              </button>
              <button onClick={() => rejectCall(incomingCall.callId)} className="bg-[#ed4245] hover:bg-[#c13b3e] text-white p-2 rounded-full transition-colors shadow-sm" title="Reject">
                <PhoneOff size={16} />
              </button>
            </>
          ) : (
            <>
              <button onClick={toggleMute} className={`${isMuted ? 'bg-[#ed4245] text-white' : 'bg-[#1e1f22] text-[#b9bbbe] hover:text-white'} p-2 rounded-full transition-colors shadow-sm`} title={isMuted ? 'Unmute' : 'Mute'}>
                {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
              <button onClick={endCall} className="bg-[#ed4245] hover:bg-[#c13b3e] text-white p-2 rounded-full transition-colors shadow-sm" title="Disconnect">
                <PhoneOff size={16} />
              </button>
            </>
          )}
          <div className="w-px h-6 bg-[#4f545c] mx-1"></div>
          <button onClick={() => setIsMinimized(false)} className="bg-[#1e1f22] hover:bg-[#40444b] text-[#b9bbbe] hover:text-white p-2 rounded-full transition-colors shadow-sm" title="Expand">
            <Maximize2 size={16} />
          </button>
        </div>
      </div>
    )}
    </>
  );
}