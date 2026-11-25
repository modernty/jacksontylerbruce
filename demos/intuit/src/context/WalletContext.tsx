import React, { createContext, useContext, useState, useCallback, PropsWithChildren } from 'react';

export type WalletPage = 'verify' | 'loading' | 'preview' | 'paid_notification' | 'connect_bank';

// Discrete stages of the simulated Intuit Wallet "app" experience.
// `null` means the wallet app overlay isn't active.
export type WalletAppView = 'launching' | 'home' | null;

// Where the verify → loading sequence should end up. Set ONLY by the entry-point
// actions (`openSheet`, `openWalletPreview`, `openBankSetupFlow`). PhoneVerifyPage
// stays oblivious — it just calls `completeSetup()`, which routes here.
type LoadingDestination = 'preview' | 'paid_notification';

interface WalletContextValue {
  isSheetOpen: boolean;
  page: WalletPage;
  isSetupComplete: boolean;
  isLockScreenVisible: boolean;
  isOpenInAppModalVisible: boolean;
  walletAppView: WalletAppView;
  /**
   * The 6-digit verify-your-phone code for the active flow.
   * - Initial wallet setup: '324891'
   * - Bank-connect setup:   '213107'
   * Derived from loadingDestination so PhoneVerifyPage and NotificationBanner
   * stay in sync without extra plumbing.
   */
  verificationCode: string;
  openSheet: () => void;
  openWalletPreview: () => void;
  openBankSetupFlow: () => void;
  goToConnectBank: () => void;
  closeSheet: () => void;
  completeSetup: () => void;
  openLockScreen: () => void;
  dismissLockScreen: () => void;
  showOpenInAppModal: () => void;
  hideOpenInAppModal: () => void;
  launchWalletApp: () => void;
  closeWalletApp: () => void;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: PropsWithChildren) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [page, setPage] = useState<WalletPage>('verify');
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [isLockScreenVisible, setIsLockScreenVisible] = useState(false);
  const [loadingDestination, setLoadingDestination] = useState<LoadingDestination>('preview');
  const [isOpenInAppModalVisible, setIsOpenInAppModalVisible] = useState(false);
  const [walletAppView, setWalletAppView] = useState<WalletAppView>(null);

  const openSheet = useCallback(() => {
    setLoadingDestination('preview');
    setPage('verify');
    setIsSheetOpen(true);
  }, []);

  // Skip verification and jump directly to the wallet preview (user already set up)
  const openWalletPreview = useCallback(() => {
    setLoadingDestination('preview');
    setPage('preview');
    setIsSheetOpen(true);
  }, []);

  // Bank-connect flow — re-uses verify + loading, but lands on the
  // new "Invoice paid" notification page instead of the wallet preview.
  const openBankSetupFlow = useCallback(() => {
    setLoadingDestination('paid_notification');
    setPage('verify');
    setIsSheetOpen(true);
  }, []);

  // Navigate to the connect-bank page from the paid notification.
  const goToConnectBank = useCallback(() => {
    setPage('connect_bank');
  }, []);

  const closeSheet = useCallback(() => {
    setIsSheetOpen(false);
  }, []);

  // Mark setup complete immediately, show loading screen, then auto-advance
  // to whatever destination the entry-point set (preview or paid_notification).
  const completeSetup = useCallback(() => {
    setIsSetupComplete(true);
    setPage('loading');
    setTimeout(() => setPage(loadingDestination), 2500);
  }, [loadingDestination]);

  // Cross-fade from the wallet sheet to the lock screen — no sheet slide.
  // The sheet fades to opacity 0 in place while the lock screen fades in over it.
  const openLockScreen = useCallback(() => {
    setIsLockScreenVisible(true);
    setIsSheetOpen(false);
  }, []);

  const dismissLockScreen = useCallback(() => {
    setIsLockScreenVisible(false);
  }, []);

  const showOpenInAppModal = useCallback(() => {
    setIsOpenInAppModalVisible(true);
  }, []);

  const hideOpenInAppModal = useCallback(() => {
    setIsOpenInAppModalVisible(false);
  }, []);

  // Simulated Intuit Wallet "app" launch — full-screen blue + spinner for
  // 2.5s, then transitions to the home screen.
  const launchWalletApp = useCallback(() => {
    setWalletAppView('launching');
    setTimeout(() => setWalletAppView('home'), 2500);
  }, []);

  const closeWalletApp = useCallback(() => {
    setWalletAppView(null);
  }, []);

  // Per-flow verify code — keyed off loadingDestination.
  const verificationCode = loadingDestination === 'paid_notification' ? '213107' : '324891';

  return (
    <WalletContext.Provider value={{
      isSheetOpen,
      page,
      isSetupComplete,
      isLockScreenVisible,
      isOpenInAppModalVisible,
      walletAppView,
      verificationCode,
      openSheet,
      openWalletPreview,
      openBankSetupFlow,
      goToConnectBank,
      closeSheet,
      completeSetup,
      openLockScreen,
      dismissLockScreen,
      showOpenInAppModal,
      hideOpenInAppModal,
      launchWalletApp,
      closeWalletApp,
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWalletContext(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWalletContext must be used within WalletProvider');
  return ctx;
}
