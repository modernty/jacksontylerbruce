import React, { useEffect, useState } from 'react';
import { useWalletContext } from '@/context/WalletContext';

// iOS-style "Open in App" prompt — the system dialog that appears when a
// website detects you have its native app installed.
//
// Two-stage entrance: overlay fades in first (#29293A @ 23%), then the
// centered alert dialog scales/fades in.
export function OpenInAppModal() {
  const { isOpenInAppModalVisible, hideOpenInAppModal, launchWalletApp } = useWalletContext();

  // Two-stage visibility: overlay first, then dialog ~250ms later.
  const [overlayIn, setOverlayIn] = useState(false);
  const [dialogIn, setDialogIn] = useState(false);

  useEffect(() => {
    if (!isOpenInAppModalVisible) {
      setOverlayIn(false);
      setDialogIn(false);
      return;
    }
    // Trigger overlay on next frame so the transition runs.
    const overlayRaf = requestAnimationFrame(() => setOverlayIn(true));
    const dialogTimer = setTimeout(() => setDialogIn(true), 250);
    return () => {
      cancelAnimationFrame(overlayRaf);
      clearTimeout(dialogTimer);
    };
  }, [isOpenInAppModalVisible]);

  if (!isOpenInAppModalVisible) return null;

  const handleCancel = () => hideOpenInAppModal();
  const handleOpen = () => {
    hideOpenInAppModal();
    launchWalletApp();
  };

  return (
    <>
      {/* Overlay — #29293A @ 23%, fades in first */}
      <div
        onClick={handleCancel}
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 90,
          backgroundColor: 'rgba(41, 41, 58, 0.23)',
          opacity: overlayIn ? 1 : 0,
          transition: 'opacity 0.3s ease-out',
        }}
        aria-hidden="true"
      />

      {/* Dialog wrapper — centers the alert; ignores pointer events except the dialog itself */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 91,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          padding: 32,
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="open-in-app-title"
          style={{
            width: 270,
            background: 'rgba(245, 245, 245, 0.92)',
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            borderRadius: 14,
            overflow: 'hidden',
            opacity: dialogIn ? 1 : 0,
            transform: dialogIn ? 'scale(1)' : 'scale(0.92)',
            transition: 'opacity 0.22s ease-out, transform 0.22s ease-out',
            pointerEvents: 'auto',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.18)',
            fontFamily: '-apple-system, "SF Pro", "SF Pro Text", sans-serif',
          }}
        >
          {/* Title */}
          <div style={{ padding: '20px 16px 16px 16px', textAlign: 'center' }}>
            <p
              id="open-in-app-title"
              style={{
                margin: 0,
                fontSize: 17,
                fontWeight: 600,
                lineHeight: '22px',
                letterSpacing: '-0.4px',
                color: '#000000',
              }}
            >
              Open in &ldquo;Intuit Wallet&rdquo;?
            </p>
          </div>

          {/* Hairline divider above buttons */}
          <div style={{ height: 0.5, background: 'rgba(60, 60, 67, 0.36)' }} />

          {/* Button row */}
          <div style={{ display: 'flex', height: 44 }}>
            <button
              type="button"
              onClick={handleCancel}
              style={{
                flex: 1,
                height: '100%',
                border: 'none',
                background: 'transparent',
                color: '#236CFF',
                fontFamily: '-apple-system, "SF Pro", "SF Pro Text", sans-serif',
                fontSize: 17,
                fontWeight: 400,
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Cancel
            </button>
            {/* Vertical hairline between buttons */}
            <div style={{ width: 0.5, background: 'rgba(60, 60, 67, 0.36)' }} />
            <button
              type="button"
              onClick={handleOpen}
              style={{
                flex: 1,
                height: '100%',
                border: 'none',
                background: 'transparent',
                color: '#236CFF',
                fontFamily: '-apple-system, "SF Pro", "SF Pro Text", sans-serif',
                fontSize: 17,
                fontWeight: 600,
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Open
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
