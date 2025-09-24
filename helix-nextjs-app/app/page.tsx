// app/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlus, FiChevronDown, FiX, FiTrash2, FiUsers, FiUser, FiEye, FiShare2, FiUserX } from 'react-icons/fi';

// Define types for clarity
type HealthRecord = {
  recordID: string;
  patientID: string;
  diagnosticResult: string;
  creatorID: string;
  accessList: string[];
};
type View = 'Org1MSP' | 'Org2MSP' | 'Admin';

export default function HomePage() {
  const [currentView, setCurrentView] = useState<View>('Org1MSP');

  // State for the main dashboard list
  const [records, setRecords] = useState<HealthRecord[]>([]);
  
  // State for the "Create Record" form
  const [newRecordID, setNewRecordID] = useState('');
  const [newPatientID, setNewPatientID] = useState('');
  const [newDiagnosticResult, setNewDiagnosticResult] = useState('');

  // State for modals and actions
  const [modal, setModal] = useState<'grant' | 'revoke' | 'history' | 'delete' | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<HealthRecord | null>(null);
  const [granteeID, setGranteeID] = useState('');
  const [history, setHistory] = useState<any[]>([]);

  // State for loading and status messages
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Fetch all records when the component mounts
  useEffect(() => {
    fetchAllRecords();
  }, [currentView]);

  const fetchAllRecords = async () => {
    setIsLoading(true);
    setMessage('');
    try {
      let data: HealthRecord[] = [];
      // --- UPDATED: Admin view fetches from both orgs and combines the results ---
      if (currentView === 'Admin') {
        console.log('Fetching records for Admin view...');
        const [org1Res, org2Res] = await Promise.all([
          fetch('/api/records?org=Org1MSP'),
          fetch('/api/records?org=Org2MSP')
        ]);
        const org1Data = await org1Res.json();
        const org2Data = await org2Res.json();
        console.log('Org1 Data:', org1Data);
        console.log('Org2 Data:', org2Data);
        if (!org1Res.ok || !org2Res.ok) {
            throw new Error('Failed to fetch data for one or more organizations.');
        }
        // Combine and remove duplicates (if any)
        const allRecords = [...(Array.isArray(org1Data) ? org1Data : []), ...(Array.isArray(org2Data) ? org2Data : [])];
        const uniqueRecords = Array.from(new Map(allRecords.map(item => [item.recordID, item])).values());
        console.log('Combined Unique Records:', uniqueRecords);
        data = uniqueRecords;
      } else {
        // Org1 or Org2 view fetches only its own data
        const response = await fetch(`/api/records?org=${currentView}`);
        const responseData = await response.json();
        if (!response.ok) throw new Error(responseData.error || 'Failed to fetch records.');
        data = Array.isArray(responseData) ? responseData : [];
      }
      setRecords(data);
    } catch (error) {
      setMessage((error as Error).message);
      setRecords([]); // Clear records on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentView === 'Admin') return; // Should not be possible via UI, but safe guard
    setIsLoading(true);
    setMessage('');
    try {
      // --- UPDATED: Pass the current org to the API when creating a record ---
      const response = await fetch(`/api/records?org=${currentView}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordID: newRecordID,
          patientID: newPatientID,
          diagnosticResult: newDiagnosticResult,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create record.');
      setMessage(data.message);
      fetchAllRecords();
      setNewRecordID('');
      setNewPatientID('');
      setNewDiagnosticResult('');
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (action: 'grant' | 'revoke' | 'history' | 'delete', record: HealthRecord) => {
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

  // --- NEW: Handler for sharing and revoking ---
  const handleShareAction = async (record: HealthRecord, action: 'share' | 'revoke') => {
      if (currentView === 'Admin') return;
      const targetOrg = currentView === 'Org1MSP' ? 'Org2MSP' : 'Org1MSP';
      
      setIsLoading(true);
      setMessage('');
      try {
          const response = await fetch(`/api/records/share?org=${currentView}`, {
              method: action === 'share' ? 'POST' : 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              // 2. The recordID is now sent in the body
              body: JSON.stringify({ 
                recordID: record.recordID, // <-- ADDED
                targetOrg 
              }),
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'Action failed.');
          setMessage(data.message);
      } catch (error) {
          setMessage((error as Error).message);
      } finally {
          setIsLoading(false);
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

  const handleDeleteConfirm = async () => {
    if (!selectedRecord || currentView === 'Admin') return;
    setIsLoading(true);
    setMessage('');
    try {
      const response = await fetch(`/api/records/${selectedRecord.recordID}?org=${currentView}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete record.');
      setMessage(data.message);
      fetchAllRecords();
      closeModal();
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0, transition: { duration: 0.5 }, pointerEvents: 'none' as const },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5 }, pointerEvents: 'auto' as const },
  };

  const formContainerVariants = {
    hidden: { opacity: 0, height: 0, marginBottom: '0rem', y: -50, transition: { duration: 0.5 } },
    visible: { opacity: 1, height: 'auto', marginBottom: '2rem', y: 0, transition: { duration: 0.5 } },
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
          <p className="font-mono text-gray-300 text-lg md:text-xl mt-4">Immutable Health Records on the Blockchain</p>
        </motion.div>
        <a href="#content" className="absolute bottom-10 animate-bounce">
          <FiChevronDown size={32} className="text-cyan-400" />
        </a>
      </div>

      {/* --- MAIN CONTENT SECTION --- */}
      <div id="content" className="p-4 md:p-8 lg:p-12 container mx-auto">
        <motion.div variants={itemVariants} className="glass-card p-4 rounded-2xl shadow-xl mb-8 flex items-center justify-center gap-4">
            <h2 className="text-lg font-bold text-white mr-4">Select View:</h2>
            <button onClick={() => setCurrentView('Org1MSP')} className={`px-4 py-2 rounded-lg font-semibold transition-all ${currentView === 'Org1MSP' ? 'bg-cyan-400 text-black' : 'bg-gray-700 text-white'}`}><FiUser className="inline mr-2"/>Org1</button>
            <button onClick={() => setCurrentView('Org2MSP')} className={`px-4 py-2 rounded-lg font-semibold transition-all ${currentView === 'Org2MSP' ? 'bg-green-400 text-black' : 'bg-gray-700 text-white'}`}><FiUsers className="inline mr-2"/>Org2</button>
            <button onClick={() => setCurrentView('Admin')} className={`px-4 py-2 rounded-lg font-semibold transition-all ${currentView === 'Admin' ? 'bg-purple-400 text-black' : 'bg-gray-700 text-white'}`}><FiEye className="inline mr-2"/>Admin</button>
        </motion.div>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="space-y-8"
        >
        
          <motion.div variants={formContainerVariants} animate={currentView !== 'Admin' ? 'visible' : 'hidden'} className="glass-card p-6 rounded-2xl shadow-2xl">
            <form onSubmit={handleCreate} className="flex flex-wrap items-center gap-4">
              <input type="text" placeholder="Record ID" value={newRecordID} onChange={(e) => setNewRecordID(e.target.value)} className="font-mono bg-gray-900/50 p-3 border border-cyan-400/20 rounded-lg flex-grow" required />
              <input type="text" placeholder="Patient ID" value={newPatientID} onChange={(e) => setNewPatientID(e.target.value)} className="font-mono bg-gray-900/50 p-3 border border-cyan-400/20 rounded-lg flex-grow" required />
              <input type="text" placeholder="Diagnostic Result" value={newDiagnosticResult} onChange={(e) => setNewDiagnosticResult(e.target.value)} className="font-mono bg-gray-900/50 p-3 border border-cyan-400/20 rounded-lg flex-grow" required />
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="submit" disabled={isLoading} className="font-mono bg-cyan-400 text-gray-900 font-bold p-3 rounded-lg w-full md:w-auto disabled:bg-gray-600">
                {isLoading ? 'Submitting...' : 'Submit Transaction'}
              </motion.button>
            </form>
          </motion.div>
          {message && <motion.p variants={itemVariants} className={`my-4 text-center ${message.toLowerCase().includes('failed') ? 'text-red-400' : 'text-green-400'}`}>{message}</motion.p>}
          <motion.div layout variants={itemVariants} className="glass-card p-6 rounded-2xl shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-cyan-400/20">
                    <th className="p-4">Record ID</th>
                    <th className="p-4">Patient ID</th>
                    <th className="p-4">Diagnostic Result</th>
                    <th className="p-4 hidden md:table-cell">Actions</th></tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={3} className="text-center p-4">Loading Records...</td>
                    </tr>
                   ) : records.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-4 text-center text-gray-500">No records found.</td>
                    </tr>
                  ) : (
                    records.map((record) => (
                      <tr key={record.recordID} className="border-b border-gray-700/50 hover:bg-gray-900/50 transition-colors">
                        <td className="p-4 font-mono text-gray-200">{record.recordID}</td>
                        <td className="p-4 font-mono text-gray-200">{record.patientID}</td>
                        <td className="p-4 font-mono text-gray-200">{record.diagnosticResult}</td>
                        <td className="p-4 ">
                          <div className="flex space-x-2">
                            <motion.button whileHover={{ scale: 1.1 }} onClick={() => handleShareAction(record, 'share')} className="bg-blue-500/80 p-2 rounded-full text-sm" title="Share with other Org">
                              <FiShare2 />
                            </motion.button>
                            <motion.button whileHover={{ scale: 1.1 }} onClick={() => handleShareAction(record, 'revoke')} className="bg-yellow-600/80 p-2 rounded-full text-sm" title="Revoke access from other Org">
                              <FiUserX />
                            </motion.button>
                            <motion.button whileHover={{ scale: 1.1 }} onClick={() => handleAction('history', record)} className="bg-gray-500/80 px-3 py-1 rounded-md text-sm">History</motion.button>
                            <motion.button whileHover={{ scale: 1.1 }} onClick={() => handleAction('delete', record)} className="bg-red-600/80 p-2 rounded-full text-sm">
                              <FiTrash2 />
                            </motion.button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
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
              {/* --- NEW: Delete Confirmation Modal --- */}
              {modal === 'delete' ? (
                <div className="space-y-4 text-center">
                  <h3 className="text-xl font-bold text-white">Confirm Deletion</h3>
                  <p className="text-gray-300">
                    Are you sure you want to delete record <br/>
                    <span className="font-mono text-yellow-400">{selectedRecord.recordID}</span>?
                    <br/>This action cannot be undone.
                  </p>
                  <div className="flex justify-end space-x-4 pt-4">
                    <motion.button whileHover={{ scale: 1.05 }} onClick={closeModal} className="bg-gray-500 text-white font-bold py-2 px-4 rounded-lg">Cancel</motion.button>
                    <motion.button whileHover={{ scale: 1.05 }} onClick={handleDeleteConfirm} disabled={isLoading} className="bg-red-600 text-white font-bold py-2 px-4 rounded-lg">
                      {isLoading ? 'Deleting...' : 'Confirm Delete'}
                    </motion.button>
                  </div>
                </div>
              ) : modal === 'history' ? (
                <pre className="bg-gray-900/70 text-cyan-300 text-xs p-4 rounded-lg overflow-auto max-h-96">{isLoading ? 'Loading History...' : JSON.stringify(history, null, 2)}</pre>
              ) : (
                <div>
                    <h3 className="text-xl font-bold text-white capitalize">{modal} Record</h3>
                    <p>Are you sure you want to {modal} this record with the other organization?</p>
                    <div className="flex justify-end space-x-4 pt-4">
                         <button onClick={closeModal}>Cancel</button>
                         {/* <button onClick={() => handleShareAction(modal as 'share' | 'revoke')} disabled={isLoading} className="bg-blue-500 text-white font-bold py-2 px-4 rounded-lg">
                              {isLoading ? 'Submitting...' : `Confirm ${modal}`}
                         </button> */}

                    </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}