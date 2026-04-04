import { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, doc, setDoc, updateDoc, onSnapshot, addDoc, getDoc, query, where, DocumentReference, DocumentData } from 'firebase/firestore';

const servers = {
  iceServers: [
    {
      urls: ['stun:stun.l.google.com:19302'],
    },
  ],
};

export function useCall(currentUserId: string, onIncomingCall?: (callId: string, callerId: string) => void) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [localStreams, setLocalStreams] = useState<{ camera: MediaStream | null, screen: MediaStream | null }>({ camera: null, screen: null });
  const [remoteStreams, setRemoteStreams] = useState<{ camera: MediaStream | null, screen: MediaStream | null }>({ camera: null, screen: null });
  const [incomingCall, setIncomingCall] = useState<{ callId: string; callerId: string } | null>(null);
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'ringing' | 'connected'>('idle');
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [remoteUid, setRemoteUid] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const callIdRef = useRef<string | null>(null);
  const unsubscribers = useRef<(() => void)[]>([]);

  const cleanupListeners = () => {
    unsubscribers.current.forEach((unsub) => unsub());
    unsubscribers.current = [];
  };

  // 2. listenForIncomingCalls
  useEffect(() => {
    if (!currentUserId) return;

    const callsRef = collection(db, 'calls');
    const q = query(
      callsRef,
      where('receiverId', '==', currentUserId),
      where('status', '==', 'calling')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          setIncomingCall({ callId: change.doc.id, callerId: data.callerId });
          setRemoteUid(data.callerId);
          setCallStatus('ringing');
          
          // Trigger UI callback
          if (onIncomingCall) {
            onIncomingCall(change.doc.id, data.callerId);
          }
        }
      });
    });

    return () => unsubscribe();
  }, [currentUserId, onIncomingCall]);

  const setupMediaAndPC = async (callDoc: DocumentReference<DocumentData>, isCaller: boolean) => {
    // getUserMedia audio only
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    setLocalStream(stream);

    const pc = new RTCPeerConnection(servers);
    
    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    pc.ontrack = (event) => {
      const track = event.track;
      console.log("TRACK:", track.kind, track.contentHint);

      if (track.kind === "audio") {
        const stream = new MediaStream([track]);
        setRemoteStream(stream);
        return;
      }
      
      if (track.kind === "video") {
        const isScreen = track.contentHint === "detail";
        
        if (isScreen) {
          setRemoteStreams(prev => ({ ...prev, screen: event.streams[0] }));
        } else {
          setRemoteStreams(prev => ({ ...prev, camera: event.streams[0] }));
        }

        track.onended = () => {
          if (track.kind === "video") {
            if (track.contentHint === "detail") {
              setRemoteStreams(prev => ({ ...prev, screen: null }));
            } else {
              setRemoteStreams(prev => ({ ...prev, camera: null }));
            }
          }
        };
      }
    };

    pc.onnegotiationneeded = async () => {
      try {
        if (pc.signalingState !== 'stable') return;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await updateDoc(callDoc, { offer: { sdp: offer.sdp, type: offer.type } });
      } catch (error) {
        console.error('Error during renegotiation:', error);
      }
    };

    // 5. ICE candidates exchange
    const candidateQueue: RTCIceCandidateInit[] = [];

    pc.onsignalingstatechange = () => {
      if (pc.remoteDescription) {
        candidateQueue.forEach(candidate => {
          pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(err => console.error('Error adding ICE candidate:', err));
        });
        candidateQueue.length = 0;
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const collectionName = isCaller ? 'offerCandidates' : 'answerCandidates';
        addDoc(collection(callDoc, collectionName), event.candidate.toJSON());
      }
    };

    const listenCollectionName = isCaller ? 'answerCandidates' : 'offerCandidates';
    const unsubCandidates = onSnapshot(collection(callDoc, listenCollectionName), (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const candidateData = change.doc.data();
          if (pc.remoteDescription) {
            pc.addIceCandidate(new RTCIceCandidate(candidateData)).catch(err => console.error('Error adding ICE candidate:', err));
          } else {
            candidateQueue.push(candidateData);
          }
        }
      });
    });
    unsubscribers.current.push(unsubCandidates);

    pcRef.current = pc;
    return { pc, stream };
  };

  // 1. createCall (caller)
  const createCall = async (receiverId: string) => {
    try {
      const callDoc = doc(collection(db, 'calls'));
      callIdRef.current = callDoc.id;
      setRemoteUid(receiverId);
      const { pc } = await setupMediaAndPC(callDoc, true);

      setCallStatus('calling');

      const offerDescription = await pc.createOffer();
      await pc.setLocalDescription(offerDescription);

      const offer = {
        sdp: offerDescription.sdp,
        type: offerDescription.type,
      };

      await setDoc(callDoc, {
        offer,
        callerId: currentUserId,
        receiverId,
        status: 'calling',
      });

      // 4. listenForAnswer (caller side)
      const unsubCallDoc = onSnapshot(callDoc, async (snapshot) => {
        const data = snapshot.data();
        if (data?.status === 'ended') {
          endCall();
          return;
        }
        
        if (data?.answer && pc.signalingState === 'have-local-offer' && pc.currentRemoteDescription?.sdp !== data.answer.sdp) {
          const answerDescription = new RTCSessionDescription(data.answer);
          await pc.setRemoteDescription(answerDescription);
        }

        if (data?.status === 'connected') {
          setCallStatus('connected');
        }
      });
      unsubscribers.current.push(unsubCallDoc);
    } catch (error) {
      console.error('Error creating call:', error);
      setCallStatus('idle');
      cleanupListeners();
    }
  };

  // 3. acceptCall
  const acceptCall = async (callId: string) => {
    try {
      callIdRef.current = callId;
      const callDoc = doc(db, 'calls', callId);
      const { pc } = await setupMediaAndPC(callDoc, false);

      const callData = (await getDoc(callDoc)).data();
      if (!callData) return;

      const offerDescription = callData.offer;
      await pc.setRemoteDescription(new RTCSessionDescription(offerDescription));

      const answerDescription = await pc.createAnswer();
      await pc.setLocalDescription(answerDescription);

      const answer = {
        type: answerDescription.type,
        sdp: answerDescription.sdp,
      };

      await updateDoc(callDoc, {
        answer,
        status: 'connected',
      });

      const unsubCallDoc = onSnapshot(callDoc, async (snapshot) => {
        const data = snapshot.data();
        if (data?.status === 'ended') {
          endCall();
          return;
        }
        
        if (data?.offer && pc.signalingState === 'stable' && pc.remoteDescription?.sdp !== data.offer.sdp) {
          await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await updateDoc(callDoc, { answer: { type: answer.type, sdp: answer.sdp } });
        }
      });
      unsubscribers.current.push(unsubCallDoc);

      setCallStatus('connected');
      setIncomingCall(null);
    } catch (error) {
      console.error('Error accepting call:', error);
      setCallStatus('idle');
      cleanupListeners();
    }
  };

  const rejectCall = async (callId: string) => {
    try {
      await updateDoc(doc(db, 'calls', callId), { status: 'ended' });
    } catch (error) {
      console.error('Error rejecting call:', error);
    }
    setIncomingCall(null);
    setCallStatus('idle');
  };

  const toggleCamera = async () => {
    if (!pcRef.current) return;

    if (isCameraOn) {
      if (localStreams.camera) {
        localStreams.camera.getTracks().forEach(t => t.stop());
        const sender = pcRef.current.getSenders().find(s => s.track === localStreams.camera?.getVideoTracks()[0]);
        if (sender) pcRef.current.removeTrack(sender);
        setLocalStreams(prev => ({ ...prev, camera: null }));
      }
      setIsCameraOn(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        const track = stream.getVideoTracks()[0];
        
        track.contentHint = 'motion';
        
        pcRef.current.addTrack(track, stream);
        setLocalStreams(prev => ({ ...prev, camera: stream }));
        setIsCameraOn(true);
      } catch (error) {
        console.error('Error starting camera:', error);
      }
    }
  };

  const toggleScreenShare = async () => {
    if (!pcRef.current) return;

    if (isScreenSharing) {
      if (localStreams.screen) {
        localStreams.screen.getTracks().forEach(t => t.stop());
        const sender = pcRef.current.getSenders().find(s => s.track === localStreams.screen?.getVideoTracks()[0]);
        if (sender) pcRef.current.removeTrack(sender);
        setLocalStreams(prev => ({ ...prev, screen: null }));
      }
      setIsScreenSharing(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        const track = stream.getVideoTracks()[0];
        
        track.contentHint = 'detail';

        track.onended = () => {
          const sender = pcRef.current?.getSenders().find(s => s.track === track);
          if (sender && pcRef.current) pcRef.current.removeTrack(sender);
          setLocalStreams(prev => ({ ...prev, screen: null }));
          setIsScreenSharing(false);
        };

        pcRef.current.addTrack(track, stream);
        setLocalStreams(prev => ({ ...prev, screen: stream }));
        setIsScreenSharing(true);
      } catch (error) {
        console.error('Error starting screen share:', error);
      }
    }
  };

  const endCall = async () => {
    if (callIdRef.current && callStatus !== 'idle') {
      try {
        await updateDoc(doc(db, 'calls', callIdRef.current), { status: 'ended' });
      } catch (error) {
        console.error('Error ending call:', error);
      }
    }

    cleanupListeners();

    if (localStreams.camera) localStreams.camera.getTracks().forEach(t => t.stop());
    if (localStreams.screen) localStreams.screen.getTracks().forEach(t => t.stop());
    
    setLocalStreams({ camera: null, screen: null });
    setRemoteStreams({ camera: null, screen: null });
    setIsScreenSharing(false);
    setIsCameraOn(false);
    setRemoteUid(null);

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    setLocalStream((prev) => {
      prev?.getTracks().forEach((track) => track.stop());
      return null;
    });

    setRemoteStream((prev) => {
      prev?.getTracks().forEach((track) => track.stop());
      return null;
    });

    setCallStatus('idle');
    setIncomingCall(null);
    callIdRef.current = null;
  };

  // Cleanup connection on unmount
  useEffect(() => {
    return () => {
      endCall();
    };
  }, []);

  return {
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
  };
}