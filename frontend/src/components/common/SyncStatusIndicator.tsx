import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle, Cloud, CloudOff, Download } from 'lucide-react';
import { storage } from '../../lib/storage';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

export const SyncStatusIndicator: React.FC = () => {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(storage.isOnline());
  const [pendingCount, setPendingCount] = useState(() => storage.getSyncQueue(user?.id).length);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const handleStatus = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setIsOnline(customEvent.detail.isOnline);
        setPendingCount(customEvent.detail.pendingCount);
        setIsSyncing(customEvent.detail.isSyncing);
      } else {
        setIsOnline(navigator.onLine);
        setPendingCount(storage.getSyncQueue(user?.id).length);
      }
    };

    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Connection restored! Syncing with cloud...', { id: 'online-toast', duration: 3000 });
      storage.processSyncQueue(user?.id);
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast('You are offline. StudyFlow will save all tasks locally on this device.', {
        id: 'offline-toast',
        icon: '📡',
        duration: 4000,
      });
    };

    window.addEventListener('studyflow_sync_status', handleStatus);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    setIsOnline(navigator.onLine);
    setPendingCount(storage.getSyncQueue(user?.id).length);

    return () => {
      window.removeEventListener('studyflow_sync_status', handleStatus);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user?.id]);

  const handleManualSync = async () => {
    if (!isOnline) {
      toast.error('Device is currently offline. Connect to internet to sync.');
      return;
    }
    setIsSyncing(true);
    const result = await storage.processSyncQueue(user?.id);
    setIsSyncing(false);
    setPendingCount(storage.getSyncQueue(user?.id).length);
    if (result.success > 0) {
      toast.success(`Synced ${result.success} offline changes with cloud!`);
    } else {
      toast.success('All local changes are already up to date!');
    }
  };

  const handleExport = () => {
    const jsonStr = storage.exportAllData(user?.id);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `studyflow_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Backup downloaded to device!');
  };

  return (
    <>
      <button
        className={`sync-status-badge ${!isOnline ? 'sync-status-badge--offline' : isSyncing ? 'sync-status-badge--syncing' : pendingCount > 0 ? 'sync-status-badge--pending' : 'sync-status-badge--synced'}`}
        onClick={() => setShowDetails(!showDetails)}
        title={!isOnline ? 'Offline: changes saved on device' : isSyncing ? 'Syncing...' : `${pendingCount} changes pending sync`}
        aria-label="Offline and cloud sync status"
      >
        {!isOnline ? (
          <>
            <CloudOff size={13} className="sync-status-icon" />
            <span className="sync-status-label">Offline (Device Saved)</span>
          </>
        ) : isSyncing ? (
          <>
            <RefreshCw size={13} className="sync-status-icon spin" />
            <span className="sync-status-label">Syncing...</span>
          </>
        ) : pendingCount > 0 ? (
          <>
            <Cloud size={13} className="sync-status-icon" />
            <span className="sync-status-label">{pendingCount} Pending Sync</span>
          </>
        ) : (
          <>
            <CheckCircle size={13} className="sync-status-icon sync-status-icon--synced" />
            <span className="sync-status-label">Synced</span>
          </>
        )}
      </button>

      {showDetails && (
        <div className="sync-popover-overlay" onClick={() => setShowDetails(false)}>
          <div className="sync-popover" onClick={e => e.stopPropagation()}>
            <div className="sync-popover__header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {isOnline ? <Wifi size={16} color="#22c55e" /> : <WifiOff size={16} color="#f59e0b" />}
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {isOnline ? 'Connected to Internet' : 'Offline Mode Active'}
                </h4>
              </div>
              <button className="sync-popover__close" onClick={() => setShowDetails(false)}>✕</button>
            </div>

            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '8px 0 14px', lineHeight: 1.5 }}>
              {!isOnline
                ? 'Your device is offline. You can create, edit, and complete tasks as normal — everything is saved directly in your phone storage and will sync automatically when you reconnect.'
                : pendingCount > 0
                ? `You have ${pendingCount} offline change${pendingCount > 1 ? 's' : ''} waiting to be uploaded to cloud.`
                : 'All your local tasks, study plans, sessions, and quizzes are fully synced and backed up.'}
            </p>

            <div style={{ display: 'flex', gap: 8 }}>
              {isOnline && pendingCount > 0 && (
                <button
                  className="btn btn--primary btn--sm"
                  style={{ flex: 1, fontSize: 12, padding: '6px 12px' }}
                  onClick={handleManualSync}
                  disabled={isSyncing}
                >
                  <RefreshCw size={12} className={isSyncing ? 'spin' : ''} />
                  <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
                </button>
              )}
              <button
                className="btn btn--secondary btn--sm"
                style={{ flex: 1, fontSize: 12, padding: '6px 12px' }}
                onClick={handleExport}
              >
                <Download size={12} />
                <span>Save Backup</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
