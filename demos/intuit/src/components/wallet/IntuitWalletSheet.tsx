import React, { useEffect, useState } from 'react';
import { useWalletContext } from '@/context/WalletContext';
import { PhoneVerifyPage } from './PhoneVerifyPage';
import { WalletLoadingPage } from './WalletLoadingPage';
import { WalletPreviewPage } from './WalletPreviewPage';
import { WalletPaidNotificationPage } from './WalletPaidNotificationPage';
import { WalletConnectBankPage } from './WalletConnectBankPage';

export function IntuitWalletSheet() {
  const { isSheetOpen, page, isLockScreenVisible, closeSheet } = useWalletContext();

  // Don't render the sheet at all until the user has opened it at least once.
  // This prevents any rendering artifact on initial page load. Once opened,
  // it stays mounted so the slide-out close animation works correctly.
  const [hasEverOpened, setHasEverOpened] = useState(false);
  useEffect(() => {
    if (isSheetOpen) setHasEverOpened(true);
  }, [isSheetOpen]);

  if (!hasEverOpened) return null;

  return (
    <>
      {/* Backdrop — tap anywhere above the sheet to dismiss */}
      <div
        className="absolute inset-0 z-40"
        style={{ pointerEvents: isSheetOpen ? 'auto' : 'none' }}
        onClick={closeSheet}
        aria-hidden="true"
      />

      {/* Sheet — opacity-only animation. No slide. The sheet always sits at
          translateY(0) and fades in/out via opacity. This gives us a clean
          cross-fade with the lock screen and removes movement entirely.
          pointer-events disabled when invisible so it doesn't intercept clicks. */}
      <div
        className="absolute left-0 right-0 bottom-0 z-50 flex flex-col overflow-hidden"
        style={{
          top: 70,
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
          backgroundColor: page === 'paid_notification' ? '#236CFF' : 'white',
          opacity: (isSheetOpen && !isLockScreenVisible) ? 1 : 0,
          pointerEvents: (isSheetOpen && !isLockScreenVisible) ? 'auto' : 'none',
          transition: 'opacity 0.4s ease-out, background-color 0.5s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2 pb-1 flex-shrink-0">
          <div
            style={{
              width: 36,
              height: 5,
              borderRadius: 9999,
              background: page === 'paid_notification' ? 'rgba(255,255,255,0.5)' : '#D1D5DB',
            }}
          />
        </div>

        {/* Page content */}
        <div className="flex flex-col flex-1 min-h-0">
          {page === 'verify'            && <PhoneVerifyPage />}
          {page === 'loading'           && <WalletLoadingPage />}
          {page === 'preview'           && <WalletPreviewPage />}
          {page === 'paid_notification' && <WalletPaidNotificationPage />}
          {page === 'connect_bank'      && <WalletConnectBankPage />}
        </div>

        {/* Home indicator — desktop only */}
        <div className="hidden md:flex w-full items-center justify-center flex-shrink-0" style={{ height: 40 }}>
          <div
            style={{
              width: 139,
              height: 5,
              borderRadius: 9999,
              background: page === 'paid_notification' ? 'white' : 'black',
            }}
          />
        </div>
      </div>
    </>
  );
}
