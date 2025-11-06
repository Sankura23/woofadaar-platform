/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          mint: '#3bbca8',
          beige: '#fef8e8',
          coral: '#e05a37',
          mutedPurple: '#76519f',
          coolBlue: '#3b82f6',
        },
        secondary: {
          mint: {
            10: '#3bbca81A',
            20: '#3bbca833',
            30: '#3bbca84D',
          },
          beige: {
            10: '#fef8e81A',
            20: '#fef8e833',
            30: '#fef8e84D',
          },
        },
        neutral: {
          milkWhite: '#FEFCF8',
          secondaryOrange: '#FFDDB6',
          tertiaryCream: '#FFF7E7',
          900: '#111827',
          700: '#374151',
          500: '#6b7280',
          300: '#d1d5db',
          100: '#f3f4f6',
          50: '#f9fafb',
        },
        functional: {
          error: '#ef4444',
          success: '#22c55e',
          warning: '#f59e0b',
          info: '#3b82f6',
        },
        ui: {
          surface: '#FFFFFF',
          background: '#FEFCF8',
          textPrimary: '#111827',
          textSecondary: '#374151',
          textTertiary: '#6b7280',
          border: '#d1d5db',
        },
      },
      fontFamily: {
        sans: ['Public Sans', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Public Sans', 'sans-serif'],
      },
      borderRadius: {
        'xl': '16px',
        '2xl': '20px',
        '3xl': '24px',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'bounce-slow': 'bounce 3s infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}