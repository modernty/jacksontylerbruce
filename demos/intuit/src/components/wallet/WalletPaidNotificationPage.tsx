import React from 'react';
import { useWalletContext } from '@/context/WalletContext';
import { ConnectBankCard } from './ConnectBankCard';
import walletWordmark from '@/assets/wallet-wordmark.svg';

function CloseIconWhite() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M15 5L5 15" stroke="white" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5 5L15 15" stroke="white" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function WalletPaidNotificationPage() {
  const { closeSheet, goToConnectBank } = useWalletContext();

  // Staggered entrance — sheet bg fades white→blue (0.5s) while content
  // fades in on a cascade: wordmark/close → label → amount → bottom block.
  const fadeIn = (delay: number, duration = 0.4) => ({
    opacity: 0,
    animation: `fade-in ${duration}s ease-out ${delay}s forwards`,
  } as const);

  return (
    <div
      className="relative h-full overflow-hidden"
      style={{
        // No bg — let the sheet's animated background-color show through so the
        // blue fades in continuously across the whole sheet area.
        fontFamily: "'Avenir Next', Avenir, sans-serif",
      }}
    >
      {/* Close button — white styled, top-right */}
      <button
        onClick={closeSheet}
        aria-label="Close"
        style={{
          position: 'absolute',
          top: 12,
          right: 20,
          width: 36,
          height: 36,
          borderRadius: 9999,
          background: 'rgba(255, 255, 255, 0.18)',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          ...fadeIn(0.25),
        }}
      >
        <CloseIconWhite />
      </button>

      {/* Intuit Wallet wordmark — top-left */}
      <img
        src={walletWordmark}
        alt="Intuit Wallet"
        style={{
          position: 'absolute',
          top: 40,
          left: 20,
          display: 'block',
          ...fadeIn(0.25),
        }}
      />

      {/* Amount block — absolutely positioned 226px from top of sheet */}
      <div
        style={{
          position: 'absolute',
          top: 226,
          left: 20,
          right: 20,
          textAlign: 'left',
          color: 'white',
        }}
      >
        <p
          style={{
            margin: 0,
            marginBottom: 16,
            fontFamily: "'Avenir Next', Avenir, sans-serif",
            fontSize: 16,
            fontWeight: 500,
            lineHeight: '120%',
            color: 'white',
            ...fadeIn(0.5),
          }}
        >
          ACME Corporation paid your invoice!
        </p>
        <p
          style={{
            margin: 0,
            fontFamily: "'Avenir Next', Avenir, sans-serif",
            fontSize: 36,
            fontWeight: 600,
            lineHeight: '120%',
            color: 'white',
            ...fadeIn(0.75),
          }}
        >
          $6,500
        </p>
      </div>

      {/* Bottom block — supporting text + ConnectBankCard, 40px from device bottom */}
      <div
        style={{
          position: 'absolute',
          left: 20,
          right: 20,
          bottom: 40,
          ...fadeIn(1.0, 0.5),
        }}
      >
        <p
          style={{
            margin: 0,
            marginBottom: 16,
            fontFamily: "'Avenir Next', Avenir, sans-serif",
            fontSize: 16,
            fontWeight: 600,
            lineHeight: '150%',
            color: 'white',
          }}
        >
          Your money is ready. Verify your bank account to receive your funds instantly.
        </p>
        <ConnectBankCard onClick={goToConnectBank} />
      </div>
    </div>
  );
}
