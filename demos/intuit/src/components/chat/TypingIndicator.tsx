import React from 'react';
import Lottie from 'lottie-react';
import animationData from '@/assets/loading-animation.json';

export function TypingIndicator() {
  return (
    <div className="py-1">
      <Lottie animationData={animationData} loop style={{ width: 44, height: 44, marginLeft: -2 }} />
    </div>
  );
}
