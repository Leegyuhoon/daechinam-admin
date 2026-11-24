import { Printer } from 'lucide-react'

// 화면의 특정 영역만 PDF로 저장 (브라우저 인쇄 → "PDF로 저장")
// targetId 요소에만 인쇄 스타일을 적용하고, PDF 파일 이름은 title로 지정됨

// 카카오톡·네이버·인스타그램 등 앱 안의 브라우저는 인쇄(PDF 저장) 기능 자체가 없음
function inAppBrowserName() {
  const ua = navigator.userAgent || ''
  if (/KAKAOTALK/i.test(ua)) return '카카오톡'
  if (/NAVER/i.test(ua) && /inapp/i.test(ua)) return '네이버 앱'
  if (/Instagram/i.test(ua)) return '인스타그램'
  if (/FBAN|FBAV/i.test(ua)) return '페이스북'
  if (/\bLine\//i.test(ua)) return '라인'
  if (/BAND\//i.test(ua)) return '밴드'
  return null
}

let activeCleanup = null

export function printElement(targetId, title) {
  const el = document.getElementById(targetId)
  if (!el) return
  const app = inAppBrowserName()
  if (app) {
    window.alert(
      `${app} 안에서 열린 화면에서는 PDF 저장(인쇄)이 지원되지 않습니다.\n\n` +
        '화면 오른쪽 위(또는 아래)의 메뉴에서 "다른 브라우저로 열기"(크롬·사파리·삼성 인터넷)를 누른 뒤 다시 시도해 주세요.'
    )
    return
  }
  // 이전 인쇄 준비가 남아 있으면 먼저 정리
  if (activeCleanup) activeCleanup()

  const prevTitle = document.title
  el.classList.add('print-target')
  // PDF 맨 위 제목 줄 — 대상 영역 바로 앞에 붙임(대상이 표·격자 배치여도 제목이 칸 안으로 끼어들지 않게)
  let titleEl = null
  if (title && !el.classList.contains('print-no-title') && el.parentElement) {
    titleEl = document.createElement('div')
    titleEl.className = 'print-title-el'
    titleEl.textContent = title.replace(/_/g, ' · ')
    el.parentElement.insertBefore(titleEl, el)
  }
  // 대상의 상위 요소들은 남겨 두고(레이아웃 유지) 나머지는 인쇄에서 뺌
  const ancestors = []
  for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
    p.classList.add('print-ancestor')
    ancestors.push(p)
  }
  document.body.classList.add('printing-target')
  if (title) document.title = title

  let done = false
  const cleanup = () => {
    if (done) return
    done = true
    activeCleanup = null
    el.classList.remove('print-target')
    ancestors.forEach((p) => p.classList.remove('print-ancestor'))
    if (titleEl) titleEl.remove()
    document.body.classList.remove('printing-target')
    document.title = prevTitle
    window.removeEventListener('afterprint', onAfter)
    window.removeEventListener('pointerdown', onReturn, true)
    window.removeEventListener('focus', onReturn)
    document.removeEventListener('visibilitychange', onReturn)
  }
  activeCleanup = cleanup

  // 휴대폰(안드로이드·아이폰)은 인쇄 창이 비동기로 떠서 print()가 바로 끝나고 afterprint도 일찍 옴.
  // 예전처럼 1초 뒤에 정리해 버리면 미리보기가 빈 화면이 되거나 뜨지 않음 →
  // 인쇄 창을 닫고 화면으로 돌아와 다시 손을 댈 때까지 인쇄 준비를 유지(화면에는 영향 없음)
  let printedAt = 0
  const ready = () => printedAt && Date.now() - printedAt > 1500
  function onAfter() {
    if (ready()) cleanup()
  }
  function onReturn() {
    if (document.visibilityState === 'hidden') return
    if (ready()) cleanup()
  }
  window.addEventListener('afterprint', onAfter)
  window.addEventListener('pointerdown', onReturn, true)
  window.addEventListener('focus', onReturn)
  document.addEventListener('visibilitychange', onReturn)

  // 레이아웃이 인쇄용으로 바뀔 시간을 조금 준 뒤 인쇄 창 열기
  requestAnimationFrame(() => {
    setTimeout(() => {
      printedAt = Date.now()
      try {
        window.print()
      } catch (e) {
        cleanup()
        window.alert('이 브라우저에서는 PDF 저장(인쇄)을 열 수 없습니다. 크롬·사파리·삼성 인터넷에서 다시 시도해 주세요.')
      }
    }, 80)
  })
}

export default function PrintButton({ targetId, title, label = 'PDF 저장', className = '', small = false }) {
  return (
    <button
      type="button"
      onClick={() => printElement(targetId, title)}
      className={
        className ||
        `no-print focus-ring inline-flex items-center gap-1.5 rounded-lg border border-page-border bg-page-soft text-page-sub hover:text-page-text ${
          small ? 'px-2 py-1 text-[12px]' : 'px-3 py-1.5 text-xs'
        }`
      }
    >
      <Printer size={small ? 12 : 14} /> {label}
    </button>
  )
}
