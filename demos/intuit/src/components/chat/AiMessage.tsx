import React, { useState, useEffect } from 'react';
import { Message, IntuitStatus } from '@/types/message';
import { StreamingText } from './StreamingText';
import { MessageActionBar } from './MessageActionBar';
import { TypingIndicator } from './TypingIndicator';
import { InvoiceCardRouter } from '@/components/invoice/InvoiceCardRouter';
import { InvoiceSentCard } from '@/components/invoice/InvoiceSentCard';
import { InvoicePaidCard } from '@/components/invoice/InvoicePaidCard';
import { SendInvoiceButton } from '@/components/invoice/SendInvoiceButton';
import { useInvoiceContext } from '@/context/InvoiceContext';
import { useWalletContext } from '@/context/WalletContext';
import { useVoiceContext } from '@/context/VoiceContext';
import bankIconSmall from '@/assets/bank-s.svg';

interface Props {
  message: Message;
  isLast: boolean;
  isFirstAiMessage?: boolean;
}

// ── SVG assets ────────────────────────────────────────────────────────────────

function PhoneIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
      <g clipPath="url(#phone-clip)">
        <path d="M10.5 0.5H5.5C4.67157 0.5 4 1.17157 4 2V14C4 14.8284 4.67157 15.5 5.5 15.5H10.5C11.3284 15.5 12 14.8284 12 14V2C12 1.17157 11.3284 0.5 10.5 0.5Z" stroke="#374151" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M5.5 0.5H6.25C6.3163 0.5 6.37989 0.526339 6.42678 0.573223C6.47366 0.620107 6.5 0.683696 6.5 0.75C6.5 0.882608 6.55268 1.00979 6.64645 1.10355C6.74021 1.19732 6.86739 1.25 7 1.25H9C9.13261 1.25 9.25979 1.19732 9.35355 1.10355C9.44732 1.00979 9.5 0.882608 9.5 0.75C9.5 0.683696 9.52634 0.620107 9.57322 0.573223C9.62011 0.526339 9.6837 0.5 9.75 0.5H10.5" stroke="#374151" strokeLinecap="round" strokeLinejoin="round"/>
      </g>
      <defs>
        <clipPath id="phone-clip"><rect width="16" height="16" fill="white"/></clipPath>
      </defs>
    </svg>
  );
}

function IntuitWalletIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g clipPath="url(#wallet-clip)">
        <path opacity="0.8" d="M6.47826 1.30444L11.141 3.33811C11.141 3.33811 11.8696 6.12873 11.8696 10.0871C11.8696 14.0454 11.141 16.836 11.141 16.836L6.47826 18.8697C6.47826 18.8697 7.20682 15.1348 7.20682 10.0871C7.20682 5.03927 6.47826 1.30444 6.47826 1.30444Z" fill="white"/>
        <path d="M12.5652 0L18.0964 2.32017C18.0964 2.32017 19.2609 4.81594 19.2609 10C19.2609 15.1841 18.0964 17.6798 18.0964 17.6798L12.5652 20C12.5652 20 13.7717 15.9091 13.7717 10C13.7717 4.09089 12.5652 0 12.5652 0Z" fill="white"/>
        <path opacity="0.6" d="M1.46914 10.0869C1.46914 14.5547 0.739125 17.9999 0.739125 17.9999L4.53085 16.2242C4.53085 16.2242 5.26086 14.5547 5.26086 10.0869C5.26086 5.619 4.53085 3.94956 4.53085 3.94956L0.739125 2.17383C0.739125 2.17383 1.46914 5.619 1.46914 10.0869Z" fill="white"/>
      </g>
      <defs>
        <clipPath id="wallet-clip"><rect width="20" height="20" fill="white"/></clipPath>
      </defs>
    </svg>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AiMessage({ message, isLast, isFirstAiMessage }: Props) {
  const isStreaming = message.status === 'streaming';
  const hasContent = message.content.length > 0;
  const { state: invoiceState } = useInvoiceContext();
  const { openSheet, openWalletPreview, openBankSetupFlow, isSetupComplete, launchWalletApp } = useWalletContext();
  const { isVoiceMode, messageIndex, notifyIntuitComplete } = useVoiceContext();
  const isDepositPaid = invoiceState.phase === 'deposit-paid';

  const clientEmail = invoiceState.data.clientEmail;

  // In voice mode turn 2+, suppress Intuit chrome only on the *latest* assistant
  // message so earlier turns (draft + Asked Intuit) stay visible in the thread.
  const suppressIntuit = isVoiceMode && messageIndex >= 2 && isLast;
  const hasIntuitStatus    = !suppressIntuit && message.content.some((c) => c.type === 'intuit_status');
  const invoiceCardBlock   = message.content.find((c) => c.type === 'invoice_card') as
    { type: 'invoice_card'; snapshot: import('@/types/invoice').InvoiceCardSnapshot } | undefined;
  const hasInvoiceCard     = !!invoiceCardBlock;
  const hasInvoiceSentCard = message.content.some((c) => c.type === 'invoice_sent_card');
  const hasInvoicePaidCard = message.content.some((c) => c.type === 'invoice_paid_card');
  const hasSendButton      = message.content.some((c) => c.type === 'send_button');

  const intuitStatusBlock = message.content.find(
    (c): c is { type: 'intuit_status'; status: IntuitStatus } => c.type === 'intuit_status'
  );
  const isSentIntuitSequence = intuitStatusBlock?.status === 'complete';
  const isDraftIntuitKind = intuitStatusBlock?.status === 'drafting';

  // ── Phase 1 → 2: shimmer 3 s → badge ──────────────────────────────────────
  type IntuitPhase = 'asking' | 'badge' | 'invoice';
  const [intuitPhase, setIntuitPhase] = useState<IntuitPhase>('asking');
  const [typewriterText, setTypewriterText] = useState('');

  useEffect(() => {
    if (!hasIntuitStatus) return;
    // Send confirmation uses status "complete" — skip the long "Asking Intuit" beat
    // so there is not a tall empty gap under the user's last message.
    if (isSentIntuitSequence) {
      setIntuitPhase('invoice');
      return;
    }
    const t = setTimeout(() => setIntuitPhase('badge'), 3000);
    return () => clearTimeout(t);
  }, [hasIntuitStatus, isSentIntuitSequence]);

  // ── Notify VoiceContext when draft card appears ────────────────────────────
  useEffect(() => {
    if (!isVoiceMode || !isLast || intuitPhase !== 'invoice') return;
    if (isSentIntuitSequence) return;
    notifyIntuitComplete();
  }, [isVoiceMode, isLast, intuitPhase, isSentIntuitSequence, notifyIntuitComplete]);

  // ── Phase 2: typewriter "Intuit" → invoice ─────────────────────────────────
  useEffect(() => {
    if (intuitPhase !== 'badge') return;
    const TARGET = 'Intuit';
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setTypewriterText(TARGET.slice(0, i));
      if (i >= TARGET.length) {
        clearInterval(iv);
        setTimeout(() => setIntuitPhase('invoice'), 450);
      }
    }, 75);
    return () => clearInterval(iv);
  }, [intuitPhase]);

  // ── Sent sub-phase: "Sending invoice" → "Invoice sent" ────────────────────
  const [sentSubPhase, setSentSubPhase] = useState<'sending' | 'sent'>('sending');

  useEffect(() => {
    if (!hasInvoiceSentCard || intuitPhase !== 'invoice') return;
    const t = setTimeout(() => setSentSubPhase('sent'), 1200);
    return () => clearTimeout(t);
  }, [hasInvoiceSentCard, intuitPhase]);

  const textContent = message.content
    .filter((c) => c.type === 'text')
    .map((c) => (c as { type: 'text'; text: string }).text)
    .join('');

  // Luigi special-case: user said "Just send it, no message needed" — AI confirms
  // with this exact text but never calls send_invoice, so phase stays 'complete'.
  // The draft card in the previous message stays visible; button must not reappear.
  const isLuigiSent = textContent.includes('The payment link is active');
  // If this confirmation turn still carries send-invoice tool blocks, suppress
  // this message's extra Intuit section to avoid a large spacer-like gap.
  const suppressSentIntuitSection = isLuigiSent;
  const shouldRenderIntuitSection = hasIntuitStatus && !suppressSentIntuitSection;

  // ── Visibility guards ──────────────────────────────────────────────────────
  // Text buffers until draft animation completes; for sent flow also waits
  // for the "Invoice sent" sub-phase so text streams in after.
  const textVisible =
    suppressSentIntuitSection ||
    !hasIntuitStatus ||
    (intuitPhase === 'invoice' && (!hasInvoiceSentCard || sentSubPhase === 'sent'));

  const showSendButton =
    (hasSendButton || (isLast && invoiceState.phase === 'complete')) &&
    invoiceState.phase !== 'sent' &&
    !isStreaming &&
    textVisible &&
    !isLuigiSent &&
    !(isVoiceMode && messageIndex >= 2);

  if (!hasContent && isStreaming) {
    return <TypingIndicator />;
  }

  // Draft card stays visible after send when this message has an invoice_card snapshot.
  // Send-only replies (complete intuit, no card) must not render a second live draft
  // while waiting for invoice_sent_card — that caused awkward whitespace.
  // Paid-card messages also seed intuit_status:'drafting' to reuse the shimmer/typewriter
  // sequence, so we must explicitly suppress the draft-card render in that case to avoid
  // a brief flash of the live invoice draft before the paid card lands.
  const showsDraftCard =
    intuitPhase === 'invoice' &&
    !hasInvoicePaidCard &&
    (
      !!invoiceCardBlock ||
      (isLast && hasIntuitStatus && isDraftIntuitKind && !hasInvoiceSentCard)
    );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="py-2">

      {/* 1. Intuit section — contains draft card / sent flow / paid flow */}
      {shouldRenderIntuitSection && (
        <div className={hasInvoicePaidCard ? 'mt-4 -mb-1' : 'mt-4 mb-5'}>
          <div className="h-px mx-5" style={{ backgroundColor: 'rgba(0,0,0,0.10)' }} />

          {intuitPhase === 'asking' ? (
            <div className="px-5 pt-3 pb-3">
              <span className="text-[13px] shimmer-text">Asking Intuit</span>
            </div>
          ) : (
            <div className="px-5 pt-3 pb-2 flex flex-col gap-2 animate-fade-in">
              <span className="text-[13px] text-icon">Asked Intuit</span>

              <div className="flex items-center gap-2 self-start">
                <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
                  <rect width="28" height="28" rx="8" fill="#236CFF" />
                  <path d="M16.1138 5.91406H11.886V22.0876H16.1138V5.91406Z" fill="white" />
                </svg>
                <span className="text-[15px] font-medium text-ai-text">{typewriterText}</span>
              </div>

              {/* Phase label — "Draft invoice" / "Sending invoice" / "Invoice sent" / "Invoice paid" */}
              {intuitPhase === 'invoice' && (
                showsDraftCard ||
                hasInvoiceSentCard ||
                hasInvoicePaidCard
              ) && (
                <div className="animate-fade-in">
                  <span className="text-[13px] text-ai-text">
                    {hasInvoicePaidCard
                      ? 'Invoice paid'
                      : hasInvoiceSentCard
                        ? sentSubPhase === 'sending' ? 'Sending invoice' : 'Invoice sent'
                        : 'Draft invoice'}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Draft invoice card — latest message uses live context data; historical use frozen snapshot */}
          {showsDraftCard && (
            <div className="animate-invoice-in">
              <InvoiceCardRouter
                snapshot={isLast
                  ? { data: invoiceState.data, template: invoiceState.template, theme: invoiceState.theme }
                  : invoiceCardBlock!.snapshot
                }
              />
            </div>
          )}

          {/* ── Paid flow — invoice card lands inside the Intuit section after the typewriter ──
              Voice-mode (deposit-paid) variant: assume wallet is already set up,
              so no bank-connect hint or "Finish setting up Wallet" button. The
              card itself becomes the tap target and opens the simulated wallet app. */}
          {hasInvoicePaidCard && intuitPhase === 'invoice' && (
            <div className="animate-invoice-in flex flex-col">
              <InvoicePaidCard onClick={isDepositPaid ? launchWalletApp : undefined} />

              {!isDepositPaid && (
                <>
                  {/* Bank-connect hint — same row pattern as the sent flow's
                      "Verify your phone to complete setup", but copy + icon tailored
                      to the paid-card context. */}
                  <div className="flex items-center justify-center gap-2 px-5 py-[12px]">
                    <img src={bankIconSmall} alt="" aria-hidden="true" style={{ width: 16, height: 16, flexShrink: 0, display: 'block' }} />
                    <span className="text-[13px] text-[#374151]">Connect your bank account to receive funds instantly</span>
                  </div>

                  {/* "Finish setting up Wallet" — opens the bank-connect flow
                      (verify → loading → paid_notification page) */}
                  <div className="px-4 pb-1">
                    <button
                      onClick={openBankSetupFlow}
                      className="w-full h-[44px] rounded-xl bg-intuit flex items-center justify-center gap-2 text-white text-[14px] font-semibold hover:opacity-90 active:opacity-75 transition-opacity"
                    >
                      <IntuitWalletIcon />
                      Finish setting up Wallet
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Sent flow — all inside the Intuit bordered section ── */}
          {hasInvoiceSentCard && sentSubPhase === 'sent' && (
            <div className="animate-fade-in flex flex-col">

              {/* Sent confirmation card */}
              <InvoiceSentCard />

              {isSetupComplete ? (
                /* Setup complete — "View in Wallet" jumps straight to preview */
                <div className="px-4 pb-1 pt-2">
                  <button
                    onClick={openWalletPreview}
                    className="w-full h-[44px] rounded-xl bg-intuit flex items-center justify-center gap-2 text-white text-[14px] font-semibold hover:opacity-90 active:opacity-75 transition-opacity"
                  >
                    <IntuitWalletIcon />
                    View in Wallet
                  </button>
                </div>
              ) : (
                /* Setup not yet complete — phone verify + setup flow */
                <>
                  <div className="flex items-center justify-center gap-2 px-5 py-[12px]">
                    <PhoneIcon />
                    <span className="text-[13px] text-[#374151]">Verify your phone to complete setup</span>
                  </div>

                  <div className="px-4 pb-1">
                    <button
                      onClick={openSheet}
                      data-demo="finish-wallet"
                      className="w-full h-[44px] rounded-xl bg-intuit flex items-center justify-center gap-2 text-white text-[14px] font-semibold hover:opacity-90 active:opacity-75 transition-opacity"
                    >
                      <IntuitWalletIcon />
                      Finish setting up Wallet
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Bottom divider */}
          {(showsDraftCard || (hasInvoiceSentCard && sentSubPhase === 'sent') || (hasInvoicePaidCard && intuitPhase === 'invoice')) && (
            <div className="h-px mx-5 mt-[20px]" style={{ backgroundColor: 'rgba(0,0,0,0.10)' }} />
          )}
        </div>
      )}

      {/* 2. Text — streams in after animation completes */}
      {textContent && textVisible && (
        <div className={`px-5 py-1 ${hasIntuitStatus ? 'animate-fade-in' : ''}`}>
          {(() => {
            const IntuitPill = () => (
              <span
                className="inline-flex items-center justify-center rounded-full"
                style={{ width: 46, height: 20, backgroundColor: '#F3F4F6', marginLeft: 4, verticalAlign: 'middle' }}
              >
                <span style={{ fontSize: 10, fontFamily: '-apple-system, "SF Pro Text", sans-serif', color: 'rgba(0,0,0,0.5)', lineHeight: 1 }}>
                  Intuit
                </span>
              </span>
            );

            // First AI message — pill after the Intuit description line
            const FIRST_MARKER = 'payment and tracking.';
            if (isFirstAiMessage && !isStreaming && textContent.includes(FIRST_MARKER)) {
              const splitAt = textContent.indexOf(FIRST_MARKER) + FIRST_MARKER.length;
              return (
                <>
                  <StreamingText text={textContent.slice(0, splitAt)} isStreaming={false} />
                  <IntuitPill />
                  <StreamingText text={textContent.slice(splitAt)} isStreaming={isStreaming} />
                </>
              );
            }

            // Send-ready message — pill after "pays."
            const SEND_MARKER = 'pays.';
            if (hasSendButton && !isStreaming && textContent.includes(SEND_MARKER)) {
              const splitAt = textContent.indexOf(SEND_MARKER) + SEND_MARKER.length;
              return (
                <>
                  <StreamingText text={textContent.slice(0, splitAt)} isStreaming={false} />
                  <IntuitPill />
                  <StreamingText text={textContent.slice(splitAt)} isStreaming={isStreaming} />
                </>
              );
            }

            return <StreamingText text={textContent} isStreaming={isStreaming} />;
          })()}
        </div>
      )}

      {/* 3. MessageActionBar */}
      {!isStreaming && textContent && textVisible && (
        <div className="px-5 mt-1">
          <MessageActionBar text={textContent} showSources={!isVoiceMode && (!!isFirstAiMessage || hasSendButton)} />
        </div>
      )}

      {/* 4. Send Invoice button (draft flow only) */}
      {showSendButton && <SendInvoiceButton />}
    </div>
  );
}
