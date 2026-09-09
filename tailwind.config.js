/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // 라이트 테마 — 숫자가 클수록(900,950) 더 밝고, 작을수록(100,200) 더 어둡습니다.
        base: {
          950: '#FFFFFF',
          900: '#F4F6F7',
          800: '#E7EBED',
          700: '#D8DEE1',
          600: '#AEB6BC',
          500: '#7C8790',
          400: '#576068',
          300: '#3A4148',
          200: '#232930',
          100: '#12161B'
        },
        // 어플(daechinam-app)과 같은 브랜드 계열 — 어플의 실제 포인트 색(골드·앰버)을 그대로 가져옴
        mist: {
          400: '#B9720A',
          500: '#B9720A',
          600: '#8F5708'
        },
        teal: {
          400: '#0E7C86',
          500: '#0B6A73'
        },
        violet: {
          400: '#6D4FC2',
          500: '#5B3FAE'
        },
        amber: {
          400: '#C97F0A',
          500: '#B06F08'
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
