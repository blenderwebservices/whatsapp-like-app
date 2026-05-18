import React from 'react';
import { MessageSquare, ShieldCheck, Mail } from 'lucide-react';
import { auth, googleProvider } from '../lib/firebase';
import { signInWithPopup } from 'firebase/auth';

export const Auth: React.FC = () => {
  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-whatsapp-teal p-12 flex flex-col items-center text-white">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-whatsapp-teal mb-4 shadow-lg">
            <MessageSquare size={40} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">ChatMaster AI</h1>
          <p className="text-sm text-whatsapp-teal/80 mt-1">Tu asistente virtual inteligente</p>
        </div>
        
        <div className="p-8 space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-800">Welcome Back</h2>
            <p className="text-sm text-gray-500 mt-1">Sign in to sync your chats across devices</p>
          </div>

          <button
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center space-x-3 bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-700 font-medium hover:bg-gray-50 transition-all duration-200 active:scale-[0.98]"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
            <span>Continue with Google</span>
          </button>

          <div className="flex items-center space-x-2 text-[10px] text-gray-400 justify-center pt-4">
             <ShieldCheck size={12} />
             <span>End-to-end cloud encrypted by Firebase</span>
          </div>
        </div>
      </div>
      
      <div className="mt-8 text-xs text-gray-400">
        © 2026 ChatMaster AI. Powered by Gemini.
      </div>
    </div>
  );
};
