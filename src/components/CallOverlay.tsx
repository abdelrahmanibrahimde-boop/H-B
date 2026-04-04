import React, { useEffect, useRef, useState } from 'react';
import { Phone, PhoneOff, Mic, MicOff } from 'lucide-react';

interface CallOverlayProps {
  callStatus: 'idle' | 'calling' | 'ringing' | 'connected';
  incomingCall: { callId: string; callerId: string } | null;
  acceptCall: (callId: string) => void;
  rejectCall: (callId: string) => void;
  endCall: () => void;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
}

export default function CallOverlay({
  callStatus,
  incomingCall,
  acceptCall,
  rejectCall,
  endCall,
  localStream,
  remoteStream,
}: CallOverlayProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isMuted, setIsMuted] = useState(false);

  // Play the remote stream when connected
  useEffect(() => {
    if (audioRef.current && remoteStream) {
      audioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  if (callStatus === 'idle' && !incomingCall) return null;

  return (
    <div className="fixed top-4 right-4 bg-[#2f3136] border border-[#202225] shadow-xl rounded-lg p-4 z-50 w-72 flex flex-col gap-4 text-white">
      {/* Remote Audio */}
      <audio ref={audioRef} autoPlay className="hidden" />

      <div className="text-center">
        <h3 className="text-lg font-bold">
          {incomingCall ? 'Incoming Call' : 'Active Call'}
        </h3>
        <p className="text-sm text-[#b9bbbe] capitalize">{callStatus}</p>
      </div>

      <div className="flex justify-center gap-4 mt-2">
        {incomingCall ? (
          <>
            <button
              onClick={() => acceptCall(incomingCall.callId)}
              className="bg-[#3ba55c] hover:bg-[#2d7d46] p-3 rounded-full transition-colors"
              title="Accept"
            >
              <Phone size={20} />
            </button>
            <button
              onClick={() => rejectCall(incomingCall.callId)}
              className="bg-[#ed4245] hover:bg-[#c13b3e] p-3 rounded-full transition-colors"
              title="Reject"
            >
              <PhoneOff size={20} />
            </button>
          </>
        ) : (
          <>
            {callStatus === 'connected' && (
              <button
                onClick={toggleMute}
                className={`${isMuted ? 'bg-[#ed4245]' : 'bg-[#4f545c]'} hover:opacity-80 p-3 rounded-full transition-colors`}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
            )}
            <button
              onClick={endCall}
              className="bg-[#ed4245] hover:bg-[#c13b3e] p-3 rounded-full transition-colors"
              title="End Call"
            >
              <PhoneOff size={20} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}