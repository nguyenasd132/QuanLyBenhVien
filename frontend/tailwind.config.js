/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#EEF4FB',
        surface: '#FFFFFF',
        hairline: '#C7D6EA',
        primary: {
          DEFAULT: '#1D5BB8',
          50: '#EEF4FB',
          100: '#DCEAFB',
          200: '#BDD6F7',
          300: '#9EC0EC',
          400: '#4F89DF',
          500: '#1D5BB8',
          600: '#164996',
          700: '#113A7A',
        },
        ink: {
          DEFAULT: '#0F172A',
          secondary: '#334155',
          muted: '#475569',
        },
      },
      fontFamily: {
        sans: [
          '"Plus Jakarta Sans"',
          '"Inter"',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 2px 12px -2px rgba(15, 42, 82, 0.08), 0 1px 3px rgba(15, 42, 82, 0.05)',
        'card-hover': '0 10px 25px -5px rgba(29, 91, 184, 0.16), 0 4px 10px -3px rgba(15, 42, 82, 0.08)',
        soft: '0 1px 2px rgba(15, 23, 42, 0.06)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
    },
  },
  plugins: [],
};
