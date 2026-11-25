import React from 'react';
import bankIcon from '@/assets/bank.svg';
import chevronRight from '@/assets/chevron-right-small.svg';

interface Props {
  onClick?: () => void;
}

export function ConnectBankCard({ onClick }: Props) {
  return (
    <button
      type="button"
      onClick={() => {
        // TODO(@tyler): wire up the bank-connect flow in part two
        onClick?.();
      }}
      style={{
        position: 'relative',
        width: '100%',
        padding: 16,
        paddingRight: 40, // reserve space so text never collides with the chevron
        borderRadius: 12,
        background: '#FFFFFF',
        border: 'none',
        boxShadow: '0 1px 4px 0 rgba(0, 0, 0, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: 4,
        textAlign: 'left',
        cursor: 'pointer',
        fontFamily: "'Avenir Next', Avenir, sans-serif",
      }}
      className="hover:opacity-95 active:opacity-85 transition-opacity"
    >
      {/* Top row — bank icon + label, inline */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <img
          src={bankIcon}
          alt=""
          aria-hidden="true"
          style={{ width: 20, height: 20, flexShrink: 0, display: 'block' }}
        />
        <span
          style={{
            fontFamily: "'Avenir Next', Avenir, sans-serif",
            fontWeight: 500,
            fontSize: 16,
            lineHeight: '20px',
            color: '#001D3C',
          }}
        >
          Connect bank account
        </span>
      </div>

      {/* Body description — aligned with the bank icon's left edge */}
      <p
        style={{
          margin: 0,
          fontFamily: "'Avenir Next', Avenir, sans-serif",
          fontWeight: 400,
          fontSize: 14,
          lineHeight: '18px',
          color: 'rgba(0, 29, 60, 0.65)',
        }}
      >
        Link your existing bank account to receive and send payments.
      </p>

      {/* Chevron — vertically centered against the whole card, 16px from right */}
      <img
        src={chevronRight}
        alt=""
        aria-hidden="true"
        style={{
          position: 'absolute',
          right: 16,
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'block',
        }}
      />
    </button>
  );
}
