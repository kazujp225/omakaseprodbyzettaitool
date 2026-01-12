import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ネイビーベースのプライマリカラー (#1A202C)
        primary: {
          50: '#f7f8f9',
          100: '#ebedf0',
          200: '#d1d5db',
          300: '#9ca3af',
          400: '#6b7280',
          500: '#4a5568',
          600: '#2d3748',
          700: '#1f2937',
          800: '#1A202C',
          900: '#111827',
        },
        // ネイビー（メインカラー）
        navy: {
          50: '#f7f8f9',
          100: '#ebedf0',
          200: '#d1d5db',
          300: '#9ca3af',
          400: '#6b7280',
          500: '#4a5568',
          600: '#2d3748',
          700: '#1f2937',
          800: '#1A202C',
          900: '#111827',
        },
        // アクセントカラー（ネイビー/ブルー）
        accent: {
          50: '#f0f4f8',
          100: '#d9e2ec',
          200: '#bcccdc',
          300: '#9fb3c8',
          400: '#829ab1',
          500: '#627d98',
          600: '#486581',
          700: '#334e68',
          800: '#243b53',
          900: '#102a43',
        },
      },
      fontSize: {
        'xs': ['0.8125rem', { lineHeight: '1.25rem' }],
        'sm': ['0.9375rem', { lineHeight: '1.5rem' }],
        'base': ['1.0625rem', { lineHeight: '1.75rem' }],
        'lg': ['1.1875rem', { lineHeight: '1.875rem' }],
        'xl': ['1.375rem', { lineHeight: '2rem' }],
        '2xl': ['1.625rem', { lineHeight: '2.25rem' }],
        '3xl': ['2rem', { lineHeight: '2.5rem' }],
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      borderRadius: {
        'DEFAULT': '0.5rem',
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        'card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -1px rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [],
}
export default config
