import React, { useEffect, useState } from 'react';
import { useWalletContext } from '@/context/WalletContext';
import { useChatContext } from '@/context/ChatContext';
import { useInvoiceContext, computeTotal } from '@/context/InvoiceContext';
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

function formatAmount(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
  }).format(n);
}

// ── Notification card ─────────────────────────────────────────────────────────

interface NotificationProps {
  appName: string;
  title?: string;
  body: string;
  iconBg?: string;
  iconLetter?: string;
  iconLetterColor?: string;
  iconSrc?: string;
  delay: number;
  onTap?: () => void;
}

function LockNotification({ appName, title, body, iconBg, iconLetter, iconLetterColor = 'white', iconSrc, delay, onTap }: NotificationProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <button
      type="button"
      onClick={onTap}
      data-demo={onTap ? "notification" : undefined}
      disabled={!visible || !onTap}
      style={{
        position: 'relative',
        width: '100%',
        textAlign: 'left',
        // Liquid-glass card per Figma: dark 8% tint + 40px backdrop blur,
        // overlaid with a screen-blended white 7% sheen for the iOS-18 look.
        // The 135° gradient stroke is rendered by the masked ring child below.
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
      {/* Glass-effect sheen — white 7% with mix-blend screen, per Figma "Glass Effect" layer */}
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

      {/* 135° gradient stroke — masked so it paints ONLY the 1px ring, not the surface */}
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

      {/* Icon — PNG when provided, colored letter placeholder otherwise */}
      {iconSrc ? (
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
      ) : (
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            width: 38.33,
            height: 38.33,
            borderRadius: 10,
            background: iconBg ?? '#444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            fontFamily: '-apple-system, "SF Pro Text", sans-serif',
            fontSize: 18,
            fontWeight: 700,
            color: iconLetterColor,
          }}
        >
          {iconLetter}
        </div>
      )}

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
          fontStyle: 'normal',
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

// ── Lock screen ───────────────────────────────────────────────────────────────

export function LockScreen() {
  const { isLockScreenVisible, dismissLockScreen } = useWalletContext();
  const { dispatch: chatDispatch } = useChatContext();
  const { state: invoiceState, dispatch: invoiceDispatch } = useInvoiceContext();

  const clientName = invoiceState.data.clientName || 'Your client';
  const total = computeTotal(invoiceState.data);
  const totalStr = formatAmount(total);

  // Live clock — mirrors StatusBar pattern
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!isLockScreenVisible) return;
    const iv = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(iv);
  }, [isLockScreenVisible]);

  // Mount fade
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    if (isLockScreenVisible) {
      const t = requestAnimationFrame(() => setEntered(true));
      return () => cancelAnimationFrame(t);
    }
    setEntered(false);
  }, [isLockScreenVisible]);

  const handleResumeFromChatGPT = () => {
    // 1. Dismiss lock screen
    dismissLockScreen();

    // 2. Mark invoice as paid in InvoiceContext
    invoiceDispatch({ type: 'MARK_PAID' });

    // 3. Add an assistant message that starts in the "Asking Intuit" shimmer
    //    state — same animation pattern AiMessage uses for invoice drafting.
    //    The paid card is appended to this same message ~2.8s later, after
    //    the shimmer + typewriter sequence completes.
    const paidId = `paid_${Date.now()}`;
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

    // 4. After the Asking Intuit beat finishes, drop the paid card into
    //    the same message so it lands when AiMessage transitions to 'invoice' phase.
    //
    //    Timeline reference:
    //      t=0         intuit_status:'drafting' → "Asking Intuit" shimmer
    //      t≈3000      phase → 'badge' → typewriter "Intuit"
    //      t≈3900      phase → 'invoice' → card starts animate-invoice-in (700ms)
    //      t≈4600      card animation complete
    //      t≈4900      typing indicator + streamed text begins
    setTimeout(() => {
      chatDispatch({
        type: 'ADD_CONTENT_BLOCK',
        id: paidId,
        content: { type: 'invoice_paid_card' },
      });
    }, 2800);

    // 5. Follow-up text — streams in (char by char) AFTER the card animation
    //    completes (~4600ms). Show the typing indicator first, then stream.
    const followText = `Nice — ${clientName} just paid you ${totalStr}. The funds are in your Intuit Wallet.`;
    const followId = `paid_followup_${Date.now()}`;

    setTimeout(() => {
      // Empty message in 'streaming' status renders the typing indicator.
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

      // Brief typing-indicator beat before chars appear.
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

  if (!isLockScreenVisible) return null;

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

      {/* Top: lock icon + date + time */}
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

      {/* Notification stack */}
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
          title="🎉 You just got paid!"
          body="ACME Corporation paid your invoice for $6,500."
          iconSrc={chatgptIcon}
          delay={3400}
          onTap={handleResumeFromChatGPT}
        />
        <LockNotification
          appName="Intuit Wallet"
          title="Payment Received from ACME Corporation"
          body="ACME Corporation paid your invoice for $6,500. Access your funds now."
          iconSrc={gmailIcon}
          delay={3200}
        />
        <LockNotification
          appName="Intuit Wallet"
          title="You just received a payment!"
          body="ACME Corporation paid your invoice!"
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
