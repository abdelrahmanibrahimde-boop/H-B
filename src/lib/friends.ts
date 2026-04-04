import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, onSnapshot, doc, updateDoc, arrayUnion, deleteDoc } from 'firebase/firestore';

export const sendFriendRequest = async (
  currentUserId: string,
  currentUsername: string,
  currentFriends: string[],
  targetUsername: string
) => {
  if (currentUsername === targetUsername) throw new Error("Du kannst dir selbst keine Anfrage senden.");

  // Ziel-Nutzer anhand des Namens suchen
  const usersRef = collection(db, 'users');
  const qUser = query(usersRef, where('username', '==', targetUsername));
  const userSnap = await getDocs(qUser);
  
  if (userSnap.empty) throw new Error("Benutzer nicht gefunden.");

  const targetUser = userSnap.docs[0].data();

  if (currentFriends.includes(targetUser.uid)) throw new Error("Ihr seid bereits befreundet.");

  const reqRef = collection(db, 'friendRequests');
  
  // 1. Check if the current user already sent a request to the target
  const qReq = query(reqRef, where('from', '==', currentUserId), where('to', '==', targetUser.uid));
  const reqSnap = await getDocs(qReq);
  if (!reqSnap.empty) {
    throw new Error("Anfrage wurde bereits gesendet.");
  }

  // 2. Check if the target user already sent a request to the current user (Reverse case)
  const reverseReq = query(reqRef, where('from', '==', targetUser.uid), where('to', '==', currentUserId));
  const reverseSnap = await getDocs(reverseReq);
  if (!reverseSnap.empty) {
    throw new Error("Dieser Benutzer hat dir bereits eine Anfrage gesendet.");
  }

  await addDoc(reqRef, {
    from: currentUserId,
    fromUsername: currentUsername,
    to: targetUser.uid,
    status: 'pending',
    createdAt: serverTimestamp()
  });
};

export const listenFriendRequests = (currentUserId: string, callback: (requests: any[]) => void) => {
  const reqRef = collection(db, 'friendRequests');
  const q = query(reqRef, where('to', '==', currentUserId), where('status', '==', 'pending'));

  return onSnapshot(q, (snapshot) => {
    const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(requests);
  });
};

export const acceptFriendRequest = async (requestId: string, currentUserId: string, senderId: string) => {
  await deleteDoc(doc(db, 'friendRequests', requestId)); // Anfrage nach dem Akzeptieren löschen
  await updateDoc(doc(db, 'users', currentUserId), { friends: arrayUnion(senderId) });
  await updateDoc(doc(db, 'users', senderId), { friends: arrayUnion(currentUserId) });
};

export const rejectFriendRequest = async (requestId: string) => {
  await deleteDoc(doc(db, 'friendRequests', requestId));
};