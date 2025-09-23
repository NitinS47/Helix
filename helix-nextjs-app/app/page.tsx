// app/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlus, FiChevronDown, FiX } from 'react-icons/fi';

// Define a type for our Health Record for TypeScript
type HealthRecord = {
  recordID: string;
  patientID: string;
  recordType: string;
  creatorID: string;
  accessList: string[];
};

export default function HomePage() {
  // State for the main dashboard list
  const [records, setRecords] = useState<HealthRecord[]>([]);
  
  // State for the "Create Record" form
  const [newRecordID, setNewRecordID] = useState('');
  const [newPatientID, setNewPatientID] = useState('');
  
  // State for modals and actions
  const [modal, setModal] = useState<'grant' | 'revoke' | 'history' | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<HealthRecord | null>(null);
  const [granteeID, setGranteeID] = useState('');
  const [history, setHistory] = useState<any[]>([]);

  // State for loading and status messages
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Fetch all records when the component mounts
  useEffect(() => {
    fetchAllRecords();
  }, []);

  const fetchAllRecords = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/records');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch records.');
      setRecords(data);
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordID: newRecordID,
          patientID: newPatientID,
          recordType: 'Diagnosis', // Hardcoded for simplicity
          recordDataHash: 'dummy_hash_' + Date.now(),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create record.');
      setMessage(data.message);
      fetchAllRecords(); // Refresh the dashboard
      setNewRecordID('');
      setNewPatientID('');
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAction = async (action: 'grant' | 'revoke' | 'history', record: HealthRecord) => {
    setSelectedRecord(record);
    setModal(action);
    setMessage('');
    
    if (action === 'history') {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/records/${record.recordID}/history`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch history.');
        setHistory(data);
      } catch (error) {
        setMessage((error as Error).message);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const submitAccessChange = async (action: 'grant' | 'revoke') => {
    if (!selectedRecord || !granteeID) return;
    setIsLoading(true);
    setMessage('');
    try {
      const method = action === 'grant' ? 'POST' : 'DELETE';
      const response = await fetch(`/api/records/${selectedRecord.recordID}/access`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ granteeID }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Failed to ${action} access.`);
      setMessage(data.message);
      fetchAllRecords(); // Refresh dashboard to show updated access list
      closeModal();
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const closeModal = () => {
    setModal(null);
    setSelectedRecord(null);
    setGranteeID('');
    setHistory([]);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  return (
    <main className="min-h-screen w-full">
      {/* --- HERO SECTION --- */}
      <div className="min-h-screen flex flex-col items-center justify-center text-center relative overflow-hidden">
        <div className="helix-container absolute opacity-20">
          <div className="helix">
            <div className="strand"></div>
            <div className="strand"></div>
            {Array.from({ length: 50 }).map((_, i) => (
              <div
                key={i}
                className="base-pair"
                style={{ transform: `rotateY(${i * 25}deg) translateY(${ (i * 12) - 300 }px) translateZ(0)` }}
              ></div>
            ))}
          </div>
        </div>
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <h1 className="text-8xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 tracking-tighter">
            HELIX
          </h1>
          <p className="text-gray-300 text-lg md:text-xl mt-4">Immutable Health Records on the Blockchain</p>
        </motion.div>
        <a href="#content" className="absolute bottom-10 animate-bounce">
          <FiChevronDown size={32} className="text-cyan-400" />
        </a>
      </div>

      {/* --- MAIN CONTENT SECTION --- */}
      <div id="content" className="p-4 md:p-8 lg:p-12 container mx-auto">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="space-y-8"
        >
          <motion.div variants={itemVariants} className="glass-card p-6 rounded-2xl shadow-2xl">
            <form onSubmit={handleCreate} className="flex flex-wrap items-center gap-4">
              <h2 className="text-xl font-bold text-white w-full md:w-auto mb-4 md:mb-0">
                <FiPlus className="inline mr-2" />Create Record
              </h2>
              <input type="text" placeholder="Record ID" value={newRecordID} onChange={(e) => setNewRecordID(e.target.value)} className="bg-gray-900/50 p-3 border border-cyan-400/20 rounded-lg flex-grow" required />
              <input type="text" placeholder="Patient ID" value={newPatientID} onChange={(e) => setNewPatientID(e.target.value)} className="bg-gray-900/50 p-3 border border-cyan-400/20 rounded-lg flex-grow" required />
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="submit" disabled={isLoading} className="bg-cyan-400 text-gray-900 font-bold p-3 rounded-lg w-full md:w-auto disabled:bg-gray-600">
                {isLoading ? 'Submitting...' : 'Submit Transaction'}
              </motion.button>
            </form>
          </motion.div>
          {message && <motion.p variants={itemVariants} className={`my-4 text-center ${message.toLowerCase().includes('failed') ? 'text-red-400' : 'text-green-400'}`}>{message}</motion.p>}
          <motion.div variants={itemVariants} className="glass-card p-6 rounded-2xl shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-cyan-400/20"><th className="p-4">Record ID</th><th className="p-4">Patient ID</th><th className="p-4 hidden md:table-cell">Actions</th></tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <motion.tr key={record.recordID} variants={itemVariants} className="border-b border-gray-700/50 hover:bg-gray-900/50 transition-colors">
                      <td className="p-4 font-mono">{record.recordID}</td><td className="p-4">{record.patientID}</td>
                      <td className="p-4">
                        <div className="flex space-x-2">
                           <motion.button whileHover={{ scale: 1.1 }} onClick={() => handleAction('grant', record)} className="bg-green-500/80 px-3 py-1 rounded-md text-sm">Grant</motion.button>
                           <motion.button whileHover={{ scale: 1.1 }} onClick={() => handleAction('revoke', record)} className="bg-red-500/80 px-3 py-1 rounded-md text-sm">Revoke</motion.button>
                           <motion.button whileHover={{ scale: 1.1 }} onClick={() => handleAction('history', record)} className="bg-gray-500/80 px-3 py-1 rounded-md text-sm">History</motion.button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* --- MODALS --- */}
      <AnimatePresence>
        {modal && selectedRecord && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="glass-card rounded-2xl shadow-2xl p-6 w-full max-w-2xl border-cyan-400/30">
              <div className="flex justify-between items-center mb-4"><h3 className="text-xl font-bold text-white capitalize">{modal} Details for <span className="font-mono text-cyan-400">{selectedRecord.recordID}</span></h3><motion.button whileHover={{ scale: 1.2, rotate: 90 }} onClick={closeModal}><FiX size={24} /></motion.button></div>
              {modal === 'history' ? (
                <pre className="bg-gray-900/70 text-cyan-300 text-xs p-4 rounded-lg overflow-auto max-h-96">{isLoading ? 'Loading History...' : JSON.stringify(history, null, 2)}</pre>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-gray-400">Current Access: {selectedRecord.accessList.join(', ')}</p>
                  <input type="text" placeholder="Enter Grantee ID" value={granteeID} onChange={e => setGranteeID(e.target.value)} className="w-full bg-gray-900/50 p-3 border border-cyan-400/20 rounded-lg" />
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => submitAccessChange(modal)} disabled={isLoading} className={`w-full font-bold text-white p-3 rounded-lg ${modal === 'grant' ? 'bg-green-500' : 'bg-red-500'}`}>
                    {isLoading ? 'Submitting...' : `Confirm ${modal} Access`}
                  </motion.button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}