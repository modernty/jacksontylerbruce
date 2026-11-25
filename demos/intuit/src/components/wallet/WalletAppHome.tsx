import React from 'react';
import { useInvoiceContext, computeTotal } from '@/context/InvoiceContext';
import walletBalanceBg from '@/assets/wallet-balance-bg.png';
import arrowRight from '@/assets/arrow-right-white.svg';
import walletSymbol from '@/assets/wallet-symbol.svg';
import sendIcon from '@/assets/wallet-actions/send.svg';
import requestIcon from '@/assets/wallet-actions/request.svg';
import addIcon from '@/assets/wallet-actions/add.svg';
import scanIcon from '@/assets/wallet-actions/scan.svg';
import creditKarmaIcon from '@/assets/credit-karma.svg';
import usdcIcon from '@/assets/usdc.svg';
import ckBg from '@/assets/offerings/ck.png';
import ttBg from '@/assets/offerings/tt.png';
import qbBg from '@/assets/offerings/qb.png';
import mcBg from '@/assets/offerings/mc.png';
import bankIconSrc from '@/assets/wallet-money/bank.svg';
import cryptoWalletIconSrc from '@/assets/wallet-money/crypto-wallet.svg';
import directDepositIconSrc from '@/assets/wallet-money/direct-deposit.svg';
import autoReloadIconSrc from '@/assets/wallet-money/auto-reload.svg';
import depositCheckIconSrc from '@/assets/wallet-money/deposit-check.svg';
import chevronRightSrc from '@/assets/wallet-money/chevron-right.svg';
import avatarAlexis from '@/assets/avatars/alexis.png';
import avatarKaty from '@/assets/avatars/katy.png';
import avatarNormand from '@/assets/avatars/normand.png';
import avatarSamuel from '@/assets/avatars/samuel.png';
import avatarVictor from '@/assets/avatars/victor.png';
import avatarUser from '@/assets/avatars/user.png';

// ── Inline SVGs (placeholders) ────────────────────────────────────────────────

function IntuitMark() {
  return (
    <img
      src={walletSymbol}
      alt="Intuit Wallet"
      style={{ display: 'block', height: 44, width: 'auto' }}
    />
  );
}

function MenuIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path d="M3 6h16M3 11h16M3 16h16" stroke="#1A1A1A" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

// Quick-action icons rendered from the provided SVG assets
function ActionIcon({ src, alt }: { src: string; alt: string }) {
  return <img src={src} alt={alt} style={{ display: 'block', width: 40, height: 40 }} />;
}

// ── Reusable building blocks ──────────────────────────────────────────────────

interface QuickActionProps {
  label: string;
  icon: React.ReactNode;
}
function QuickAction({ label, icon }: QuickActionProps) {
  return (
    <button
      type="button"
      // TODO(@tyler): wire action
      className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-white hover:opacity-90 active:opacity-75 transition-opacity"
      style={{
        width: 82,
        height: 96,
        flexShrink: 0,
        boxShadow: '0 1px 4px rgba(0, 0, 0, 0.06)',
      }}
    >
      {icon}
      <span style={{ fontFamily: "'Avenir Next', Avenir, sans-serif", fontSize: 13, fontWeight: 500, color: '#1A1A1A' }}>
        {label}
      </span>
    </button>
  );
}

interface ContactProps {
  name: string;
  src: string;
}
function Contact({ name, src }: ContactProps) {
  return (
    <div className="flex flex-col items-center flex-shrink-0" style={{ width: 68 }}>
      <img
        src={src}
        alt={name}
        style={{
          width: 68,
          height: 68,
          display: 'block',
          marginBottom: 10,
        }}
      />
      <span
        style={{
          fontFamily: "'Avenir Next', Avenir, sans-serif",
          fontSize: 12,
          lineHeight: '16px',
          color: '#1A1A1A',
        }}
      >
        {name}
      </span>
    </div>
  );
}

function ChevronRight() {
  return (
    <img
      src={chevronRightSrc}
      alt=""
      aria-hidden="true"
      style={{ width: 20, height: 20, flexShrink: 0, display: 'block' }}
    />
  );
}

interface OfferingCardProps {
  title: string;
  bgImage: string;
}
function OfferingCard({ title, bgImage }: OfferingCardProps) {
  return (
    <button
      type="button"
      // TODO(@tyler): wire offering card action
      className="relative flex flex-col items-start flex-1 rounded-2xl overflow-hidden text-left hover:opacity-95 active:opacity-85 transition-opacity"
      style={{
        height: 230,
        padding: 16,
        border: 'none',
        cursor: 'pointer',
      }}
    >
      {/* Background image — covers the entire card */}
      <img
        src={bgImage}
        alt=""
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
          pointerEvents: 'none',
        }}
      />

      {/* Title — top */}
      <span
        style={{
          position: 'relative',
          fontFamily: "'Avenir Next', Avenir, sans-serif",
          fontSize: 14,
          lineHeight: '18px',
          fontWeight: 600,
          color: '#1A1A1A',
          display: 'block',
        }}
      >
        {title}
      </span>
    </button>
  );
}

interface MoreActionRowProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}
function MoreActionRow({ icon, title, subtitle }: MoreActionRowProps) {
  return (
    <button
      type="button"
      // TODO(@tyler): wire more action row
      className="flex items-center w-full hover:bg-black/[0.02] active:bg-black/[0.04] transition-colors"
      style={{
        padding: 12,
        gap: 16,
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <div
        className="flex items-center justify-center"
        style={{
          width: 36,
          height: 36,
          flexShrink: 0,
          borderRadius: 10,
          overflow: 'hidden',
        }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0 flex flex-col justify-center" style={{ gap: 2 }}>
        <div
          style={{
            fontFamily: "'Avenir Next', Avenir, sans-serif",
            fontSize: 14,
            lineHeight: '20px',
            fontWeight: 500,
            color: '#001D3C',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontFamily: "'Avenir Next', Avenir, sans-serif",
            fontSize: 12,
            lineHeight: '16px',
            fontWeight: 400,
            color: '#001D3C',
            opacity: 0.7,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {subtitle}
        </div>
      </div>
      <ChevronRight />
    </button>
  );
}

function MoneyOptionIcon({ src, size = 36 }: { src: string; size?: number }) {
  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      style={{ width: size, height: size, display: 'block' }}
    />
  );
}
function BankIcon() {
  return <MoneyOptionIcon src={bankIconSrc} />;
}
function CryptoWalletIcon() {
  return <MoneyOptionIcon src={cryptoWalletIconSrc} />;
}
function DirectDepositIcon() {
  return <MoneyOptionIcon src={directDepositIconSrc} />;
}
function AutoReloadIcon() {
  return <MoneyOptionIcon src={autoReloadIconSrc} />;
}
function DepositCheckIcon() {
  return <MoneyOptionIcon src={depositCheckIconSrc} />;
}

interface SuggestedActionProps {
  iconSrc: string;
  label: string;
}
function SuggestedAction({ iconSrc, label }: SuggestedActionProps) {
  return (
    <div
      className="flex items-center justify-between"
      style={{
        backgroundColor: '#E3ECFE',
        borderRadius: 9999,
        padding: '8px 8px 8px 12px',
      }}
    >
      <div className="flex items-center gap-3">
        <img
          src={iconSrc}
          alt=""
          aria-hidden="true"
          style={{ width: 24, height: 24, display: 'block', flexShrink: 0 }}
        />
        <span
          style={{
            fontFamily: "'Avenir Next', Avenir, sans-serif",
            fontSize: 14,
            lineHeight: '20px',
            fontWeight: 500,
            color: 'rgba(28, 46, 82, 0.9)',
          }}
        >
          {label}
        </span>
      </div>
      <button
        type="button"
        // TODO(@tyler): wire Fund action
        className="rounded-full px-4 py-1.5 hover:opacity-90 active:opacity-75 transition-opacity"
        style={{
          background: '#236CFF',
          color: 'white',
          fontFamily: "'Avenir Next', Avenir, sans-serif",
          fontSize: 14,
          lineHeight: '15px',
          fontWeight: 600,
        }}
      >
        Fund
      </button>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function WalletAppHome() {
  const { state: invoiceState } = useInvoiceContext();
  // Voice-mode session locks the invoice to a $800 deposit and flips the
  // phase to 'deposit-paid'. Surface that as the wallet balance so the
  // simulated app reflects the deposit just received. Other flows continue
  // to show the demo's hardcoded $6,500 figure.
  const balance =
    invoiceState.phase === 'deposit-paid' ? computeTotal(invoiceState.data) : 6500;
  const formattedBalance = balance.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{
        zIndex: 91, // sits above WalletAppLaunchScreen (z-90) during the cross-mount
        backgroundColor: '#F5F6FA',
        fontFamily: "'Avenir Next', Avenir, sans-serif",
        opacity: 0,
        animation: 'fade-in 0.3s ease-out forwards',
      }}
    >
      {/* Scrollable content — reserves 70px for the system StatusBar above */}
      <div className="h-full overflow-y-auto scrollbar-hidden" style={{ paddingTop: 70, paddingBottom: 32 }}>
        {/* Header row: avatar / brand mark / menu */}
        <div className="flex items-center justify-between px-5" style={{ height: 48, marginBottom: 16 }}>
          <img
            src={avatarUser}
            alt="Profile"
            style={{
              width: 36,
              height: 36,
              borderRadius: 9999,
              objectFit: 'cover',
              flexShrink: 0,
              display: 'block',
            }}
          />
          <IntuitMark />
          <button type="button" aria-label="Menu" className="flex items-center justify-center" style={{ width: 36, height: 36 }}>
            <MenuIcon />
          </button>
        </div>

        {/* Intuit Balance card */}
        <div className="px-5" style={{ marginBottom: 20 }}>
          <div
            className="relative rounded-3xl overflow-hidden flex flex-col justify-between"
            style={{
              height: 200,
              backgroundColor: '#236CFF',
              boxShadow: '0 -2px 0 0 rgba(0, 0, 0, 0.07) inset',
              filter:
                'drop-shadow(0 3px 6px rgba(48, 49, 65, 0.04)) drop-shadow(0 11px 11px rgba(48, 49, 65, 0.04)) drop-shadow(0 25px 15px rgba(48, 49, 65, 0.02)) drop-shadow(0 28px 36px rgba(41, 119, 255, 0.15))',
            }}
          >
            {/* Bg image */}
            <img
              src={walletBalanceBg}
              alt=""
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center',
                transform: 'scale(1.6)',
              }}
            />

            {/* Foreground */}
            <div className="relative z-10 h-full flex flex-col justify-between" style={{ padding: 24 }}>
              <span
                style={{
                  fontFamily: "'Avenir Next', Avenir, sans-serif",
                  fontSize: 16,
                  lineHeight: '20px',
                  fontWeight: 500,
                  color: 'rgba(255,255,255,0.85)',
                }}
              >
                Intuit Balance
              </span>

              {/* Amount + arrow button row */}
              <div className="flex items-center justify-between">
                <span style={{ fontSize: 36, lineHeight: '40px', fontWeight: 600, color: 'white' }}>
                  ${formattedBalance}
                </span>
                <button
                  type="button"
                  // TODO(@tyler): wire balance arrow action
                  aria-label="View balance details"
                  className="flex items-center justify-center hover:opacity-90 active:opacity-75 transition-opacity"
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 9999,
                    background: 'rgba(255, 255, 255, 0.18)',
                    border: 'none',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  <img src={arrowRight} alt="" aria-hidden="true" style={{ width: 16, height: 16, display: 'block' }} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick action grid — fixed 82×96 buttons, equal spacing */}
        <div className="flex justify-between px-5" style={{ marginBottom: 24 }}>
          <QuickAction label="Send" icon={<ActionIcon src={sendIcon} alt="" />} />
          <QuickAction label="Request" icon={<ActionIcon src={requestIcon} alt="" />} />
          <QuickAction label="Add" icon={<ActionIcon src={addIcon} alt="" />} />
          <QuickAction label="Scan" icon={<ActionIcon src={scanIcon} alt="" />} />
        </div>

        {/* Contacts row — horizontal scroll, scrollbar hidden, 5 users evenly spaced at 20px gap */}
        <div className="overflow-x-auto scrollbar-hidden" style={{ marginBottom: 28 }}>
          <div className="flex" style={{ gap: 20, paddingLeft: 20, paddingRight: 20 }}>
            <Contact name="Normand" src={avatarNormand} />
            <Contact name="Alexis" src={avatarAlexis} />
            <Contact name="Katy" src={avatarKaty} />
            <Contact name="Samuel" src={avatarSamuel} />
            <Contact name="Victor" src={avatarVictor} />
          </div>
        </div>

        {/* Quick actions list */}
        <div className="px-5" style={{ marginBottom: 24 }}>
          <div style={{ padding: '0 8px', marginBottom: 12 }}>
            <h2
              style={{
                fontFamily: "'Avenir Next', Avenir, sans-serif",
                fontSize: 16,
                lineHeight: '20px',
                fontWeight: 500,
                color: 'rgba(28, 46, 82, 0.9)',
                margin: 0,
              }}
            >
              Quick actions
            </h2>
            <p
              style={{
                fontFamily: "'Avenir Next', Avenir, sans-serif",
                fontSize: 12,
                lineHeight: '16px',
                fontWeight: 500,
                color: 'rgba(28, 46, 82, 0.7)',
                margin: 0,
              }}
            >
              Based on your transaction history
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <SuggestedAction iconSrc={creditKarmaIcon} label="Deposit $400 to CK Money" />
            <SuggestedAction iconSrc={usdcIcon} label="Deposit $100 to USDC" />
          </div>
        </div>

        {/* Promo block */}
        <div className="px-5" style={{ marginBottom: 24 }}>
          <div style={{ padding: '0 8px' }}>
            <h3
              style={{
                fontFamily: "'Avenir Next', Avenir, sans-serif",
                fontSize: 16,
                lineHeight: '20px',
                fontWeight: 500,
                color: 'rgba(28, 46, 82, 0.9)',
                margin: 0,
              }}
            >
              Do more with Intuit, get 5% off
            </h3>
            <p
              style={{
                fontFamily: "'Avenir Next', Avenir, sans-serif",
                fontSize: 12,
                lineHeight: '16px',
                fontWeight: 500,
                color: 'rgba(28, 46, 82, 0.7)',
                margin: 0,
              }}
            >
              Get 5% off Intuit products by using your Intuit Balance to pay for services.
            </p>
          </div>
        </div>

        {/* Offerings section */}
        <div className="px-5 flex flex-col" style={{ gap: 8, marginBottom: 28 }}>
          <div className="flex" style={{ gap: 8 }}>
            <OfferingCard
              title="Make better sense of your dollars and cents"
              bgImage={ckBg}
            />
            <OfferingCard
              title="The tax tools to help you rule this tax season"
              bgImage={ttBg}
            />
          </div>
          <div className="flex" style={{ gap: 8 }}>
            <OfferingCard
              title="Take control of your small business finances"
              bgImage={qbBg}
            />
            <OfferingCard
              title="Engage and grow your revenue with email"
              bgImage={mcBg}
            />
          </div>
        </div>

        {/* Add money to your wallet section */}
        <div className="px-5">
          <div
            className="flex items-center"
            style={{ gap: 14, marginBottom: 12 }}
          >
            <span
              aria-hidden="true"
              style={{ flex: 1, height: 1, backgroundColor: 'rgba(28, 46, 82, 0.15)' }}
            />
            <h3
              style={{
                fontFamily: "'Avenir Next', Avenir, sans-serif",
                fontSize: 16,
                lineHeight: '20px',
                fontWeight: 500,
                color: 'rgba(28, 46, 82, 0.55)',
                margin: 0,
                whiteSpace: 'nowrap',
              }}
            >
              Add money to your wallet
            </h3>
            <span
              aria-hidden="true"
              style={{ flex: 1, height: 1, backgroundColor: 'rgba(28, 46, 82, 0.15)' }}
            />
          </div>
          <div>
            <MoreActionRow
              icon={<BankIcon />}
              title="Connect bank account"
              subtitle="Link your existing bank account"
            />
            <MoreActionRow
              icon={<CryptoWalletIcon />}
              title="Add a crypto wallet"
              subtitle="Connect your existing crypto wallet"
            />
            <MoreActionRow
              icon={<DirectDepositIcon />}
              title="Direct deposit"
              subtitle="Add money from a source"
            />
            <MoreActionRow
              icon={<AutoReloadIcon />}
              title="Auto reload"
              subtitle="Set up automatic transfers"
            />
            <MoreActionRow
              icon={<DepositCheckIcon />}
              title="Deposit a check"
              subtitle="Add money by uploading a check"
            />
          </div>
        </div>
      </div>

      {/* Home indicator — pinned to the bottom, on top of the home content */}
      <div
        className="hidden md:flex absolute left-0 right-0 bottom-0 items-center justify-center"
        style={{ height: 21, zIndex: 100 }}
      >
        <div
          style={{
            width: 139,
            height: 5,
            borderRadius: 9999,
            background: 'black',
            transition: 'background-color 0.3s ease-out',
          }}
        />
      </div>
    </div>
  );
}
