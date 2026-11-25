import React, { useEffect, useRef, useState } from 'react';
import { InvoiceProvider } from '@/context/InvoiceContext';
import { ChatProvider } from '@/context/ChatContext';
import { WalletProvider, useWalletContext } from '@/context/WalletContext';
import { VoiceProvider, useVoiceContext } from '@/context/VoiceContext';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { MessageList } from '@/components/chat/MessageList';
import { InputBar } from '@/components/chat/InputBar';
import { VoiceOrb } from '@/components/chat/VoiceOrb';
import { StatusBar } from '@/components/StatusBar';
import { IntuitWalletSheet } from '@/components/wallet/IntuitWalletSheet';
import { NotificationBanner } from '@/components/NotificationBanner';
import { LockScreen } from '@/components/LockScreen';
import { VoiceLockScreen } from '@/components/VoiceLockScreen';
import { OpenInAppModal } from '@/components/wallet/OpenInAppModal';
import { WalletAppOverlay } from '@/components/wallet/WalletAppOverlay';

function HomeIndicator() {
  return (
    <div className="hidden md:flex w-full items-center justify-center flex-shrink-0" style={{ height: 21 }}>
      <div style={{ width: 139, height: 5, borderRadius: 9999, background: 'black' }} />
    </div>
  );
}

function ChatScreen() {
  const { isVoiceMode } = useVoiceContext();
  return (
    <div className="relative flex flex-col flex-1 min-h-0" data-demo="chat-screen">
      {/* Spacer reserves the 62px StatusBar height inside the layout */}
      <div className="hidden md:block flex-shrink-0" style={{ height: 62 }} />
      <ChatHeader />
      <MessageList />
      <InputBar />
      {isVoiceMode && <VoiceOrb />}
      <HomeIndicator />
    </div>
  );
}

function AppContent() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { isSheetOpen, page, isLockScreenVisible, walletAppView } = useWalletContext();
  const { isVoiceLockScreenVisible } = useVoiceContext();
  const anyLockVisible = isLockScreenVisible || isVoiceLockScreenVisible;
  const isWalletAppVisible = walletAppView !== null;

  // Increment the banner trigger every time the user lands on the verify page
  // with the sheet open. The banner itself owns its show/hide timing — we only
  // tell it WHEN to fire. This keeps the banner's lifecycle independent of
  // page navigation: if the user enters the code before the banner naturally
  // expires, the banner still finishes its cycle on its own schedule.
  const [bannerTrigger, setBannerTrigger] = useState(0);
  useEffect(() => {
    if (isSheetOpen && page === 'verify') {
      setBannerTrigger((t) => t + 1);
    }
  }, [isSheetOpen, page]);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      const el = containerRef.current;
      if (!el || window.innerWidth >= 768) return;
      // Account for both keyboard height and any upward scroll of the visual viewport
      const bottom = Math.max(0, window.innerHeight - vv.offsetTop - vv.height);
      el.style.bottom = `${bottom}px`;
    };

    const onFocusIn = (e: FocusEvent) => {
      if (window.innerWidth >= 768) return;
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) {
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
      }
    };

    const onFocusOut = () => {
      if (window.innerWidth >= 768) return;
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      const el = containerRef.current;
      if (el) el.style.bottom = '0px';
    };

    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);

    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, []);

  return (
    <div className="md:min-h-screen md:bg-[#F0F0F0] md:flex md:items-center md:justify-center">
      {/* Phone frame — bg-black reveals behind scaled chat when sheet opens */}
      <div
        ref={containerRef}
        data-demo="phone"
        className="fixed inset-0 overflow-hidden bg-white md:bg-black
                   md:static md:inset-auto md:h-[874px] md:w-[402px] md:rounded-[44px]
                   md:flex-shrink-0 md:relative
                   md:shadow-[0_32px_80px_rgba(0,0,0,0.18),0_8px_24px_rgba(0,0,0,0.10)]"
      >
        {/* StatusBar — outside the scaled div so opacity/transform don't affect it.
            z-[100] keeps it above every overlay (lock screen z-70, sheet z-50,
            modal z-90/91, wallet-app overlay z-90) — matches iOS where the
            system status bar always sits on top.
            White bg when chat is the active surface so the black bezel can't bleed
            through behind the StatusBar; transparent when sheet/lock screen are open
            so their backgrounds show through. */}
        <div
          className="hidden md:absolute md:block top-0 left-0 right-0 z-[100]"
          style={{
            backgroundColor: isSheetOpen || anyLockVisible || isWalletAppVisible ? 'transparent' : 'white',
            transition: 'background-color 0.3s ease-out',
          }}
        >
          <StatusBar />
        </div>

        {/* Chat content — scales back when sheet OR lock screen is up.
            Keeping it scaled during the lock-screen transition prevents an
            ugly "scale-up" snap when the sheet fades out. */}
        <div
          className="flex flex-col h-full overflow-hidden bg-white"
          style={{
            transform: (isSheetOpen || anyLockVisible) ? 'translateY(62px) scale(0.92)' : 'translateY(0px) scale(1)',
            borderRadius: (isSheetOpen || anyLockVisible) ? '44px' : '0px',
            transformOrigin: 'center top',
            opacity: (isSheetOpen || anyLockVisible) ? 0.5 : 1,
            transition: 'transform 0.45s cubic-bezier(0.32, 0.72, 0, 1), border-radius 0.45s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.45s cubic-bezier(0.32, 0.72, 0, 1)',
          }}
        >
          <ChatScreen />
        </div>

        {/* Wallet bottom sheet */}
        <IntuitWalletSheet />

        {/* Simulated iPhone SMS notification */}
        <NotificationBanner trigger={bannerTrigger} />

        {/* Simulated lock screen — appears when user taps "Download the app" */}
        <LockScreen />

        {/* Voice-mode lock screen — appears when the orb is tapped after both
            scripted voice turns have completed. Tapping the ChatGPT
            notification resumes the same conversation in text-mode styling
            and streams in the deposit-paid card. */}
        <VoiceLockScreen />

        {/* iOS-style "Open in Intuit Wallet?" alert — fires 3s after the
            wallet preview lands in the post-paid state. */}
        <OpenInAppModal />

        {/* Simulated Intuit Wallet "app" experience — launch screen → home.
            Triggered when the user taps "Open" in OpenInAppModal. Sits at z-90,
            below the system StatusBar (z-100). */}
        <WalletAppOverlay />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <InvoiceProvider>
      <ChatProvider>
        <WalletProvider>
          <VoiceProvider>
            <AppContent />
          </VoiceProvider>
        </WalletProvider>
      </ChatProvider>
    </InvoiceProvider>
  );
}
