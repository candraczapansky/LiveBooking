import React, { useState } from 'react';
import Papa from 'papaparse';

const ClientsImportPage: React.FC = () => {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCsvFile(e.target.files[0]);
      setResults(null);
      setError(null);
      Papa.parse(e.target.files[0], {
        header: true,
        skipEmptyLines: true,
        complete: (res) => {
          setClients(res.data as any[]);
        },
        error: (err) => setError(err.message),
      });
    }
  };

  const handleImport = async () => {
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const response = await fetch('/api/clients/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clients }),
      });
      const data = await response.json();
      setResults(data);
    } catch (err: any) {
      setError(err.message || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', padding: 24, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #eee' }}>
      <h2>Import Clients from CSV</h2>
      <input type="file" accept=".csv" onChange={handleFileChange} />
      {clients.length > 0 && (
        <>
          <h4>Preview ({clients.length} rows):</h4>
          <table border={1} cellPadding={4} style={{ width: '100%', marginBottom: 16 }}>
            <thead>
              <tr>
                <th>First Name</th>
                <th>Last Name</th>
                <th>Email</th>
                <th>Phone</th>
              </tr>
            </thead>
            <tbody>
              {clients.slice(0, 10).map((c, i) => (
                <tr key={i}>
                  <td>{c.firstName}</td>
                  <td>{c.lastName}</td>
                  <td>{c.email}</td>
                  <td>{c.phone}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={handleImport} disabled={loading} style={{ padding: '8px 24px', fontSize: 16 }}>
            {loading ? 'Importing...' : 'Import'}
          </button>
        </>
      )}
      {results && (
        <div style={{ marginTop: 24 }}>
          <h4>Import Results</h4>
          <pre style={{ background: '#f6f6f6', padding: 12, borderRadius: 4 }}>{JSON.stringify(results, null, 2)}</pre>
        </div>
      )}
      {error && <div style={{ color: 'red', marginTop: 16 }}>{error}</div>}
    </div>
  );
};

export default ClientsImportPage; 