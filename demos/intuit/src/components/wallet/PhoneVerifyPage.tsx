import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useWalletContext } from '@/context/WalletContext';

const CODE_LENGTH = 6;
const TIMER_SECONDS = 60;

function IntuitWordmark() {
  return (
    <svg width="90" height="18" viewBox="0 0 90 18" fill="none">
      <path
        d="M45.9555 10.4174C45.9555 14.7978 49.5865 18 54.2015 18C58.8164 18 62.4544 14.7978 62.4544 10.4174V0.353485H57.9849V9.89757C57.9849 12.2611 56.3496 13.8552 54.1876 13.8552C52.0257 13.8552 50.3903 12.268 50.3903 9.89757V0.353485H45.9209L45.9486 10.4174H45.9555ZM74.3867 4.38044H79.7154V17.6742H84.1848V4.38044H89.5135V0.346554H74.3867V4.38044V4.38044ZM71.4972 0.346554H67.0277V17.6742H71.4972V0.346554ZM27.9045 4.38044H33.2332V17.6742H37.7027V4.38044H43.0313V0.346554H27.9045V4.38044ZM4.46944 0.346554H0V17.6742H4.46944V0.346554ZM25.5555 7.58259C25.5555 3.20216 21.9176 0 17.3026 0C12.6877 0 9.05668 3.20216 9.05668 7.58259V17.6742H13.5261V8.12322C13.5261 5.75972 15.1614 4.16558 17.3234 4.16558C19.4854 4.16558 21.1207 5.75279 21.1207 8.12322V17.6673H25.5901L25.5624 7.57566L25.5555 7.58259Z"
        fill="#236CFF"
      />
    </svg>
  );
}

export function PhoneVerifyPage() {
  const { completeSetup, verificationCode } = useWalletContext();
  const [code, setCode] = useState('');
  const [timer, setTimer] = useState(TIMER_SECONDS);
  const [canResend, setCanResend] = useState(false);
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (timer <= 0) { setCanResend(true); return; }
    const t = setInterval(() => setTimer((p) => p - 1), 1000);
    return () => clearInterval(t);
  }, [timer]);

  const handleVerify = useCallback(() => {
    if (code === verificationCode) {
      completeSetup();
    } else {
      setError(true);
      setCode('');
    }
  }, [code, verificationCode, completeSetup]);

  const handleResend = useCallback(() => {
    setTimer(TIMER_SECONDS);
    setCanResend(false);
    setCode('');
    setError(false);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH);
    setCode(v);
    if (error) setError(false);
  };

  const isComplete = code.length === CODE_LENGTH;

  return (
    <div className="flex flex-col items-center h-full" style={{ fontFamily: "'Avenir Next', Avenir, sans-serif" }}>

      {/* Intuit wordmark */}
      <div className="flex-shrink-0 flex items-center justify-center pt-8 pb-6">
        <IntuitWordmark />
      </div>

      {/* Body — centered */}
      <div className="flex flex-col items-center flex-1 w-full px-6">

        {/* Heading */}
        <h1 className="mt-10 text-[24px] text-[#111827] text-center leading-tight" style={{ fontFamily: "'Avenir Next', Avenir, sans-serif", fontWeight: 600 }}>
          Verify your phone number
        </h1>

        {/* Subheading paragraph */}
        <p
          className="mt-2 text-center"
          style={{
            fontSize: 14,
            lineHeight: '120%',
            fontWeight: 500,
            fontFamily: "'Avenir Next', Avenir, -apple-system, sans-serif",
            color: '#393A3D',
          }}
        >
          Enter the verification code we sent you to verify your identity.
        </p>

        {/* Sent-to block — 40px below paragraph */}
        <div className="mt-10 flex flex-col items-center gap-0.5">
          <span
            className="text-[14px] text-center"
            style={{ fontWeight: 500, color: '#393A3D' }}
          >
            We sent a code to:
          </span>
          <span
            className="text-[15px] text-center text-black"
            style={{ fontWeight: 600 }}
          >
            +1 (415) 555-0132
          </span>
        </div>

        {/* Hidden real input */}
        <input
          ref={inputRef}
          type="tel"
          inputMode="numeric"
          maxLength={CODE_LENGTH}
          value={code}
          onChange={handleChange}
          className="absolute opacity-0 pointer-events-none w-0 h-0"
          aria-label="Verification code"
          data-demo="code"
        />

        {/* Visual digit boxes */}
        <div
          className="flex gap-2 mt-6 w-full"
          onClick={() => inputRef.current?.focus()}
          role="button"
          tabIndex={-1}
        >
          {Array.from({ length: CODE_LENGTH }).map((_, i) => {
            const isFocused = i === code.length;
            const filled = !!code[i];
            return (
              <div
                key={i}
                className={`flex-1 h-[56px] rounded-xl border-2 flex items-center justify-center text-[22px] font-semibold transition-colors select-none ${
                  error
                    ? 'border-red-400 bg-red-50'
                    : isFocused
                    ? 'border-intuit bg-[#EEF3FF]'
                    : filled
                    ? 'border-intuit bg-white'
                    : 'border-[#E5E5E5] bg-[#F9F9F9]'
                }`}
              >
                {filled ? '•' : ''}
              </div>
            );
          })}
        </div>

        {error && (
          <p className="mt-3 text-[13px] text-red-500 text-center animate-fade-in">
            Incorrect code. Please try again.
          </p>
        )}

        {/* Resend */}
        <div className="mt-5 flex justify-center">
          {canResend ? (
            <button
              onClick={handleResend}
              className="text-[15px] text-intuit font-medium"
            >
              Resend code
            </button>
          ) : (
            <span className="text-[15px] text-[#9CA3AF]">
              Resend code in {timer}s
            </span>
          )}
        </div>

        {/* Call me instead or change number — 24px below resend */}
        <div className="mt-6 flex items-center justify-center text-[15px]" style={{ fontWeight: 600 }}>
          <span className="text-intuit">Call me instead</span>
          <span className="text-[#111827]">&nbsp;or&nbsp;</span>
          <span className="text-intuit">change number</span>
        </div>
      </div>

      {/* Verify button */}
      <div className="px-5 pb-10 flex-shrink-0 w-full">
        <button
          disabled={!isComplete}
          onClick={handleVerify}
          data-demo="verify"
          className="w-full h-[54px] rounded-xl bg-intuit text-white text-[17px] font-semibold transition-opacity disabled:opacity-30 active:opacity-75"
        >
          Verify
        </button>
      </div>
    </div>
  );
}
