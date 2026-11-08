/** @type {import('tailwindcss').Config} */

// Palette "tech dark": base quasi nera con tinta fredda, un solo accento vibrante (lime),
// stati semantici nitidi. Niente viola. Le scale 50-200 sono tinte traslucide per fondi
// di badge/riquadri; 700-900 sono varianti chiare per testo leggibile su fondo scuro.
const tint = (rgb) => ({
  50: `rgba(${rgb}, 0.10)`,
  100: `rgba(${rgb}, 0.16)`,
  200: `rgba(${rgb}, 0.30)`,
  300: `rgba(${rgb}, 0.50)`,
});

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        // Superficie delle card (sostituisce bg-white)
        surface: '#12161D',
        gray: {
          50: '#0A0C10',   // fondo pagina / riquadri incassati
          100: '#171C25',  // fondo rialzato, hover
          200: '#232A36',  // bordi, skeleton
          300: '#2F3846',  // bordi input
          400: '#7B869A',
          500: '#8C96A8',
          600: '#A6B0C0',
          700: '#C5CCD8',
          800: '#DEE3EB',
          900: '#F0F3F8',
        },
        // Accento (usato al posto di "blue"): lime elettrico
        blue: {
          ...tint('190, 242, 60'),
          400: '#CBF560',
          500: '#BEF23C',
          600: '#B4EA2E',
          700: '#9FD11F',
          800: '#CDF56E',
          900: '#E2FA9C',
        },
        green: { ...tint('52, 211, 153'), 400: '#34D399', 500: '#34D399', 600: '#34D399', 700: '#6EE7B7', 800: '#8CEBC6', 900: '#B5F2DA' },
        red: { ...tint('255, 92, 77'), 400: '#FF6E60', 500: '#FF5C4D', 600: '#E5483A', 700: '#FF8F83', 800: '#FFA89F', 900: '#FFC6C0' },
        yellow: { ...tint('255, 194, 51'), 300: '#FFD466', 400: '#FFC233', 500: '#FFC233', 600: '#FFC233', 700: '#FFD36B', 800: '#FFDE8F', 900: '#FFEBB8' },
        orange: { ...tint('255, 138, 61'), 400: '#FF9B57', 500: '#FF8A3D', 600: '#FF8A3D', 700: '#FFAA73', 800: '#FFBE92', 900: '#FFD7BB' },
        // Niente viola: "purple" e "indigo" diventano rosa e azzurro
        purple: { ...tint('251, 113, 133'), 500: '#FB7185', 600: '#FB7185', 700: '#FDA4AF', 800: '#FDB9C2', 900: '#FED7DC' },
        indigo: { ...tint('56, 189, 248'), 500: '#38BDF8', 600: '#38BDF8', 700: '#7DD3FC', 800: '#A5E1FD', 900: '#CDEEFE' },
        cyan: { ...tint('34, 211, 238'), 500: '#22D3EE', 600: '#22D3EE', 700: '#67E8F9', 800: '#8FEEFA', 900: '#B9F5FC' },
      },
      boxShadow: {
        md: '0 1px 0 rgba(255,255,255,0.03) inset, 0 8px 24px -12px rgba(0,0,0,0.6)',
        lg: '0 1px 0 rgba(255,255,255,0.04) inset, 0 16px 40px -16px rgba(0,0,0,0.7)',
        '2xl': '0 24px 80px -20px rgba(0,0,0,0.8)',
      },
    },
  },
  plugins: [],
};
