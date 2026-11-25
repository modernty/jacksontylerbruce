import React from 'react';
import { useVoiceContext } from '@/context/VoiceContext';
import idleOrb from '@/assets/orb-idle.gif';
import './VoiceOrb.css';

export function VoiceOrb() {
  const { isPlaying, isAiSpeaking, playNextMessage } = useVoiceContext();
  const locked = isPlaying || isAiSpeaking;

  return (
    <div className="voice-orb-container">
      <button
        onClick={playNextMessage}
        disabled={locked}
        style={{ background: 'none', border: 'none', padding: 0, cursor: locked ? 'default' : 'pointer', pointerEvents: 'all' }}
      >
        <img
          src={idleOrb}
          alt="Voice orb"
          style={{ width: 240, height: 240, objectFit: 'contain', display: 'block' }}
        />
      </button>
    </div>
  );
}
