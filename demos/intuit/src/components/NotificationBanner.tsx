import React, { useEffect, useState } from 'react';
import imessageIcon from '../assets/imessage-icon.png';
import { useWalletContext } from '@/context/WalletContext';

interface Props {
  // Parent increments this counter to fire the banner. The banner runs its
  // own show/hide cycle internally, so once triggered it completes regardless
  // of any subsequent parent state changes (page navigation, sheet close, etc.).
  trigger: number;
}

function MessagesIcon() {
  return (
    <img
      src={imessageIcon}
      alt=""
      style={{
        width: 38,
        height: 38,
        borderRadius: 10,
        flexShrink: 0,
        display: 'block',
      }}
    />
  );
}

export function NotificationBanner({ trigger }: Props) {
  const [visible, setVisible] = useState(false);
  const { verificationCode } = useWalletContext();

  // Each time `trigger` increments, run the full in-and-out cycle.
  // 1500ms → slide in, 6000ms → slide out. Cycle is self-contained: parent
  // state changes don't interrupt or cancel it.
  useEffect(() => {
    if (trigger === 0) return; // initial value, no fire yet
    setVisible(false);
    const showTimer = setTimeout(() => setVisible(true), 1500);
    const hideTimer = setTimeout(() => setVisible(false), 6000);
    return () => { clearTimeout(showTimer); clearTimeout(hideTimer); };
  }, [trigger]);

  return (
    <div
      style={{
        position: 'absolute',
        top: 40,
        left: 12,
        right: 12,
        zIndex: 60,
        transform: visible ? 'translateY(0)' : 'translateY(-150%)',
        transition: visible
          ? 'transform 0.45s cubic-bezier(0.32, 0.72, 0, 1)'
          : 'transform 0.3s cubic-bezier(0.4, 0, 1, 1)',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      <div style={{
        background: 'rgba(40, 40, 40, 0.88)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderRadius: 16,
        padding: '13px 17px 13px 13px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.3), 0 1px 4px rgba(0,0,0,0.2)',
        display: 'flex',
        gap: 10,
        alignItems: 'center',
      }}>
        <MessagesIcon />

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Header row: app name + timestamp */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 0 }}>
            <span style={{
              fontFamily: '-apple-system, "SF Pro", "SF Pro Text", sans-serif',
              fontSize: 15,
              fontWeight: 590,
              lineHeight: '17px',
              color: 'rgba(255,255,255,0.9)',
            }}>
              Messages
            </span>
            <span style={{
              fontSize: 12,
              color: 'rgba(255,255,255,0.4)',
              fontFamily: '-apple-system, "SF Pro Text", sans-serif',
            }}>
              now
            </span>
          </div>

          {/* Message body */}
          <p style={{
            fontFamily: '-apple-system, "SF Pro", "SF Pro Text", sans-serif',
            fontSize: 15,
            fontWeight: 400,
            lineHeight: '18px',
            color: 'rgba(255,255,255,0.75)',
            margin: 0,
          }}>
            Your Intuit verification code is {verificationCode}. Do not share this code.
          </p>
        </div>
      </div>
    </div>
  );
}
