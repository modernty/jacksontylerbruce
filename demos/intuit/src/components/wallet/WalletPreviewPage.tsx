import React, { useEffect } from 'react';
import { useWalletContext } from '@/context/WalletContext';
import { useInvoiceContext, computeTotal } from '@/context/InvoiceContext';
import walletBalanceBg from '@/assets/wallet-balance-bg.png';
import arrowRightWhite from '@/assets/arrow-right-white.svg';

// ── Types ─────────────────────────────────────────────────────────────────────

export type InvoiceStatus = 'sent' | 'paid' | 'overdue' | 'pending';

const STATUS_CONFIG: Record<InvoiceStatus, { bg: string; color: string; label: string }> = {
  sent:    { bg: '#EEF3FF', color: '#236CFF', label: 'Sent' },
  paid:    { bg: '#DCFCE7', color: '#16A34A', label: 'Paid' },
  overdue: { bg: '#FEE2E2', color: '#DC2626', label: 'Overdue' },
  pending: { bg: '#FEF3C7', color: '#D97706', label: 'Pending' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function formatAmount(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
  }).format(n);
}

// Balance always displays with 2 decimals (e.g. "$6,500.00", "$0.00").
function formatBalance(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

// ── SVG components ────────────────────────────────────────────────────────────

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M15 5L5 15" stroke="black" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5 5L15 15" stroke="black" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function WalletLogo() {
  return (
    <svg width="107" height="48" viewBox="0 0 107 48" fill="none">
      {/* Intuit mark — blue */}
      <path opacity="0.8" d="M18.984 11.3413L25.5482 14.2131C25.5482 14.2131 26.5738 18.1538 26.5738 23.7435C26.5738 29.3331 25.5482 33.2738 25.5482 33.2738L18.984 36.1456C18.984 36.1456 20.0097 30.8716 20.0097 23.7435C20.0097 16.6153 18.984 11.3413 18.984 11.3413Z" fill="#236CFF"/>
      <path d="M27.4935 9.49512L35.2884 12.7772C35.2884 12.7772 36.9294 16.3076 36.9294 23.6409C36.9294 30.9741 35.2884 34.5045 35.2884 34.5045L27.4935 37.7866C27.4935 37.7866 29.1938 31.9997 29.1938 23.6409C29.1938 15.282 27.4935 9.49512 27.4935 9.49512Z" fill="#236CFF"/>
      <path opacity="0.6" d="M11.8975 23.7436C11.8975 30.0512 10.8718 34.915 10.8718 34.915L16.199 32.4081C16.199 32.4081 17.2247 30.0512 17.2247 23.7436C17.2247 17.436 16.199 15.0792 16.199 15.0792L10.8718 12.5723C10.8718 12.5723 11.8975 17.436 11.8975 23.7436Z" fill="#236CFF"/>
      {/* "Intuit" wordmark — black */}
      <path d="M67.0898 16.4192C67.0898 18.3613 68.7077 19.7824 70.7673 19.7824C72.827 19.7824 74.4448 18.3613 74.4448 16.4192V11.953H72.4531V16.1891C72.4531 17.238 71.7258 17.9418 70.7605 17.9418C69.7953 17.9418 69.0679 17.238 69.0679 16.1891V11.953H67.0762L67.0898 16.4192ZM79.7605 13.7395H82.1328V19.6403H84.1245V13.7395H86.5036V11.953H79.7605V13.7395ZM78.4757 11.953H76.484V19.6403H78.4757V11.953ZM59.0416 13.7395H61.4139V19.6403H63.4056V13.7395H65.7779V11.953H59.0416V13.7395ZM48.5937 11.953H46.6021V19.6403H48.5937V11.953ZM57.9947 15.1605C57.9947 13.2184 56.3701 11.7974 54.3173 11.7974C52.2576 11.7974 50.6398 13.2184 50.6398 15.1605V19.6403H52.6315V15.4042C52.6315 14.3553 53.3588 13.6515 54.3241 13.6515C55.2893 13.6515 56.0166 14.3553 56.0166 15.4042V19.6403H58.0083L57.9947 15.1605Z" fill="black"/>
      {/* "wallet" wordmark — black */}
      <path d="M89.4797 29.126V27.4104H90.9892V24.9263H93.1096V27.4104H95.2659V29.126H93.1096V33.1112C93.1096 33.4925 93.1755 33.8082 93.3072 34.0584C93.451 34.3086 93.7625 34.4337 94.2416 34.4337C94.3854 34.4337 94.5411 34.4218 94.7089 34.3979C94.8766 34.3622 95.0263 34.3145 95.1581 34.255L95.23 35.9349C95.0383 36.0063 94.8107 36.06 94.5471 36.0957C94.2836 36.1434 94.032 36.1672 93.7924 36.1672C93.2174 36.1672 92.7502 36.0897 92.3908 35.9349C92.0314 35.7204 91.7439 35.5477 91.5283 35.2736C91.3246 34.9877 91.1808 34.666 91.097 34.3086C91.0251 33.9393 90.9892 33.5461 90.9892 33.1291V29.126H89.4797Z" fill="black"/>
      <path d="M86.6543 30.8416C86.6543 30.5676 86.6124 30.3055 86.5286 30.0553C86.4567 29.8051 86.3369 29.5847 86.1692 29.394C86.0015 29.2034 85.7858 29.0545 85.5223 28.9473C85.2707 28.8281 84.9712 28.7686 84.6238 28.7686C83.9769 28.7686 83.4258 28.9651 82.9706 29.3583C82.5274 29.7395 82.2818 30.234 82.2339 30.8416H86.6543ZM88.8107 31.8066C88.8107 31.902 88.8107 31.9973 88.8107 32.0926C88.8107 32.1879 88.8047 32.2832 88.7927 32.3785H82.2339C82.2578 32.6883 82.3357 32.9742 82.4675 33.2363C82.6112 33.4865 82.7969 33.7069 83.0245 33.8976C83.2521 34.0763 83.5097 34.2192 83.7972 34.3265C84.0847 34.4337 84.3842 34.4873 84.6957 34.4873C85.2348 34.4873 85.69 34.392 86.0614 34.2014C86.4327 33.9988 86.7382 33.7248 86.9778 33.3793L88.4154 34.523C87.5648 35.6668 86.3309 36.2387 84.7136 36.2387C84.0428 36.2387 83.4258 36.1374 82.8628 35.9349C82.2997 35.7204 81.8086 35.4226 81.3893 35.0413C80.982 34.6601 80.6585 34.1954 80.4189 33.6474C80.1913 33.0874 80.0775 32.456 80.0775 31.753C80.0775 31.062 80.1913 30.4365 80.4189 29.8766C80.6585 29.3047 80.982 28.8222 81.3893 28.429C81.7966 28.0239 82.2758 27.7142 82.8268 27.4997C83.3899 27.2733 83.9949 27.1602 84.6418 27.1602C85.2407 27.1602 85.7918 27.2614 86.295 27.464C86.8101 27.6546 87.2533 27.9465 87.6247 28.3396C87.9961 28.7209 88.2836 29.2034 88.4872 29.7872C88.7029 30.3591 88.8107 31.0322 88.8107 31.8066Z" fill="black"/>
      <path d="M75.9883 24.2104H78.1447V35.9886H75.9883V24.2104Z" fill="black"/>
      <path d="M71.3596 24.2104H73.516V35.9886H71.3596V24.2104Z" fill="black"/>
      <path d="M67.4014 34.8983H67.3475C67.1319 35.2796 66.7845 35.5953 66.3053 35.8455C65.8261 36.0838 65.281 36.2029 64.6701 36.2029C64.3226 36.2029 63.9573 36.1553 63.5739 36.06C63.2025 35.9766 62.8551 35.8336 62.5317 35.6311C62.2202 35.4166 61.9567 35.1426 61.741 34.809C61.5374 34.4635 61.4355 34.0405 61.4355 33.5401C61.4355 32.8968 61.6152 32.3845 61.9746 32.0032C62.346 31.622 62.8192 31.3301 63.3942 31.1275C63.9692 30.925 64.6042 30.7939 65.299 30.7344C66.0058 30.6629 66.6946 30.6271 67.3655 30.6271V30.4127C67.3655 29.8766 67.1678 29.4834 66.7725 29.2332C66.3891 28.9711 65.9279 28.84 65.3888 28.84C64.9336 28.84 64.4963 28.9354 64.0771 29.126C63.6578 29.3166 63.3104 29.5489 63.0348 29.8229L61.9207 28.5184C62.4119 28.0656 62.9749 27.7261 63.6099 27.4997C64.2568 27.2733 64.9096 27.1602 65.5685 27.1602C66.3352 27.1602 66.9642 27.2674 67.4553 27.4818C67.9585 27.6963 68.3538 27.9465 68.6413 28.3218C68.9288 28.6673 69.1265 29.0545 69.2343 29.4834C69.3541 29.9123 69.414 30.3412 69.414 30.7701V35.9885H67.4014V34.8983ZM67.3655 32.0747H66.8803C66.5329 32.0747 66.1675 32.0926 65.7842 32.1283C65.4008 32.1521 65.0474 32.2177 64.724 32.3249C64.4005 32.4202 64.131 32.5632 63.9153 32.7538C63.6997 32.9325 63.5919 33.1827 63.5919 33.5044C63.5919 33.7069 63.6338 33.8797 63.7177 34.0227C63.8135 34.1537 63.9333 34.2609 64.0771 34.3443C64.2208 34.4277 64.3825 34.4873 64.5622 34.523C64.7419 34.5588 64.9216 34.5767 65.1013 34.5767C65.8441 34.5767 66.4071 34.3801 66.7905 33.9869C67.1738 33.5937 67.3655 33.0576 67.3655 32.3785V32.0747Z" fill="black"/>
      <path d="M46.5618 27.4106H48.8979L50.6948 33.5583H50.7307L52.5816 27.4106H54.8817L56.7505 33.5583H56.7865L58.6194 27.4106H60.8655L57.8826 35.9888H55.6903L53.7317 29.9841H53.6957L51.755 35.9888H49.5627L46.5618 27.4106Z" fill="black"/>
    </svg>
  );
}

function IntuitMarkWhite() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path opacity="0.8" d="M6.47826 1.30444L11.141 3.33811C11.141 3.33811 11.8696 6.12873 11.8696 10.0871C11.8696 14.0454 11.141 16.836 11.141 16.836L6.47826 18.8697C6.47826 18.8697 7.20682 15.1348 7.20682 10.0871C7.20682 5.03927 6.47826 1.30444 6.47826 1.30444Z" fill="white"/>
      <path d="M12.5652 0L18.0964 2.32017C18.0964 2.32017 19.2609 4.81594 19.2609 10C19.2609 15.1841 18.0964 17.6798 18.0964 17.6798L12.5652 20C12.5652 20 13.7717 15.9091 13.7717 10C13.7717 4.09089 12.5652 0 12.5652 0Z" fill="white"/>
      <path opacity="0.6" d="M1.46914 10.0869C1.46914 14.5547 0.739125 17.9999 0.739125 17.9999L4.53085 16.2242C4.53085 16.2242 5.26086 14.5547 5.26086 10.0869C5.26086 5.619 4.53085 3.94956 4.53085 3.94956L0.739125 2.17383C0.739125 2.17383 1.46914 5.619 1.46914 10.0869Z" fill="white"/>
    </svg>
  );
}

function InvoiceIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M8.75 7.75H15.25M8.75 11.75H11.25M4.75 2.75H19.25V21L16.6667 19L14.3333 21.25L12 19L9.66667 21.25L7.33333 19L4.75 21V2.75Z" stroke="#236CFF" strokeWidth="1.5" strokeLinecap="square"/>
    </svg>
  );
}

function StatusPill({ status }: { status: InvoiceStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className="rounded-full flex-shrink-0"
      style={{
        backgroundColor: cfg.bg,
        color: cfg.color,
        fontFamily: "'Avenir Next', Avenir, sans-serif",
        fontSize: 12,
        lineHeight: '14px',
        fontWeight: 500,
        paddingLeft: 12,
        paddingRight: 12,
        paddingTop: 4,
        paddingBottom: 4,
      }}
    >
      {cfg.label}
    </span>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function WalletPreviewPage() {
  const { closeSheet, openLockScreen, showOpenInAppModal, isSheetOpen } = useWalletContext();
  const { state: invoiceState } = useInvoiceContext();

  // Once the wallet is funded (post bank-connect) AND the user is actually
  // looking at this page (sheet is open), surface the iOS-style "Open in
  // Intuit Wallet" prompt 3s later. The isSheetOpen guard prevents the
  // timer from firing while this page is mounted-but-hidden during the
  // lock-screen flow (where MARK_PAID also flips phase to 'paid').
  useEffect(() => {
    if (invoiceState.phase !== 'paid') return;
    if (!isSheetOpen) return;
    const t = setTimeout(() => showOpenInAppModal(), 3000);
    return () => clearTimeout(t);
  }, [invoiceState.phase, isSheetOpen, showOpenInAppModal]);

  const clientName = invoiceState.data.clientName || 'Client';
  const total = computeTotal(invoiceState.data);
  // Balance reflects the paid invoice once the user finishes the bank-connect flow.
  const balance = invoiceState.phase === 'paid' ? total : 0;
  const sentDate = new Date();
  const status: InvoiceStatus = invoiceState.phase === 'paid' ? 'paid' : 'sent';

  return (
    <div
      className="flex flex-col h-full animate-fade-in"
      style={{ fontFamily: "'Avenir Next', Avenir, sans-serif" }}
    >
      {/* ── Header: close button + centered logo ── */}
      <div className="relative flex-shrink-0 flex items-center justify-center pt-10 pb-5">
        <button
          onClick={closeSheet}
          className="absolute right-5 top-3 w-9 h-9 flex items-center justify-center rounded-full bg-[#F3F4F6]"
        >
          <CloseIcon />
        </button>
        <WalletLogo />
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto px-5 flex flex-col gap-5 pb-5">

        {/* Balance card — clickable, re-triggers the "Open in Intuit Wallet" modal */}
        <button
          type="button"
          onClick={showOpenInAppModal}
          className="relative rounded-3xl flex-shrink-0 overflow-hidden text-left p-0 border-0 hover:opacity-95 active:opacity-90 transition-opacity"
          style={{
            height: 220,
            alignSelf: 'stretch',
            backgroundColor: '#236CFF',
            boxShadow: '0 -2px 0 0 rgba(0, 0, 0, 0.07) inset',
            filter: 'drop-shadow(0 3px 6px rgba(48, 49, 65, 0.04)) drop-shadow(0 11px 11px rgba(48, 49, 65, 0.04)) drop-shadow(0 25px 15px rgba(48, 49, 65, 0.02)) drop-shadow(0 70px 20px rgba(48, 49, 65, 0.00)) drop-shadow(0 0 0 rgba(0, 0, 0, 0.02)) drop-shadow(0 28px 36px rgba(41, 119, 255, 0.15))',
            cursor: 'pointer',
          }}
        >
          {/* Full-bleed background image — scaled up aggressively so the
              source PNG's textured/gradient region fills the card edge-to-edge
              and any baked-in whitespace pushes past the card boundary
              (cropped by overflow:hidden on the parent). */}
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
              transformOrigin: 'center',
              zIndex: 0,
            }}
          />

          {/* Foreground text */}
          <div
            className="relative z-10 h-full flex flex-col justify-between"
            style={{ padding: 24 }}
          >
            <span style={{
              fontFamily: "'Avenir Next', Avenir, sans-serif",
              fontSize: 16,
              lineHeight: '20px',
              fontWeight: 500,
              color: 'rgba(255,255,255,0.85)',
            }}>
              Intuit Balance
            </span>

            {/* Amount + 40×40 arrow button row — vertically centered, max horizontal spacing */}
            <div className="flex items-center justify-between">
              <span style={{ fontSize: 40, lineHeight: '48px', fontWeight: 600, color: 'white' }}>
                {formatBalance(balance)}
              </span>
              <span
                aria-hidden="true"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 9999,
                  background: 'rgba(255, 255, 255, 0.10)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <img src={arrowRightWhite} alt="" style={{ width: 16, height: 16, display: 'block' }} />
              </span>
            </div>
          </div>
        </button>

        {/* Recent activity */}
        <div className="flex flex-col">
          <h2 style={{ fontSize: 16, lineHeight: '20px', fontWeight: 500, marginBottom: 16, color: '#1C2E52' }}>
            Recent activity
          </h2>

          <div
            role="button"
            tabIndex={0}
            onClick={showOpenInAppModal}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showOpenInAppModal(); } }}
            className="bg-white rounded-3xl shadow-sm border border-[#F0F0F0] flex gap-3 items-center hover:opacity-95 active:opacity-90 transition-opacity"
            style={{ padding: '12px 16px', minHeight: 100, cursor: 'pointer' }}
          >
            {/* Invoice icon */}
            <div className="flex-shrink-0">
              <InvoiceIcon />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              {/* Row 1: client name + amount */}
              <div className="flex items-center justify-between gap-2">
                <span className="truncate" style={{ fontSize: 14, lineHeight: '20px', fontWeight: 500, color: '#111827' }}>
                  {clientName}
                </span>
                <span className="flex-shrink-0" style={{ fontSize: 14, lineHeight: '20px', fontWeight: 500, color: '#111827' }}>
                  {formatAmount(total)}
                </span>
              </div>

              {/* Row 2: date + status pill */}
              <div className="flex items-center justify-between gap-2" style={{ marginTop: 4 }}>
                <span style={{ fontSize: 12, lineHeight: '14px', color: '#6B7280' }}>
                  {formatDate(sentDate)}
                </span>
                <StatusPill status={status} />
              </div>

              {/* Row 3: view invoice link */}
              <div style={{ marginTop: 6 }}>
                <button className="flex items-center" style={{ fontSize: 12, lineHeight: '14px', fontWeight: 500, color: '#001D3C', opacity: 0.5 }}>
                  View invoice
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginLeft: 4, flexShrink: 0 }}>
                    <path d="M4.5 2.5L7.5 6L4.5 9.5" stroke="#001D3C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* CTA card */}
        <div
          className="w-full rounded-3xl overflow-hidden flex flex-col justify-end"
          style={{
            backgroundImage: `url(${import.meta.env.BASE_URL}cta-bg.png)`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            padding: 16,
            minHeight: 220,
            flex: 1,
          }}
        >
          <button
            onClick={openLockScreen}
            data-demo="download-app"
            className="transition-opacity active:opacity-75"
            style={{
              display: 'flex',
              width: '100%',
              padding: 16,
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'flex-start',
              gap: 16,
              borderRadius: 24,
              background: 'linear-gradient(160deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%)',
              backdropFilter: 'blur(12px) saturate(140%)',
              WebkitBackdropFilter: 'blur(12px) saturate(140%)',
              border: '0.5px solid rgba(255,255,255,0.45)',
              boxShadow: 'inset 0 0.5px 0 rgba(255,255,255,0.65), inset 0 -0.5px 0 rgba(255,255,255,0.1), 0 4px 20px rgba(0,0,0,0.08)',
              color: 'white',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, alignSelf: 'stretch' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: '#236CFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <g clipPath="url(#clip0_cta)">
                    <path opacity="0.8" d="M6.47826 1.3042L11.141 3.33787C11.141 3.33787 11.8696 6.12849 11.8696 10.0868C11.8696 14.0451 11.141 16.8357 11.141 16.8357L6.47826 18.8694C6.47826 18.8694 7.20682 15.1346 7.20682 10.0868C7.20682 5.03902 6.47826 1.3042 6.47826 1.3042Z" fill="white"/>
                    <path d="M12.5652 0L18.0964 2.32017C18.0964 2.32017 19.2609 4.81594 19.2609 10C19.2609 15.1841 18.0964 17.6798 18.0964 17.6798L12.5652 20C12.5652 20 13.7717 15.9091 13.7717 10C13.7717 4.09089 12.5652 0 12.5652 0Z" fill="white"/>
                    <path opacity="0.6" d="M1.46914 10.0869C1.46914 14.5547 0.739125 17.9999 0.739125 17.9999L4.53085 16.2242C4.53085 16.2242 5.26086 14.5547 5.26086 10.0869C5.26086 5.619 4.53085 3.94956 4.53085 3.94956L0.739125 2.17383C0.739125 2.17383 1.46914 5.619 1.46914 10.0869Z" fill="white"/>
                  </g>
                  <defs>
                    <clipPath id="clip0_cta">
                      <rect width="20" height="20" fill="white"/>
                    </clipPath>
                  </defs>
                </svg>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start', gap: 4 }}>
              <span style={{ color: '#FFF', fontFamily: "'Avenir Next', Avenir, sans-serif", fontSize: 16, fontWeight: 600, lineHeight: '16px', letterSpacing: '-0.32px' }}>
                Download the app
              </span>
              <span style={{ color: '#FFF', fontFamily: "'Avenir Next', Avenir, sans-serif", fontSize: 13, fontWeight: 400, lineHeight: '130%', letterSpacing: '-0.26px' }}>
                Pay and get paid instantly with Intuit Wallet.
              </span>
            </div>
            </div>
          </button>
        </div>

      </div>
    </div>
  );
}
