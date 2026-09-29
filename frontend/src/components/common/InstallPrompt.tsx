import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed as PWA / WebAPK)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    const dismissedUntil = localStorage.getItem('studyflow_pwa_dismissed_until');
    if (dismissedUntil && Date.now() < Number(dismissedUntil)) {
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setVisible(false);
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.error('Install prompt error:', err);
    }
  };

  const handleDismiss = () => {
    setVisible(false);
    // Suppress prompt for 3 days after user dismisses
    localStorage.setItem('studyflow_pwa_dismissed_until', String(Date.now() + 3 * 24 * 60 * 60 * 1000));
  };

  if (isInstalled || !visible) return null;

  return (
    <div className="pwa-install-banner" role="banner" aria-label="Install mobile app">
      <div className="pwa-install-banner__content">
        <div className="pwa-install-banner__icon">
          <Smartphone size={20} className="pwa-phone-icon" />
        </div>
        <div className="pwa-install-banner__text">
          <span className="pwa-install-banner__title">Install StudyFlow AI App</span>
          <span className="pwa-install-banner__desc">Install on Android for fast offline access & full screen</span>
        </div>
      </div>
      <div className="pwa-install-banner__actions">
        <button
          className="btn btn--primary btn--sm pwa-install-btn"
          onClick={handleInstallClick}
        >
          <Download size={14} />
          <span>Install</span>
        </button>
        <button
          className="pwa-dismiss-btn"
          onClick={handleDismiss}
          aria-label="Dismiss install banner"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};
