import React, { useEffect, useRef, useState } from 'react';
import Lottie, { type LottieRefCurrentProps } from 'lottie-react';
import splashAnimation from '@/assets/intuit-wallet-splash.json';

// Simulated app-launch screen — full-screen blue with a centered Intuit Wallet
// splash animation. Mounted while the wallet-app overlay is active. Stays at
// opacity 1 once entered; the home screen fades in ON TOP of it (both mounted
// briefly during the transition so the wallet preview behind never shows
// through).
export function WalletAppLaunchScreen() {
  const [entered, setEntered] = useState(false);
  const lottieRef = useRef<LottieRefCurrentProps>(null);

  useEffect(() => {
    const enterRaf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(enterRaf);
  }, []);

  // Hold on the first frame for 500ms, then play through over ~1.5s.
  // Source clip is ~1.034s at 1× → speed 0.69 ≈ 1.5s playthrough.
  useEffect(() => {
    lottieRef.current?.setSpeed(0.69);
    lottieRef.current?.goToAndStop(0, true);
    const t = setTimeout(() => lottieRef.current?.play(), 500);
    return () => clearTimeout(t);
  }, []);

  const visible = entered;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 90,
        backgroundColor: '#236CFF',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.4s ease-out',
      }}
    >
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
    </div>
  );
}
