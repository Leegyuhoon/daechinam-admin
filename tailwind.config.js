/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        base: {
          950: '#14181D',
          900: '#1D232A', // 기존 앱 theme-color
          800: '#262E37',
          700: '#333D48',
          600: '#4A5560',
          500: '#6B7684',
          400: '#8F98A3',
          300: '#B7BFC7',
          200: '#DDE2E6',
          100: '#F2F4F5'
        },
        mist: {
          400: '#5FD9C9',
          500: '#38BFAE', // 시그니처 accent — 세정/청결 이미지의 민트-틸
          600: '#2A9E8F'
        },
        amber: {
          400: '#F2B84B',
          500: '#E5A130'
        }
      },
      fontFamily: {
        display: ['"Pretendard Variable"', 'Pretendard', 'sans-serif'],
        body: ['"Pretendard Variable"', 'Pretendard', 'sans-serif']
      }
    }
  },
  plugins: []
}
