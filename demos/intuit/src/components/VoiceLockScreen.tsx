import React, { useEffect, useState } from 'react';
import { useVoiceContext } from '@/context/VoiceContext';
import { useChatContext } from '@/context/ChatContext';
import { useInvoiceContext } from '@/context/InvoiceContext';
import chatgptIcon from '@/assets/chatgpt-icon.png';
import gmailIcon from '@/assets/gmail-icon.png';
import intuitWalletIcon from '@/assets/intuit-wallet-icon.png';
import lockScreenBg from '@/assets/lockscreen-bg.png';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBigTime(d: Date): string {
  const hours = d.getHours() % 12 || 12;
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function formatLockDate(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

// ── Notification card ─────────────────────────────────────────────────────────

interface NotificationProps {
  appName: string;
  title?: string;
  body: string;
  iconSrc: string;
  delay: number;
  onTap?: () => void;
}

function LockNotification({ appName, title, body, iconSrc, delay, onTap }: NotificationProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <button
      type="button"
      onClick={onTap}
      disabled={!visible || !onTap}
      style={{
        position: 'relative',
        width: '100%',
        textAlign: 'left',
        background: 'rgba(0, 0, 0, 0.08)',
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
        borderRadius: 24,
        padding: '14px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.18), 0 1px 1px rgba(0, 0, 0, 0.10)',
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.96)',
        transition: 'transform 0.5s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.4s ease-out',
        cursor: onTap ? 'pointer' : 'default',
        border: 'none',
        overflow: 'hidden',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <span
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(255, 255, 255, 0.07)',
          mixBlendMode: 'screen',
          borderRadius: 24,
          pointerEvents: 'none',
        }}
      />
      <span
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 24,
          padding: 1,
          background:
            'linear-gradient(135deg, rgba(255, 255, 255, 0.75) 0%, rgba(255, 255, 255, 0.10) 60%, rgba(255, 255, 255, 0.40) 100%)',
          WebkitMask:
            'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
          mask:
            'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
          pointerEvents: 'none',
        }}
      />

      <img
        src={iconSrc}
        alt=""
        style={{
          position: 'relative',
          zIndex: 1,
          width: 38.33,
          height: 38.33,
          borderRadius: 10,
          flexShrink: 0,
          display: 'block',
          objectFit: 'cover',
        }}
      />

      <div style={{ position: 'relative', zIndex: 1, flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
          <span style={{
            fontFamily: '-apple-system, "SF Pro", "SF Pro Text", sans-serif',
            fontSize: 15,
            fontWeight: 590,
            lineHeight: '17px',
            letterSpacing: '-0.23px',
            color: 'rgba(255,255,255,0.95)',
          }}>
            {appName}
          </span>
          <span style={{
            fontSize: 12,
            color: 'rgba(255,255,255,0.55)',
            fontFamily: '-apple-system, "SF Pro Text", sans-serif',
          }}>
            now
          </span>
        </div>

        {title && (
          <p style={{
            fontFamily: '-apple-system, "SF Pro", "SF Pro Text", sans-serif',
            fontSize: 14,
            fontWeight: 590,
            lineHeight: '16px',
            letterSpacing: '-0.23px',
            color: 'rgba(255,255,255,0.95)',
            margin: 0,
          }}>
            {title}
          </p>
        )}
        <p style={{
          fontFamily: '-apple-system, "SF Pro", "SF Pro Text", sans-serif',
          fontSize: 14,
          fontWeight: 400,
          lineHeight: '16px',
          letterSpacing: '-0.23px',
          color: 'rgba(255,255,255,0.95)',
          margin: 0,
        }}>
          {body}
        </p>
      </div>
    </button>
  );
}

// ── Voice-mode lock screen ────────────────────────────────────────────────────

export function VoiceLockScreen() {
  const { isVoiceLockScreenVisible, dismissVoiceLockScreen, resumeInTextMode } = useVoiceContext();
  const { dispatch: chatDispatch } = useChatContext();
  const { dispatch: invoiceDispatch } = useInvoiceContext();

  // Live clock — same pattern as LockScreen
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!isVoiceLockScreenVisible) return;
    const iv = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(iv);
  }, [isVoiceLockScreenVisible]);

  // Mount fade
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    if (isVoiceLockScreenVisible) {
      const t = requestAnimationFrame(() => setEntered(true));
      return () => cancelAnimationFrame(t);
    }
    setEntered(false);
  }, [isVoiceLockScreenVisible]);

  const handleResumeFromChatGPT = () => {
    // 1. Drop the lock screen
    dismissVoiceLockScreen();

    // 2. Switch the chat from voice-mode styling to text-mode styling.
    //    Keeps the existing conversation in place; tears down audio.
    resumeInTextMode();

    // 3. Lock the invoice context to "Maria Martinez paid the $800 deposit"
    //    so the paid card renders the deposit amount regardless of whatever
    //    Claude's tool calls populated during the voice turns.
    invoiceDispatch({
      type: 'UPDATE_FIELDS',
      fields: {
        clientName: 'Maria Martinez',
        services: [{ description: 'Wedding deposit (25%)', amount: 800 }],
      },
    });
    invoiceDispatch({ type: 'MARK_DEPOSIT_PAID' });

    // 4. Add an assistant message that starts in the "Asking Intuit"
    //    shimmer — same animation pattern as the regular paid flow.
    const paidId = `voice_deposit_paid_${Date.now()}`;
    chatDispatch({
      type: 'ADD_MESSAGE',
      message: {
        id: paidId,
        role: 'assistant',
        content: [{ type: 'intuit_status', status: 'drafting' }],
        status: 'complete',
        timestamp: Date.now(),
      },
    });

    // 5. After the Asking Intuit beat, drop the deposit-paid card.
    setTimeout(() => {
      chatDispatch({
        type: 'ADD_CONTENT_BLOCK',
        id: paidId,
        content: { type: 'invoice_paid_card' },
      });
    }, 2800);

    // 6. Follow-up text — streams in after the card animation completes (~4600ms).
    //    Brief typing-indicator beat first, then character-by-character.
    const followText =
      "The $800 deposit from Maria Martinez has been paid. You can view the details in your Intuit Wallet. Is there anything else I can help you with?";
    const followId = `voice_deposit_paid_followup_${Date.now()}`;

    setTimeout(() => {
      chatDispatch({
        type: 'ADD_MESSAGE',
        message: {
          id: followId,
          role: 'assistant',
          content: [],
          status: 'streaming',
          timestamp: Date.now(),
        },
      });

      setTimeout(() => {
        let i = 0;
        const stream = setInterval(() => {
          if (i >= followText.length) {
            clearInterval(stream);
            chatDispatch({ type: 'FINALIZE_MESSAGE', id: followId, status: 'complete' });
            return;
          }
          chatDispatch({ type: 'APPEND_TEXT', id: followId, text: followText[i] });
          i++;
        }, 22);
      }, 280);
    }, 4900);
  };

  if (!isVoiceLockScreenVisible) return null;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 70,
        backgroundImage: `url(${lockScreenBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundColor: '#0A0A0F',
        opacity: entered ? 1 : 0,
        transition: 'opacity 0.35s ease-out',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Reserve status-bar height */}
      <div style={{ height: 62, flexShrink: 0 }} />

      {/* Top: date + time */}
      <div
        style={{
          flexShrink: 0,
          paddingTop: 14,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
          color: 'white',
          position: 'relative',
        }}
      >
        <span style={{
          fontFamily: '-apple-system, "SF Pro Text", sans-serif',
          fontSize: 17,
          fontWeight: 500,
          letterSpacing: 0.2,
          opacity: 0.92,
        }}>
          {formatLockDate(now)}
        </span>
        <span style={{
          fontFamily: '-apple-system, "SF Pro Display", sans-serif',
          fontSize: 88,
          fontWeight: 200,
          lineHeight: 1,
          letterSpacing: -2,
          marginTop: 2,
        }}>
          {formatBigTime(now)}
        </span>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Notification stack — staggered fade-in to mirror LockScreen */}
      <div
        style={{
          position: 'relative',
          padding: '0 12px 120px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          flexShrink: 0,
        }}
      >
        <LockNotification
          appName="ChatGPT"
          title="🎉 Deposit received!"
          body="Maria Martinez paid your $800 deposit."
          iconSrc={chatgptIcon}
          delay={3400}
          onTap={handleResumeFromChatGPT}
        />
        <LockNotification
          appName="Intuit Wallet"
          title="Deposit Received from Maria Martinez"
          body="$800 deposit just landed. Access your funds now."
          iconSrc={gmailIcon}
          delay={3200}
        />
        <LockNotification
          appName="Intuit Wallet"
          title="You just received a deposit!"
          body="Maria Martinez paid your $800 deposit."
          iconSrc={intuitWalletIcon}
          delay={3000}
        />
      </div>

      {/* Home indicator */}
      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingBottom: 10,
        }}
      >
        <div style={{ width: 139, height: 5, borderRadius: 9999, background: 'rgba(255,255,255,0.85)' }} />
      </div>
    </div>
  );
}
