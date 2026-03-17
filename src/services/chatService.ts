import { 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  updateDoc,
  deleteDoc,
  onSnapshot,
  limit
} from "firebase/firestore";
import { db } from "../firebase";
import { Message } from "../types";
import { handleFirestoreError, OperationType } from "../context/FirebaseContext";

export interface Conversation {
  id: string;
  userId: string;
  agentId: string;
  title: string;
  lastMessage: string;
  updatedAt: any;
  createdAt: any;
}

/**
 * Creates a new conversation session
 */
export const createConversation = async (userId: string, agentId: string, title: string = "New Conversation") => {
  const conversationRef = collection(db, "conversations");
  const newDoc = await addDoc(conversationRef, {
    userId,
    agentId,
    title,
    lastMessage: "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return newDoc.id;
};

/**
 * Saves a message to a conversation
 */
export const saveMessage = async (conversationId: string, message: Message) => {
  const messagesRef = collection(db, "conversations", conversationId, "messages");
  
  // Clean message parts for Firestore (remove large inlineData if necessary, 
  // though for small images it's fine. For large ones we should use the URL from Storage)
  const cleanedParts = message.parts.map(part => {
    if (part.inlineData && part.inlineData.data.length > 50000) {
      // If data is too large for Firestore, we should ideally have uploaded it to Storage
      // and use a fileUri or similar. For now, we'll keep it as is but be mindful of limits.
      return part;
    }
    return part;
  });

  await addDoc(messagesRef, {
    role: message.role,
    parts: cleanedParts,
    timestamp: serverTimestamp(),
  });

  // Update conversation last message and timestamp
  const conversationRef = doc(db, "conversations", conversationId);
  const lastText = message.parts.find(p => p.text)?.text || "Media attachment";
  await updateDoc(conversationRef, {
    lastMessage: lastText.substring(0, 100),
    updatedAt: serverTimestamp(),
  });
};

/**
 * Fetches all conversations for a user
 */
export const getUserConversations = (userId: string, callback: (conversations: Conversation[]) => void) => {
  const path = "conversations";
  const q = query(
    collection(db, path),
    where("userId", "==", userId),
    orderBy("updatedAt", "desc")
  );

  return onSnapshot(q, (snapshot) => {
    const conversations = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Conversation));
    callback(conversations);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
};

/**
 * Fetches messages for a conversation
 */
export const getConversationMessages = (conversationId: string, callback: (messages: Message[]) => void) => {
  const path = `conversations/${conversationId}/messages`;
  const q = query(
    collection(db, "conversations", conversationId, "messages"),
    orderBy("timestamp", "asc")
  );

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        role: data.role,
        parts: data.parts,
        timestamp: data.timestamp?.toMillis() || Date.now(),
      } as Message;
    });
    callback(messages);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
};

/**
 * Deletes a conversation and its messages
 */
export const deleteConversation = async (conversationId: string) => {
  // Note: In production, you'd use a Cloud Function to delete subcollections.
  // Client-side, we'll just delete the main doc.
  await deleteDoc(doc(db, "conversations", conversationId));
};

/**
 * Updates conversation title
 */
export const updateConversationTitle = async (conversationId: string, title: string) => {
  await updateDoc(doc(db, "conversations", conversationId), {
    title,
    updatedAt: serverTimestamp(),
  });
};
