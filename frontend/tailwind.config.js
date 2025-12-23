/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Cores do Grêmio
        gremio: {
          celeste: {
            DEFAULT: '#00A3E0',
            50: '#E5F7FF',
            100: '#CCF0FF',
            200: '#99E0FF',
            300: '#66D1FF',
            400: '#33C1FF',
            500: '#00A3E0',
            600: '#0082B3',
            700: '#006186',
            800: '#004159',
            900: '#00202D',
          },
          preto: '#000000',
          branco: '#FFFFFF',
        },
        // Neutros (baseado no FernandoKraftSpaar/LandingSeiteTEST)
        neutral: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
          950: '#030712',
        },
        // Estados
        success: '#10B981',
        error: '#EF4444',
        warning: '#F59E0B',
        info: '#3B82F6',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Montserrat', 'sans-serif'],
      },
      boxShadow: {
        'gremio': '0 4px 14px 0 rgba(0, 163, 224, 0.39)',
        'gremio-lg': '0 10px 40px 0 rgba(0, 163, 224, 0.25)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.5s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
