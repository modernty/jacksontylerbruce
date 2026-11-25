import React from 'react';
import { useWalletContext } from '@/context/WalletContext';
import { WalletAppLaunchScreen } from './WalletAppLaunchScreen';
import { WalletAppHome } from './WalletAppHome';

// Top-level mount for the simulated Intuit Wallet "app" experience. Mounted
// in App.tsx — covers chat / sheet / lock screen at z-90 (system StatusBar
// at z-100 stays above).
//
// Both screens stay mounted while the wallet app is active. The launch screen
// holds at opacity 1 throughout; the home screen fades in ON TOP of it once
// walletAppView becomes 'home'. This prevents any flash of the wallet preview
// behind during the transition.
export function WalletAppOverlay() {
  const { walletAppView } = useWalletContext();

  if (walletAppView === null) return null;

  return (
    <>
      <WalletAppLaunchScreen />
      {walletAppView === 'home' && <WalletAppHome />}
    </>
  );
}
