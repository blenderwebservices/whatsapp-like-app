import React, { useState, useEffect } from 'react';
import { X, Upload, FileText, Trash2, Loader2, Save } from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { UserKnowledge } from '../types';

interface KnowledgeBaseProps {
  onClose: () => void;
}

export const KnowledgeBase: React.FC<KnowledgeBaseProps> = ({ onClose }) => {
  const [knowledge, setKnowledge] = useState<UserKnowledge[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const user = auth.currentUser;

  useEffect(() => {
    fetchKnowledge();
  }, [user]);

  const fetchKnowledge = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'knowledge'), where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as UserKnowledge[];
      setKnowledge(list);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const text = await file.text();
      await addDoc(collection(db, 'knowledge'), {
        userId: user.uid,
        fileName: file.name,
        content: text,
        createdAt: serverTimestamp()
      });
      fetchKnowledge();
    } catch (error) {
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const deleteKnowledge = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'knowledge', id));
      fetchKnowledge();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="bg-[#00a884] p-4 flex justify-between items-center text-white">
          <h2 className="text-lg font-semibold flex items-center">
            <Save size={20} className="mr-2" />
            Knowledge Base (RAG)
          </h2>
          <button onClick={onClose} className="hover:bg-white/10 p-1 rounded-full">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6">
          <p className="text-sm text-gray-500 mb-6 text-center">
            Upload text files to provide context to the AI assistant.
          </p>

          <div className="space-y-4 max-h-[300px] overflow-y-auto mb-6">
            {loading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="animate-spin text-whatsapp-teal" size={32} />
              </div>
            ) : knowledge.length > 0 ? (
              knowledge.map((k) => (
                <div key={k.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-center">
                    <FileText size={20} className="text-gray-400 mr-3" />
                    <span className="text-sm font-medium text-gray-700 truncate max-w-[200px]">
                      {k.fileName}
                    </span>
                  </div>
                  <button 
                    onClick={() => deleteKnowledge(k.id)}
                    className="text-red-400 hover:text-red-600 p-1"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center p-8 border-2 border-dashed border-gray-200 rounded-xl">
                <FileText size={48} className="mx-auto text-gray-200 mb-2" />
                <p className="text-sm text-gray-400">No documents uploaded</p>
              </div>
            )}
          </div>

          <label className="flex flex-col items-center justify-center w-full p-4 border-2 border-dashed border-whatsapp-teal/30 rounded-xl cursor-pointer hover:bg-whatsapp-teal/5 transition-colors">
            {uploading ? (
              <Loader2 className="animate-spin text-whatsapp-teal" size={24} />
            ) : (
              <>
                <Upload size={24} className="text-whatsapp-teal mb-2" />
                <span className="text-sm font-medium text-whatsapp-teal">Upload .txt or .md file</span>
              </>
            )}
            <input type="file" className="hidden" accept=".txt,.md" onChange={handleFileUpload} disabled={uploading} />
          </label>
        </div>
      </div>
    </div>
  );
};
