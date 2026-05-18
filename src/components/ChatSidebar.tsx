import React, { useState, useEffect } from 'react';
import { Search, MessageSquarePlus, MoreVertical, LogOut, User as UserIcon, Book } from 'lucide-react';
import { auth, db, googleProvider } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { ChatSession } from '../types';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

interface SidebarProps {
  currentChatId: string | null;
  onSelectChat: (id: string | null) => void;
  onNewChat: () => void;
  onOpenKnowledge: () => void;
}

export const ChatSidebar: React.FC<SidebarProps> = ({ currentChatId, onSelectChat, onNewChat, onOpenKnowledge }) => {
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'chats'),
      where('userId', '==', user.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatSession[];
      setChats(chatList);
    });

    return () => unsubscribe();
  }, [user]);

  const filteredChats = chats.filter(chat =>
    chat.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-white border-r border-[#d1d7db]">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between p-3 bg-[#f0f2f5] h-[60px] border-b border-[#d1d7db]">
        <div className="flex items-center space-x-2">
          {user?.photoURL ? (
            <img src={user.photoURL} alt="Avatar" className="w-10 h-10 rounded-full" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-whatsapp-teal flex items-center justify-center text-white">
              <UserIcon size={20} />
            </div>
          )}
        </div>
        <div className="flex items-center space-x-3 text-[#54656f]">
          <button onClick={onOpenKnowledge} className="p-2 hover:bg-[#dfe5e7] rounded-full transition-colors" title="Knowledge Base (RAG)">
            <Book size={20} />
          </button>
          <button onClick={onNewChat} className="p-2 hover:bg-[#dfe5e7] rounded-full transition-colors" title="New Chat">
            <MessageSquarePlus size={20} />
          </button>
          <button onClick={() => signOut(auth)} className="p-2 hover:bg-[#dfe5e7] rounded-full transition-colors" title="Logout">
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-2 bg-white border-b border-gray-100">
        <div className="relative flex items-center bg-[#f0f2f5] rounded-lg px-3 py-1.5 focus-within:bg-white focus-within:shadow-sm transition-all">
          <Search size={16} className="text-[#54656f] mr-3" />
          <input
            type="text"
            placeholder="Search or start new chat"
            className="bg-transparent border-none focus:outline-none text-sm w-full placeholder:text-[#54656f]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {filteredChats.map(chat => (
          <div
            key={chat.id}
            id={`chat-item-${chat.id}`}
            onClick={() => onSelectChat(chat.id)}
            className={cn(
              "flex items-center p-3 cursor-pointer border-b border-gray-50 hover:bg-[#f5f6f6] transition-colors",
              currentChatId === chat.id && "bg-[#f0f2f5]"
            )}
          >
            <div className="w-12 h-12 rounded-full bg-[#00a884] flex-shrink-0 flex items-center justify-center text-white mr-3">
              <span className="text-lg font-semibold uppercase">{chat.title[0]}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline mb-1">
                <h3 className="text-sm font-semibold text-[#111b21] truncate">{chat.title}</h3>
                <span className="text-[11px] text-[#54656f] ml-2">
                  {chat.updatedAt?.toDate ? format(chat.updatedAt.toDate(), 'HH:mm') : ''}
                </span>
              </div>
              <p className="text-[13px] text-[#54656f] truncate leading-tight">
                {chat.lastMessage || "No messages yet"}
              </p>
            </div>
          </div>
        ))}

        {filteredChats.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 px-10 text-center text-gray-500">
            <p className="text-sm">No chats found.</p>
          </div>
        )}
      </div>
    </div>
  );
};
