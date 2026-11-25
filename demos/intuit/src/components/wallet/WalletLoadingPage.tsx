import React, { useEffect, useRef } from 'react';
import Lottie, { type LottieRefCurrentProps } from 'lottie-react';
import splashAnimation from '@/assets/intuit-wallet-splash-blue.json';

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

export function WalletLoadingPage() {
  const lottieRef = useRef<LottieRefCurrentProps>(null);

  // Hold on the first frame for 500ms, then play through over ~1.5s.
  // Source clip is ~1.034s at 1× → speed 0.69 ≈ 1.5s playthrough.
  useEffect(() => {
    lottieRef.current?.setSpeed(0.69);
    lottieRef.current?.goToAndStop(0, true);
    const t = setTimeout(() => lottieRef.current?.play(), 500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="relative h-full w-full"
      style={{ fontFamily: "'Avenir Next', Avenir, sans-serif" }}
    >
      {/* Intuit wordmark — matches PhoneVerifyPage */}
      <div
        style={{
          position: 'absolute',
          top: 32,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <IntuitWordmark />
      </div>

      {/* Animation — centered in the bottom sheet, nudged 24px up */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, calc(-50% - 88px))',
        }}
      >
        <Lottie
          lottieRef={lottieRef}
          animationData={splashAnimation}
          loop={false}
          autoplay={false}
          style={{ width: 544, height: 187, maxWidth: '100%', display: 'block' }}
        />
      </div>

      {/* Welcome copy — own absolutely-positioned wrapper, centered for now */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '100%',
          paddingLeft: 24,
          paddingRight: 24,
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 22,
            lineHeight: '28px',
            fontWeight: 600,
            color: '#111827',
          }}
        >
          Welcome to Intuit Wallet
        </h1>
        <p
          style={{
            margin: 0,
            marginTop: 4,
            fontSize: 14,
            lineHeight: '20px',
            fontWeight: 500,
            color: '#6B7280',
          }}
        >
          Just a moment...
        </p>
      </div>
    </div>
  );
}
