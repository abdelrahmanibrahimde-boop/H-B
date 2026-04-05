import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, query, onSnapshot, orderBy, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

/**
 * Prüft, ob ein Chat existiert, und erstellt andernfalls einen neuen.
 * @param currentUserId Die UID des aktuell eingeloggten Nutzers
 * @param otherUserId Die UID des Nutzers, mit dem gechattet werden soll
 * @returns Die ID des Chat-Dokuments
 */
export const createChat = async (currentUserId: string, otherUserId: string): Promise<string> => {
  const members = [currentUserId, otherUserId].sort();
  // Erstelle eine konsistente ID aus den beiden UIDs, um Duplikate ohne Index-Abfrage zu vermeiden
  const chatId = `${members[0]}_${members[1]}`;
  const chatRef = doc(db, 'chats', chatId);

  const chatSnap = await getDoc(chatRef);
  if (chatSnap.exists()) return chatId;

  await setDoc(chatRef, {
    members,
    type: 'private',
    createdAt: serverTimestamp(),
  });

  return chatId;
};

/**
 * Sends a new message in a specific chat.
 * @param chatId The ID of the chat document
 * @param senderId The UID of the sender
 * @param senderUsername The username of the sender
 * @param text The message content
 * @param type The message type ('text' | 'image' | 'video' | 'file')
 * @param fileUrl The base64 file string (for attachments)
 * @param fileName The original file name (for attachments)
 */
export const sendMessage = async (chatId: string, senderId: string, senderUsername: string, text: string, type: string = 'text', fileUrl: string | null = null, fileName: string | null = null) => {
  const messagesRef = collection(db, 'chats', chatId, 'messages');
  
  const messageData: any = {
    text,
    senderId,
    senderUsername,
    deleted: false,
    createdAt: serverTimestamp(),
    type,
  };

  if (fileUrl) messageData.fileUrl = fileUrl;
  if (fileName) messageData.fileName = fileName;

  await addDoc(messagesRef, messageData);
};

/**
 * Marks a message as deleted (Soft-Delete)
 */
export const deleteMessage = async (chatId: string, messageId: string) => {
  const messageRef = doc(db, 'chats', chatId, 'messages', messageId);
  await updateDoc(messageRef, {
    deleted: true,
    text: ""
  });
};

/**
 * Bearbeitet eine Nachricht und markiert sie als "bearbeitet"
 * @param chatId Die ID des Chats
 * @param messageId Die ID der Nachricht
 * @param newText Der neue Text
 */
export const editMessage = async (chatId: string, messageId: string, newText: string) => {
  const messageRef = doc(db, 'chats', chatId, 'messages', messageId);
  await updateDoc(messageRef, {
    text: newText,
    edited: true
  });
};

/**
 * Listens for new messages in a specific chat in real-time.
 * @param chatId The ID of the chat document
 * @param callback Function to call with the updated messages
 * @returns Unsubscribe function to clean up the listener
 */
export const listenMessages = (chatId: string, callback: (messages: any[]) => void) => {
  const messagesRef = collection(db, 'chats', chatId, 'messages');
  const q = query(messagesRef, orderBy('createdAt', 'asc'));

  return onSnapshot(q, (snapshot) => {
    console.count("🔥 FIRESTORE-READ: [chat.ts - listenMessages]");
    const messages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(messages);
  });
};