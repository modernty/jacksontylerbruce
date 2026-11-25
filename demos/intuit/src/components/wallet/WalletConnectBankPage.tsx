import React from 'react';
import { useWalletContext } from '@/context/WalletContext';
import intuitPlaidLogos from '@/assets/intuit-plaid-logos.png';

// ── Inline icons ──────────────────────────────────────────────────────────────

function CloseIconBlack() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M18 6L6 18" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M6 6L18 18" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// Lock + shield icons inside 44×44 thin-bordered circles
function FeatureLockIcon() {
  return (
    <div
      style={{
        width: 44,
        height: 44,
        borderRadius: 9999,
        border: '1px solid #E5E7EB',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="3" y="9" width="14" height="9" rx="1.5" stroke="#6B7280" strokeWidth="1.5" />
        <path d="M5.5 9V6a4.5 4.5 0 0 1 9 0v3" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function FeatureShieldIcon() {
  return (
    <div
      style={{
        width: 44,
        height: 44,
        borderRadius: 9999,
        border: '1px solid #E5E7EB',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 2L3 4.5V10C3 14 6 17.5 10 19C14 17.5 17 14 17 10V4.5L10 2Z" stroke="#6B7280" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function WalletConnectBankPage() {
  const { closeSheet, openWalletPreview } = useWalletContext();

  return (
    <div
      className="relative h-full flex flex-col animate-fade-in"
      style={{
        backgroundColor: '#FFFFFF',
        fontFamily: "'Avenir Next', Avenir, sans-serif",
      }}
    >
      {/* Close button — black, top-right */}
      <button
        onClick={closeSheet}
        aria-label="Close"
        style={{
          position: 'absolute',
          top: 12,
          right: 16,
          width: 36,
          height: 36,
          borderRadius: 9999,
          background: 'transparent',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        <CloseIconBlack />
      </button>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* Top brand-logos image (Intuit + Plaid) — centered */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: 80,
            marginBottom: 64,
          }}
        >
          <img
            src={intuitPlaidLogos}
            alt="Intuit and Plaid"
            style={{ display: 'block', height: 64, width: 'auto' }}
          />
        </div>

        {/* Heading + subtitle + features — wrapped in a max-width block that's
            centered horizontally in the sheet. The block's width matches the
            "Instant bank verification" heading so the heading reads as visually
            centered, while the body and feature rows left-align to the heading's
            left edge and the body wraps within the block's width. */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            paddingLeft: 20,
            paddingRight: 20,
          }}
        >
          <div style={{ maxWidth: 332, width: '100%' }}>
            <h1
              style={{
                fontFamily: "'Avenir Next', Avenir, sans-serif",
                fontSize: 30,
                fontWeight: 500,
                lineHeight: '120%',
                color: '#000000',
                margin: 0,
                marginBottom: 16,
              }}
            >
              Instant bank verification
            </h1>
            <p
              style={{
                fontFamily: "'Avenir Next', Avenir, sans-serif",
                fontSize: 18,
                fontWeight: 400,
                lineHeight: '145%',
                color: '#000000',
                margin: 0,
                marginBottom: 32,
              }}
            >
              Intuit uses Plaid to securely verify your bank account information.
            </p>

            {/* Feature rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <FeatureLockIcon />
                <span
                  style={{
                    fontFamily: "'Avenir Next', Avenir, sans-serif",
                    fontSize: 15,
                    fontWeight: 400,
                    lineHeight: '145%',
                    color: '#6B7280',
                  }}
                >
                  Transfer of your information is encrypted end to end
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <FeatureShieldIcon />
                <span
                  style={{
                    fontFamily: "'Avenir Next', Avenir, sans-serif",
                    fontSize: 15,
                    fontWeight: 400,
                    lineHeight: '145%',
                    color: '#6B7280',
                  }}
                >
                  We will never store your bank account login credentials
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Continue CTA — pinned bottom */}
      <div style={{ padding: '12px 16px 16px 16px', flexShrink: 0 }}>
        <button
          type="button"
          onClick={openWalletPreview}
          style={{
            width: '100%',
            height: 56,
            borderRadius: 12,
            background: '#236CFF',
            border: 'none',
            color: 'white',
            fontFamily: "'Avenir Next', Avenir, sans-serif",
            fontSize: 16,
            fontWeight: 600,
            cursor: 'pointer',
          }}
          className="hover:opacity-90 active:opacity-75 transition-opacity"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
