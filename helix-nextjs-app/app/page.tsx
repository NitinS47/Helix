// app/page.tsx
'use client';
import { useState } from 'react';

export default function HomePage() {
  // State for the create form
  const [recordID, setRecordID] = useState('');
  const [patientID, setPatientID] = useState('');
  const [recordType, setRecordType] = useState('');
  
  // State for the query form
  const [queryId, setQueryId] = useState('');

  // State for displaying results and loading status
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [queryResult, setQueryResult] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    setQueryResult('');

    try {
      const response = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordID,
          patientID,
          recordType,
          recordDataHash: 'dummy_hash_for_now_' + Math.random(),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create record.');
      }
      setMessage(data.message);
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    setQueryResult('');

    try {
      const response = await fetch(`/api/records/${queryId}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to query record.');
      }
      setQueryResult(JSON.stringify(data, null, 2));
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="container mx-auto p-8 font-sans">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Project Helix</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Create Record Form */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4 text-gray-700">Create Health Record</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <input
              type="text"
              placeholder="Record ID (e.g., RECORD_101)"
              value={recordID}
              onChange={(e) => setRecordID(e.target.value)}
              className="w-full p-2 border rounded"
              required
            />
            <input
              type="text"
              placeholder="Patient ID (e.g., patient_Bob)"
              value={patientID}
              onChange={(e) => setPatientID(e.target.value)}
              className="w-full p-2 border rounded"
              required
            />
            <input
              type="text"
              placeholder="Record Type (e.g., Prescription)"
              value={recordType}
              onChange={(e) => setRecordType(e.target.value)}
              className="w-full p-2 border rounded"
              required
            />
            <button type="submit" disabled={isLoading} className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:bg-gray-400">
              {isLoading ? 'Creating...' : 'Create Record'}
            </button>
          </form>
        </div>

        {/* Query Record Form */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4 text-gray-700">Query Health Record</h2>
          <form onSubmit={handleQuery} className="space-y-4">
            <input
              type="text"
              placeholder="Enter Record ID to Query"
              value={queryId}
              onChange={(e) => setQueryId(e.target.value)}
              className="w-full p-2 border rounded"
              required
            />
            <button type="submit" disabled={isLoading} className="w-full bg-green-500 text-white p-2 rounded hover:bg-green-600 disabled:bg-gray-400">
              {isLoading ? 'Querying...' : 'Query Record'}
            </button>
          </form>
        </div>
      </div>

      {/* Results Area */}
      <div className="mt-8 bg-gray-50 p-6 rounded-lg shadow-inner">
        <h3 className="text-xl font-semibold text-gray-600">Results</h3>
        {message && <p className={`mt-2 text-sm ${message.includes('Failed') ? 'text-red-500' : 'text-green-600'}`}>{message}</p>}
        {queryResult && (
          <pre className="mt-2 p-4 bg-gray-800 text-white rounded-md text-sm whitespace-pre-wrap">
            {queryResult}
          </pre>
        )}
      </div>
    </main>
  );
}