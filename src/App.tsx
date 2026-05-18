/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ChatSidebar } from './components/ChatSidebar';
import { ChatWindow } from './components/ChatWindow';
import { Auth } from './components/Auth';
import { KnowledgeBase } from './components/KnowledgeBase';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, getDocs, query, where, doc, setDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [showKnowledge, setShowKnowledge] = useState(false);
  const [knowledgeContent, setKnowledgeContent] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Sync profile to Firestore
        const userRef = doc(db, 'users', u.uid);
        await setDoc(userRef, {
          uid: u.uid,
          displayName: u.displayName || 'Anonymous',
          email: u.email,
          photoURL: u.photoURL,
          updatedAt: serverTimestamp()
        }, { merge: true });
        fetchKnowledge();
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const fetchKnowledge = async () => {
    if (!user) return;
    try {
      const q = query(collection(db, 'knowledge'), where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      const content = snapshot.docs.map(doc => doc.data().content).join("\n\n---\n\n");
      setKnowledgeContent(content);
    } catch (error) {
      console.error(error);
    }
  };

  const handleNewChat = async () => {
    if (!user) return;
    try {
      const docRef = await addDoc(collection(db, 'chats'), {
        userId: user.uid,
        title: `Chat ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
        lastMessage: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setCurrentChatId(docRef.id);
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#f0f2f5]">
        <Loader2 className="animate-spin text-whatsapp-teal" size={40} />
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <div className="h-screen w-full flex overflow-hidden">
      <div className="w-full max-w-[320px] shrink-0 border-r border-[#d1d7db]">
        <ChatSidebar 
          currentChatId={currentChatId} 
          onSelectChat={setCurrentChatId} 
          onNewChat={handleNewChat}
          onOpenKnowledge={() => setShowKnowledge(true)}
        />
      </div>
      <div className="flex-1 min-w-0">
        <ChatWindow chatId={currentChatId} knowledgeContent={knowledgeContent} />
      </div>

      {showKnowledge && (
        <KnowledgeBase onClose={() => setShowKnowledge(false)} />
      )}
    </div>
  );
}
