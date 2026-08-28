/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // 라이트 테마 — 숫자가 클수록(900,950) 더 밝고, 작을수록(100,200) 더 어둡습니다.
        // (컴포넌트 코드의 bg-base-950/900 = 카드/페이지 배경, text-base-100 = 본문 글자 라는 "역할"은 그대로 유지)
        base: {
          950: '#FFFFFF', // 카드·사이드바 배경 (가장 밝음)
          900: '#F4F6F7', // 페이지 배경 / 중첩 배경
          800: '#E7EBED', // 테두리 / 호버 배경
          700: '#D8DEE1', // 인풋 테두리
          600: '#AEB6BC',
          500: '#7C8790', // 보조 텍스트(연함)
          400: '#576068', // 보조 텍스트(진함)
          300: '#3A4148',
          200: '#232930',
          100: '#12161B' // 본문 텍스트 (가장 어두움)
        },
        mist: {
          400: '#2F5583', // 강조 텍스트/아이콘 — 어플 메인 컬러(#1D232A)와 어울리는 네이비, 밝은 배경에서도 잘 읽히도록 조정
          500: '#1E3A5F', // 버튼 등 주요 강조 배경 — 네이비
          600: '#132A47' // 강조 hover/진한 톤
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
