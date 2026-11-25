/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        intuit: '#236CFF',
        'intuit-dark': '#1A56CC',
        'intuit-pill': '#EEF3FF',
        'user-bubble': '#F0F0F0',
        'ai-text': '#1A1A1A',
        'input-bg': '#F0F0F0',
        'icon': '#8E8E8E',
        'placeholder': '#AEAEB2',
        'divider': '#E5E5E5',
        'success': '#34C759',
        'tpl-teal': '#0D9488',
        'tpl-teal-bg': '#F0FDFA',
        'tpl-muted': '#6B7280',
        'tpl-surface': '#F8FAFC',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        'bounce-dot': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        'dot-pulse': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(0.4)' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'invoice-in': {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        pulse: {
          '0%, 100%': { opacity: '0.65' },
          '50%': { opacity: '1' },
        },
      },
      animation: {
        blink: 'blink 0.8s step-end infinite',
        'dot-1': 'bounce-dot 0.6s ease-in-out infinite 0ms',
        'dot-2': 'bounce-dot 0.6s ease-in-out infinite 160ms',
        'dot-3': 'bounce-dot 0.6s ease-in-out infinite 320ms',
        'dot-pulse': 'dot-pulse 0.9s ease-in-out infinite',
        'fade-in': 'fade-in 0.4s ease-out forwards',
        'fade-in-delay': 'fade-in 0.5s ease-out 200ms both',
        'slide-up': 'slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'invoice-in': 'invoice-in 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'pulse-slow': 'pulse 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
