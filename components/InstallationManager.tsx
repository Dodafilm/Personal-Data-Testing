'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Installation, DataScope } from '@/lib/types';

interface ConsentingUser {
  id: string;
  label: string;
}

const ROOMS = ['room-1', 'room-2', 'room-3', 'room-4'];
const SCOPES: DataScope[] = ['sleep', 'heart', 'workout', 'stress'];
const SCOPE_COLORS: Record<DataScope, string> = {
  sleep: '#6a5acd',
  heart: '#e74c3c',
  workout: '#2ecc71',
  stress: '#f39c12',
};

export default function InstallationManager() {
  const [installations, setInstallations] = useState<Installation[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form
  const [createName, setCreateName] = useState('');
  const [createRoom, setCreateRoom] = useState(ROOMS[0]);
  const [createScopes, setCreateScopes] = useState<DataScope[]>([]);
  const [createTimeout, setCreateTimeout] = useState(120);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editRoom, setEditRoom] = useState('');
  const [editScopes, setEditScopes] = useState<DataScope[]>([]);
  const [editTimeout, setEditTimeout] = useState(120);

  // API key visibility
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  // Device assignment
  const [consentingUsers, setConsentingUsers] = useState<ConsentingUser[]>([]);
  const [assignUserId, setAssignUserId] = useState('');
  const [assignIdentifier, setAssignIdentifier] = useState('');
  const [assignType, setAssignType] = useState('nfc');
  const [assignStatus, setAssignStatus] = useState('');

  const fetchInstallations = useCallback(async () => {
    try {
      const res = await fetch('/api/installation');
      if (res.ok) {
        const data = await res.json();
        setInstallations(data);
      }
    } catch (err) {
      console.error('Failed to fetch installations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchConsentingUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/device/assign');
      if (res.ok) {
        const data = await res.json();
        setConsentingUsers(data.users ?? []);
      }
    } catch (err) {
      console.error('Failed to fetch consenting users:', err);
    }
  }, []);

  useEffect(() => {
    fetchInstallations();
    fetchConsentingUsers();
  }, [fetchInstallations, fetchConsentingUsers]);

  const handleCreate = async () => {
    if (!createName.trim()) return;

    const res = await fetch('/api/installation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: createName.trim(),
        room: createRoom,
        dataScopes: createScopes,
        timeoutMin: createTimeout,
      }),
    });

    if (res.ok) {
      setCreateName('');
      setCreateScopes([]);
      setCreateTimeout(120);
      fetchInstallations();
    }
  };

  const handleUpdate = async (id: string) => {
    const res = await fetch(`/api/installation/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editName,
        room: editRoom,
        dataScopes: editScopes,
        timeoutMin: editTimeout,
      }),
    });

    if (res.ok) {
      setEditingId(null);
      fetchInstallations();
    }
  };

  const handleToggleActive = async (inst: Installation) => {
    await fetch(`/api/installation/${inst.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !inst.active }),
    });
    fetchInstallations();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this installation? All sessions will be removed.')) return;

    await fetch(`/api/installation/${id}`, { method: 'DELETE' });
    fetchInstallations();
  };

  const startEdit = (inst: Installation) => {
    setEditingId(inst.id);
    setEditName(inst.name);
    setEditRoom(inst.room);
    setEditScopes([...inst.dataScopes]);
    setEditTimeout(inst.timeoutMin);
  };

  const toggleKey = (id: string) => {
    setVisibleKeys(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const toggleCreateScope = (scope: DataScope) => {
    setCreateScopes(prev =>
      prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]
    );
  };

  const toggleEditScope = (scope: DataScope) => {
    setEditScopes(prev =>
      prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]
    );
  };

  const handleAssignDevice = async () => {
    if (!assignUserId || !assignIdentifier.trim()) return;
    setAssignStatus('');

    const res = await fetch('/api/device/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: assignIdentifier.trim(),
        userId: assignUserId,
        type: assignType,
      }),
    });

    if (res.ok) {
      setAssignIdentifier('');
      setAssignStatus('Device assigned successfully');
    } else {
      const data = await res.json();
      setAssignStatus(data.error || 'Failed to assign device');
    }
  };

  if (loading) return <p>Loading installations...</p>;

  return (
    <div className="installation-manager">
      {/* Create form */}
      <div className="installation-create-form">
        <h4>New Installation</h4>
        <input
          type="text"
          placeholder="Installation name"
          value={createName}
          onChange={e => setCreateName(e.target.value)}
          maxLength={100}
        />
        <select value={createRoom} onChange={e => setCreateRoom(e.target.value)}>
          {ROOMS.map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <div className="scope-checkboxes">
          {SCOPES.map(scope => (
            <label key={scope}>
              <input
                type="checkbox"
                checked={createScopes.includes(scope)}
                onChange={() => toggleCreateScope(scope)}
              />
              {scope}
            </label>
          ))}
        </div>
        <label>
          Timeout (min):
          <input
            type="number"
            value={createTimeout}
            onChange={e => setCreateTimeout(Number(e.target.value))}
            min={1}
            max={1440}
            style={{ width: 80, marginLeft: 8 }}
          />
        </label>
        <button className="btn btn-primary" onClick={handleCreate}>
          Create Installation
        </button>
      </div>

      {/* Installation list */}
      <div className="installation-list">
        {installations.map(inst => (
          <div key={inst.id} className="installation-card">
            {editingId === inst.id ? (
              // Edit form
              <div className="installation-edit-form">
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  maxLength={100}
                />
                <select value={editRoom} onChange={e => setEditRoom(e.target.value)}>
                  {ROOMS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <div className="scope-checkboxes">
                  {SCOPES.map(scope => (
                    <label key={scope}>
                      <input
                        type="checkbox"
                        checked={editScopes.includes(scope)}
                        onChange={() => toggleEditScope(scope)}
                      />
                      {scope}
                    </label>
                  ))}
                </div>
                <label>
                  Timeout (min):
                  <input
                    type="number"
                    value={editTimeout}
                    onChange={e => setEditTimeout(Number(e.target.value))}
                    min={1}
                    max={1440}
                    style={{ width: 80, marginLeft: 8 }}
                  />
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary" onClick={() => handleUpdate(inst.id)}>Save</button>
                  <button className="btn btn-secondary" onClick={() => setEditingId(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              // Display
              <>
                <div className="installation-card-header">
                  <h4>{inst.name}</h4>
                  <span className={`installation-status ${inst.active ? 'active' : 'inactive'}`}>
                    {inst.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="installation-card-details">
                  <span>Room: {inst.room}</span>
                  <span>Sessions: {inst.activeSessions ?? 0}</span>
                  <span>Timeout: {inst.timeoutMin}m</span>
                </div>
                <div className="installation-scopes">
                  {inst.dataScopes.map(scope => (
                    <span
                      key={scope}
                      className="scope-tag"
                      style={{ backgroundColor: SCOPE_COLORS[scope as DataScope] }}
                    >
                      {scope}
                    </span>
                  ))}
                </div>
                <div className="installation-api-key">
                  <span className="api-key-label">API Key:</span>
                  <code>
                    {visibleKeys.has(inst.id) ? inst.apiKey : '****-****-****'}
                  </code>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => toggleKey(inst.id)}
                  >
                    {visibleKeys.has(inst.id) ? 'Hide' : 'Show'}
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => copyToClipboard(inst.apiKey)}
                  >
                    Copy
                  </button>
                </div>
                <div className="installation-checkin-url">
                  <span>Check-in URL:</span>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => copyToClipboard(`${window.location.origin}/api/installation/${inst.id}/detect`)}
                  >
                    Copy URL
                  </button>
                </div>
                <div className="installation-actions">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleToggleActive(inst)}
                  >
                    {inst.active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => startEdit(inst)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(inst.id)}
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
        {installations.length === 0 && (
          <p className="setting-hint">No installations yet. Create one above.</p>
        )}
      </div>

      {/* Device Assignment */}
      <div className="installation-assign-section">
        <h4>Assign Device to User</h4>
        <p className="setting-hint">
          Assign a physical device (NFC wristband, RFID card, etc.) to a consenting participant.
        </p>
        <select
          value={assignUserId}
          onChange={e => setAssignUserId(e.target.value)}
        >
          <option value="">Select user...</option>
          {consentingUsers.map(u => (
            <option key={u.id} value={u.id}>{u.label}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Device identifier"
          value={assignIdentifier}
          onChange={e => setAssignIdentifier(e.target.value)}
          maxLength={256}
        />
        <select value={assignType} onChange={e => setAssignType(e.target.value)}>
          <option value="nfc">NFC</option>
          <option value="rfid">RFID</option>
          <option value="ble">BLE</option>
          <option value="other">Other</option>
        </select>
        <button className="btn btn-primary" onClick={handleAssignDevice}>
          Assign Device
        </button>
        {assignStatus && (
          <div className={`status-msg ${assignStatus.includes('success') ? 'success' : 'error'}`}>
            {assignStatus}
          </div>
        )}
      </div>
    </div>
  );
}
