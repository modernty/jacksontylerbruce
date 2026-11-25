import React, { createContext, useContext, useState, useCallback, useRef, useEffect, PropsWithChildren } from 'react';
import { generateSpeech, FEMALE_VOICE_ID } from '@/services/elevenlabs';
import { useChatContext } from '@/context/ChatContext';
import { setActiveUser, LUIGI, JENNIFER } from '@/constants/currentUser';

export const VOICE_MESSAGES = [
  "Please send an invoice for our standard deposit payment to the Martinez wedding.",
  "Just send it, no message needed.",
];

const AI_RESPONSE_SCRIPTS: string[] = [
  "I located Maria Martinez in QuickBooks. The total contract amount is $3,200, and the standard deposit is 25%. Here's the invoice for an upfront payment of $800. Do you need to change anything or include a personalized message to the client?",
  "The invoice has been sent to maria.martinez@gmail.com. The payment link is active. I'll notify you when the invoice is paid.",
];

const RACHEL_VOICE_ID = FEMALE_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL';

interface VoiceContextValue {
  isVoiceMode: boolean;
  isPlaying: boolean;
  isAiSpeaking: boolean;
  volume: number;
  messageIndex: number;
  isVoiceLockScreenVisible: boolean;
  enterVoiceMode: () => void;
  exitVoiceMode: () => void;
  playNextMessage: () => Promise<void>;
  notifyIntuitComplete: () => void;
  openVoiceLockScreen: () => void;
  dismissVoiceLockScreen: () => void;
  resumeInTextMode: () => void;
}

const VoiceContext = createContext<VoiceContextValue | null>(null);

export function VoiceProvider({ children }: PropsWithChildren) {
  const { sendMessage, clearChat, state: chatState } = useChatContext();

  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [volume, setVolume] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const [isVoiceLockScreenVisible, setIsVoiceLockScreenVisible] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number>(0);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const aiAudioRef = useRef<HTMLAudioElement | null>(null);

  // Holds the in-flight blob URL promise for the AI response audio.
  // Populated when the orb is tapped; consumed when streaming starts.
  const aiUrlPromiseRef = useRef<Promise<string> | null>(null);

  const stopAnalyser = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    setVolume(0);
  }, []);

  const startAnalyser = useCallback((analyser: AnalyserNode) => {
    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      setVolume(avg / 255);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const enterVoiceMode = useCallback(() => {
    setActiveUser(LUIGI);
    clearChat();
    setMessageIndex(0);
    aiUrlPromiseRef.current = null;
    setIsVoiceMode(true);
    setIsVoiceLockScreenVisible(false);
  }, [clearChat]);

  const openVoiceLockScreen = useCallback(() => {
    setIsVoiceLockScreenVisible(true);
  }, []);

  const dismissVoiceLockScreen = useCallback(() => {
    setIsVoiceLockScreenVisible(false);
  }, []);

  // Resume the same conversation in text-mode styling: tear down audio,
  // flip isVoiceMode off, but DO NOT clear the chat or swap the active
  // user — the user is just continuing their session in a different mode.
  const resumeInTextMode = useCallback(() => {
    sourceRef.current?.stop();
    stopAnalyser();
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    if (aiAudioRef.current) {
      aiAudioRef.current.pause();
      aiAudioRef.current = null;
    }
    aiUrlPromiseRef.current = null;
    setIsVoiceMode(false);
    setIsPlaying(false);
    setIsAiSpeaking(false);
    setVolume(0);
  }, [stopAnalyser]);

  const exitVoiceMode = useCallback(() => {
    setActiveUser(JENNIFER);
    sourceRef.current?.stop();
    stopAnalyser();
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    if (aiAudioRef.current) {
      aiAudioRef.current.pause();
      aiAudioRef.current = null;
    }
    aiUrlPromiseRef.current = null;
    setIsVoiceMode(false);
    setIsPlaying(false);
    setIsAiSpeaking(false);
    setVolume(0);
    setIsVoiceLockScreenVisible(false);
  }, [stopAnalyser]);

  const playAiAudio = useCallback((urlPromise: Promise<string>) => {
    urlPromise.then((url) => {
      const audio = new Audio(url);
      aiAudioRef.current = audio;
      setIsAiSpeaking(true);
      audio.onended = () => {
        setIsAiSpeaking(false);
        URL.revokeObjectURL(url);
        aiAudioRef.current = null;
      };
      audio.play().catch((err) => {
        console.error('[VoiceContext] AI audio play error:', err);
        setIsAiSpeaking(false);
        URL.revokeObjectURL(url);
      });
    }).catch((err) => {
      console.error('[VoiceContext] AI audio URL promise rejected:', err);
    });
  }, []);

  // Called by AiMessage when intuitPhase transitions to 'invoice' (draft card
  // appears). That's the moment the AI voice should start playing.
  const notifyIntuitComplete = useCallback(() => {
    const urlPromise = aiUrlPromiseRef.current;
    if (!urlPromise) return;
    aiUrlPromiseRef.current = null;
    playAiAudio(urlPromise);
  }, [playAiAudio]);

  // Fallback for turns with no Intuit animation (e.g. the "send" confirmation).
  // If aiUrlPromiseRef is still set when streaming ends, play it now.
  useEffect(() => {
    if (!isVoiceMode || chatState.isStreaming) return;
    const urlPromise = aiUrlPromiseRef.current;
    if (!urlPromise) return;
    aiUrlPromiseRef.current = null;
    playAiAudio(urlPromise);
  }, [isVoiceMode, chatState.isStreaming, playAiAudio]);

  const playNextMessage = useCallback(async () => {
    if (isPlaying || isAiSpeaking) return;
    // After both scripted turns are done, the next orb tap opens the
    // voice-mode lock screen instead of trying to play a third message.
    if (messageIndex >= VOICE_MESSAGES.length) {
      setIsVoiceLockScreenVisible(true);
      return;
    }

    const text = VOICE_MESSAGES[messageIndex];
    const script = AI_RESPONSE_SCRIPTS[messageIndex] ?? AI_RESPONSE_SCRIPTS[AI_RESPONSE_SCRIPTS.length - 1];

    setIsPlaying(true);

    // Both fetches kick off in parallel immediately.
    // User voice is awaited before playing; AI voice resolves to a blob URL
    // in the background while the user's audio plays.
    const userRawPromise = generateSpeech(text);
    aiUrlPromiseRef.current = generateSpeech(script, RACHEL_VOICE_ID)
      .then((aiRaw) => {
        const blob = new Blob([aiRaw], { type: 'audio/mpeg' });
        return URL.createObjectURL(blob);
      })
      .catch((err) => {
        console.error('[VoiceContext] AI voice fetch failed:', err);
        throw err;
      });

    try {
      const userRaw = await userRawPromise;

      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') await ctx.resume();

      const userAudioBuffer = await ctx.decodeAudioData(userRaw);

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;

      const source = ctx.createBufferSource();
      source.buffer = userAudioBuffer;
      source.connect(analyser);
      analyser.connect(ctx.destination);
      sourceRef.current = source;

      startAnalyser(analyser);
      source.start();

      source.onended = () => {
        stopAnalyser();
        setIsPlaying(false);
        setMessageIndex((i) => i + 1);
        // Kick off Claude streaming — when isStreaming fires, the useEffect
        // above will pick up the pre-fetched blob URL and play it.
        sendMessage(text, undefined, true);
      };
    } catch (err) {
      console.error('[VoiceContext] User voice error:', err);
      setIsPlaying(false);
    }
  }, [isPlaying, isAiSpeaking, messageIndex, sendMessage, startAnalyser, stopAnalyser]);

  return (
    <VoiceContext.Provider value={{ isVoiceMode, isPlaying, isAiSpeaking, volume, messageIndex, isVoiceLockScreenVisible, enterVoiceMode, exitVoiceMode, playNextMessage, notifyIntuitComplete, openVoiceLockScreen, dismissVoiceLockScreen, resumeInTextMode }}>
      {children}
    </VoiceContext.Provider>
  );
}

export function useVoiceContext(): VoiceContextValue {
  const ctx = useContext(VoiceContext);
  if (!ctx) throw new Error('useVoiceContext must be used within VoiceProvider');
  return ctx;
}
