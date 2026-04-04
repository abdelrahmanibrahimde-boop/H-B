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
  const [incomingCall, setIncomingCall] = useState<{ callId: string; callerId: string } | null>(null);
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'ringing' | 'connected'>('idle');
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const callIdRef = useRef<string | null>(null);
  const unsubscribers = useRef<(() => void)[]>([]);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);

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

    // Initialize video transceiver so screen share can replace track without renegotiation
    pc.addTransceiver('video', { direction: 'sendrecv', streams: [stream] });

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    // 5. ICE candidates exchange
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
          const candidate = new RTCIceCandidate(candidateData);
          try {
            pc.addIceCandidate(candidate);
          } catch (err) {
            console.error('Error adding ICE candidate:', err);
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
      const unsubCallDoc = onSnapshot(callDoc, (snapshot) => {
        const data = snapshot.data();
        if (data?.status === 'ended') {
          endCall();
          return;
        }
        if (!pc.currentRemoteDescription && data?.answer) {
          const answerDescription = new RTCSessionDescription(data.answer);
          pc.setRemoteDescription(answerDescription);
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

      const unsubCallDoc = onSnapshot(callDoc, (snapshot) => {
        if (snapshot.data()?.status === 'ended') {
          endCall();
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

  const toggleScreenShare = async () => {
    if (!pcRef.current) return;

    if (isScreenSharing) {
      // Stop sharing
      if (screenTrackRef.current) {
        screenTrackRef.current.stop();
        const sender = pcRef.current.getSenders().find(s => s.track?.kind === 'video' || s.track === screenTrackRef.current);
        if (sender) {
          try {
            await sender.replaceTrack(null);
          } catch (e) {
            console.error(e);
          }
        }
        if (localStream) {
          localStream.removeTrack(screenTrackRef.current);
          setLocalStream(new MediaStream(localStream.getAudioTracks()));
        }
        screenTrackRef.current = null;
      }
      setIsScreenSharing(false);
    } else {
      // Start sharing
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false
        });
        const videoTrack = screenStream.getVideoTracks()[0];

        videoTrack.onended = async () => {
          // Handle browser UI "Stop sharing" button
          if (screenTrackRef.current) {
            const sender = pcRef.current?.getSenders().find(s => s.track?.kind === 'video' || s.track === screenTrackRef.current);
            if (sender) {
              try {
                await sender.replaceTrack(null);
              } catch (e) {
                console.error(e);
              }
            }
            if (localStream) {
              localStream.removeTrack(screenTrackRef.current);
              setLocalStream(new MediaStream(localStream.getAudioTracks()));
            }
            screenTrackRef.current = null;
          }
          setIsScreenSharing(false);
        };

        const sender = pcRef.current.getSenders().find(s => s.track?.kind === 'video' || s.track === null);
        if (sender) {
          await sender.replaceTrack(videoTrack);
        } else {
          pcRef.current.addTrack(videoTrack, localStream!);
        }

        const combinedStream = new MediaStream([
          ...(localStream ? localStream.getAudioTracks() : []),
          videoTrack
        ]);
        setLocalStream(combinedStream);
        screenTrackRef.current = videoTrack;
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

    // Cleanup screen track
    if (screenTrackRef.current) {
      screenTrackRef.current.stop();
      screenTrackRef.current = null;
    }
    setIsScreenSharing(false);

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
    incomingCall,
    callStatus,
    isScreenSharing,
    toggleScreenShare,
  };
}