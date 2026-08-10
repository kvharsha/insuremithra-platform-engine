import React, { useEffect, useState } from 'react';
import api from '../services/api';

export default function AdminBackups() {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/backups');
      setBackups(res.data.data || res.data);
    } catch (err) {
      console.error('[AdminBackups] Failed to fetch backups', err);
      alert('Failed to fetch backups');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchBackups(); }, []);

  const runNow = async () => {
    if (!window.confirm('Run backup now?')) return;
    try {
      const resp = await api.post('/admin/backups/run');
      if (resp.status === 202 || resp.data?.success) {
        alert('Backup started. Refreshing list.');
        fetchBackups();
      } else {
        alert('Failed to trigger backup');
      }
    } catch (err) {
      console.error('[AdminBackups] Failed to trigger backup', err);
      alert('Failed to trigger backup');
    }
  };

  const restore = async (name) => {
    if (!window.confirm(`Restore backup ${name}? This will overwrite current data.`)) return;
    setLoading(true);
    try {
      const resp = await api.post('/admin/backups/restore', { backupName: name });
      if (resp.status === 200 || resp.data?.success) {
        alert('Restore completed successfully!');
        fetchBackups();
      } else {
        const errMsg = resp.data?.details || resp.data?.error || 'Restore failed';
        alert('Restore failed: ' + errMsg);
      }
    } catch (err) {
      console.error('[AdminBackups] Restore failed', err);
      const errMsg = err.response?.data?.details || err.response?.data?.error || err.message || 'Unknown error';
      alert('Restore failed: ' + errMsg);
    } finally {
      setLoading(false);
    }
  };

  const download = (name) => {
    try {
      console.log('[AdminBackups] Downloading:', name);
      // Use API base URL from axios instance and add Authorization header via anchor with token
      const base = (api && api.defaults && api.defaults.baseURL) ? api.defaults.baseURL.replace(/\/$/, '') : 'http://localhost:5001/api';
      const token = localStorage.getItem('token');
      
      // Create hidden link to download with proper auth
      const link = document.createElement('a');
      link.href = `${base}/admin/backups/download?name=${encodeURIComponent(name)}&token=${encodeURIComponent(token || '')}`;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('[AdminBackups] Download failed', err);
      alert('Download failed: ' + (err.message || 'Unknown error'));
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Backups</h2>
      <button onClick={runNow} disabled={loading}>Run Backup Now</button>
      <div style={{ marginTop: 12 }}>
        {loading ? <div>Loading...</div> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Size</th>
                <th>Modified</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {backups.length === 0 && <tr><td colSpan={4}>No backups found</td></tr>}
              {backups.map(b => (
                <tr key={b.name}>
                  <td>{b.name}</td>
                  <td>{b.sizeHuman || b.sizeBytes}</td>
                  <td>{new Date(b.mtime).toLocaleString()}</td>
                  <td>
                    <button onClick={() => download(b.name)}>Download</button>
                    <button onClick={() => restore(b.name)}>Restore</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
