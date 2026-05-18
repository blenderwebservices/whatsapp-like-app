import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, Image as ImageIcon, Mic, X, Download, MoreVertical, Search, Check, CheckCheck, Loader2 } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { Message, ChatSession } from '../types';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface ChatWindowProps {
  chatId: string | null;
  knowledgeContent: string;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ chatId, knowledgeContent }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{data: string, mimeType: string} | null>(null);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      setMessages(msgs);
      setTimeout(scrollToBottom, 100);
    });

    return () => unsubscribe();
  }, [chatId]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!inputText.trim() && !selectedImage) || isLoading || !chatId) return;

    const text = inputText.trim();
    setInputText('');
    const img = selectedImage;
    setSelectedImage(null);
    setIsLoading(true);

    try {
      // 1. Save user message to Firestore
      const userMessage: Partial<Message> = {
        sessionId: chatId,
        sender: 'user',
        text: text,
        imageUrl: img?.data || undefined,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'chats', chatId, 'messages'), userMessage);
      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: text || "Image shared",
        updatedAt: serverTimestamp()
      });

      // 2. Call AI API
      setIsTyping(true);
      const recentHistory = messages.slice(-10); // Send last 10 messages for context

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: recentHistory,
          image: img,
          knowledge: knowledgeContent
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to get AI response");

      // 3. Save AI message to Firestore
      const aiMessage: Partial<Message> = {
        sessionId: chatId,
        sender: 'ai',
        text: data.text,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'chats', chatId, 'messages'), aiMessage);
      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: data.text,
        updatedAt: serverTimestamp()
      });

    } catch (error) {
      console.error("Chat error:", error);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedImage({
        data: event.target?.result as string,
        mimeType: file.type
      });
    };
    reader.readAsDataURL(file);
  };

  const toggleTranscription = () => {
    // Basic Web Speech API check
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputText(prev => prev + (prev ? ' ' : '') + transcript);
    };

    recognition.start();
  };

  const exportToPDF = async () => {
    if (!chatContainerRef.current) return;
    
    setIsLoading(true);
    try {
      const canvas = await html2canvas(chatContainerRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`chat-export-${chatId}.pdf`);
    } catch (error) {
      console.error("PDF Export error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!chatId) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#f0f2f5] text-center px-10">
        <div className="w-64 h-64 mb-10 opacity-60">
            <img src="https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png" alt="Welcome" className="w-full grayscale brightness-125" />
        </div>
        <h1 className="text-3xl font-light text-gray-600 mb-4">ChatMaster AI</h1>
        <p className="max-w-md text-gray-500 leading-relaxed">
          Send and receive messages with your AI assistant. Connect with knowledge and images to get better answers.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#efeae2] relative overflow-hidden">
      <div className="chat-bg" />

      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-[#f0f2f5] border-b border-[#d1d7db] z-10 h-[60px]">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-[#00a884] flex items-center justify-center text-white mr-3">
             <Loader2 className={cn("transition-opacity", isLoading ? "opacity-100" : "opacity-0")} size={20} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[#111b21]">Virtual Assistant</h2>
            <p className="text-[11px] text-green-600">{isTyping ? "typing..." : "online • RAG Enabled"}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3 text-[#54656f]">
          <button onClick={exportToPDF} className="flex items-center gap-1 bg-[#00a884] text-white px-3 py-1.5 rounded text-xs font-semibold shadow-sm hover:opacity-90 transition-all" title="Export to PDF">
            <Download size={16} />
            <span>PDF</span>
          </button>
          <MoreVertical size={20} className="p-1 hover:bg-[#dfe5e7] rounded-full cursor-pointer transition-colors" />
        </div>
      </div>

      {/* Message Area */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-2 z-10 scroll-smooth"
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "flex flex-col max-w-[85%] md:max-w-[70%] mb-2 animate-in fade-in slide-in-from-bottom-2",
              msg.sender === 'user' ? "ml-auto items-end" : "mr-auto items-start"
            )}
          >
            <div
              className={cn(
                "p-2 rounded-lg shadow-sm relative group min-w-[60px]",
                msg.sender === 'user' ? "bg-[#dcf8c6] rounded-tr-none" : "bg-white rounded-tl-none"
              )}
            >
              {msg.imageUrl && (
                <div className="rounded overflow-hidden mb-1.5 border border-black/5">
                  <img 
                    src={msg.imageUrl} 
                    alt="Attachment" 
                    className="max-w-full max-h-60 object-cover" 
                  />
                </div>
              )}
              <div className="markdown-body">
                <ReactMarkdown>{msg.text}</ReactMarkdown>
              </div>
              <div className="flex justify-end items-center mt-1 space-x-1">
                <span className="text-[10px] text-gray-400">
                  {msg.createdAt?.toDate ? format(msg.createdAt.toDate(), 'HH:mm') : ''}
                </span>
                {msg.sender === 'user' && (
                   <CheckCheck size={14} className="text-[#53bdeb]" />
                )}
              </div>
              
              {/* Triangle pointer */}
              <div
                className={cn(
                  "absolute top-0 w-0 h-0 border-[6px]",
                  msg.sender === 'user' 
                    ? "right-[-6px] border-l-[#dcf8c6] border-t-[#dcf8c6] border-r-transparent border-b-transparent" 
                    : "left-[-6px] border-r-white border-t-white border-l-transparent border-b-transparent"
                )}
              />
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-[#f0f2f5] z-10 border-t border-[#d1d7db]">
        {selectedImage && (
          <div className="mb-2 p-2 bg-white rounded-lg flex items-center justify-between border border-[#d1d7db] animate-in slide-in-from-bottom-5">
            <div className="flex items-center">
              <img src={selectedImage.data} alt="Preview" className="w-12 h-12 rounded object-cover mr-2" />
              <span className="text-xs text-[#54656f]">Image attached</span>
            </div>
            <button onClick={() => setSelectedImage(null)} className="p-1 hover:bg-[#f0f2f5] rounded-full">
              <X size={16} />
            </button>
          </div>
        )}
        
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <div className="flex gap-1 text-[#54656f] px-1">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 hover:bg-[#dfe5e7] rounded-full transition-colors"
            >
              <Paperclip size={24} />
            </button>
          </div>
          
          <div className="flex-1">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Escribe un mensaje..."
              className="w-full bg-white border-none rounded-lg px-4 py-2 text-sm outline-none shadow-sm focus:ring-0"
            />
          </div>

          <div className="text-[#54656f] px-1">
            {inputText.trim() || selectedImage ? (
              <button
                type="submit"
                className="bg-[#00a884] text-white p-2.5 rounded-full hover:opacity-90 transition-all shadow-sm"
                disabled={isLoading}
              >
                <Send size={20} />
              </button>
            ) : (
              <button
                type="button"
                onClick={toggleTranscription}
                className={cn(
                  "p-2.5 rounded-full transition-all flex items-center justify-center",
                  isListening ? "bg-red-500 text-white animate-pulse" : "hover:bg-[#dfe5e7]"
                )}
              >
                <Mic size={24} />
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
