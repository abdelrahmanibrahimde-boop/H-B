import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export function useCall(currentUserId: string) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'ringing' | 'connected'>('idle');
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isPartnerSpeaking, setIsPartnerSpeaking] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const chatIdRef = useRef<string | null>(null);
  const candidateQueue = useRef<RTCIceCandidateInit[]>([]);
  const isSpeakingRef = useRef(false);

  useEffect(() => {
    if (!currentUserId) return;
    const socket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:5000");
    socketRef.current = socket;
    socket.emit('register', currentUserId);

    socket.on('incoming-call', (data) => {
      console.log("📞 Eingehender Anruf für Chat:", data.chatId);
      setIncomingCall(data);
      setCallStatus('ringing');
    });

    socket.on('signal', async ({ type, data }) => {
      if (type === 'end-call') {
        console.log("🛑 Partner hat aufgelegt");
        stopAll();
      } else if (type === 'answer' && pcRef.current) {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(data));
        setCallStatus('connected');
        candidateQueue.current.forEach(c => pcRef.current?.addIceCandidate(new RTCIceCandidate(c)));
        candidateQueue.current = [];
      } else if (type === 'ice-candidate') {
        if (pcRef.current?.remoteDescription) {
          pcRef.current.addIceCandidate(new RTCIceCandidate(data)).catch(() => {});
        } else {
          candidateQueue.current.push(data);
        }
      }
    });

    socket.on('speech-status', (data) => {
      if (data && data.isSpeaking !== undefined) {
        setIsPartnerSpeaking(data.isSpeaking);
      }
    });

    return () => { socket.disconnect(); };
  }, [currentUserId]);

  // AUTO-TIMEOUT LOGIC (30 Sekunden)
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (callStatus === 'calling' || callStatus === 'ringing') {
      timeout = setTimeout(() => {
        console.log("⏱️ Anruf-Timeout erreicht (30s). Lege auf.");
        // Die ID kann entweder in chatIdRef (Anrufer) oder incomingCall (Angerufener) stecken
        const roomId = chatIdRef.current || incomingCall?.chatId;
        if (roomId) {
          socketRef.current?.emit('signal', { roomId, type: 'end-call' });
        }
        stopAll();
      }, 30000);
    }
    return () => clearTimeout(timeout);
  }, [callStatus, incomingCall]);

  // Timer-Logik für den Anruf
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callStatus === 'connected') {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    
    return () => clearInterval(interval);
  }, [callStatus]);

  // Voice Activity Detection (Sprecherkennung über RMS)
  useEffect(() => {
    if (!localStream) {
      setIsUserSpeaking(false);
      return;
    }

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const microphone = audioContext.createMediaStreamSource(localStream);
    
    analyser.fftSize = 512;
    microphone.connect(analyser);

    const bufferLength = analyser.fftSize;
    const dataArray = new Float32Array(bufferLength);
    let animationFrame: number;

    const checkVolume = () => {
      analyser.getFloatTimeDomainData(dataArray);
      
      let sumSquares = 0;
      for (let i = 0; i < bufferLength; i++) {
        sumSquares += dataArray[i] * dataArray[i];
      }
      
      const rms = Math.sqrt(sumSquares / bufferLength);
      
      // Schwellwert (0.05 ist ein guter Durchschnitt für Sprache)
      const isSpeakingNow = rms > 0.05;
      
      // Nur State aktualisieren und Socket Event senden, wenn sich der Status ändert (spart Traffic)
      if (isSpeakingNow !== isSpeakingRef.current) {
        isSpeakingRef.current = isSpeakingNow;
        setIsUserSpeaking(isSpeakingNow);
        
        if (socketRef.current && chatIdRef.current) {
          socketRef.current.emit('speech-status', { roomId: chatIdRef.current, isSpeaking: isSpeakingNow });
        }
      }
      
      animationFrame = requestAnimationFrame(checkVolume);
    };

    checkVolume();

    return () => {
      cancelAnimationFrame(animationFrame);
      audioContext.close().catch(console.error);
    };
  }, [localStream]);

  const setupPC = (chatId: string) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] }]
    });
    pc.onicecandidate = (e) => {
      if (e.candidate) socketRef.current?.emit('signal', { roomId: chatId, type: 'ice-candidate', data: e.candidate });
    };
    pc.ontrack = (e) => {
      console.log("🎵 Remote Audio empfangen");
      setRemoteStream(e.streams[0]);
    };
    pcRef.current = pc;
    return pc;
  };

  const createCall = async (receiverId: string, callerName?: string) => {
    const chatId = [currentUserId, receiverId].sort().join('_');
    chatIdRef.current = chatId;
    setCallStatus('calling');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      setLocalStream(stream);
      const pc = setupPC(chatId);
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketRef.current?.emit('join-room', chatId);
      socketRef.current?.emit('call-user', { 
        targetId: receiverId, 
        callerId: currentUserId, 
        callerName: callerName || currentUserId, // Name mitsenden
        chatId, 
        offer 
      });
    } catch (e) { stopAll(); }
  };

  const acceptCall = async () => {
    if (!incomingCall) return;
    const { chatId, offer } = incomingCall; // Fix: Benutze chatId statt callId
    chatIdRef.current = chatId;
    
    try {
      socketRef.current?.emit('join-room', chatId);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      setLocalStream(stream);
      const pc = setupPC(chatId);
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socketRef.current?.emit('signal', { roomId: chatId, type: 'answer', data: answer });
      setCallStatus('connected');
    } catch (e) { stopAll(); }
  };

  const stopAll = () => {
    pcRef.current?.close();
    pcRef.current = null;
    localStream?.getTracks().forEach(t => t.stop());
    setLocalStream(null);
    setRemoteStream(null);
    setCallStatus('idle');
    setIncomingCall(null);
    chatIdRef.current = null;
    setIsMuted(false);
    setCallDuration(0);
    setIsPartnerSpeaking(false);
    isSpeakingRef.current = false;
  };

  const endCall = () => {
    if (chatIdRef.current) {
      socketRef.current?.emit('signal', { roomId: chatIdRef.current, type: 'end-call' });
    }
    stopAll();
  };

  const rejectCall = () => {
    // Beim Ablehnen ist chatIdRef ggf. noch nicht gesetzt, wir nutzen die ID aus incomingCall
    const roomId = incomingCall?.chatId || chatIdRef.current;
    if (roomId) {
      socketRef.current?.emit('signal', { roomId, type: 'end-call' });
    }
    stopAll();
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  return { createCall, acceptCall, rejectCall, endCall, localStream, remoteStream, callStatus, incomingCall, isMuted, toggleMute, callDuration, isUserSpeaking, isPartnerSpeaking };
}