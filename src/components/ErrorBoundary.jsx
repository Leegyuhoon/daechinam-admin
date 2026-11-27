import { Component } from 'react'

// 화면 하나에서 오류가 나도 전체가 흰 화면으로 멈추지 않게 — 안내와 새로고침 버튼을 보여줌
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) {
    return { error }
  }
  componentDidCatch(error, info) {
    console.error('[화면 오류]', error, info?.componentStack)
  }
  componentDidUpdate(prev) {
    // 다른 메뉴로 이동하면 오류 상태를 풀고 새 화면을 다시 그려 봄
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null })
  }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="mx-auto mt-16 max-w-md rounded-xl border border-page-border bg-white p-6 text-center shadow-sm">
        <p className="text-base font-semibold text-page-text">화면을 불러오는 중 문제가 생겼어요</p>
        <p className="mt-2 text-sm text-page-sub">새로고침하면 대부분 해결됩니다. 계속 반복되면 아래 내용을 캡처해 알려 주세요.</p>
        <p className="mt-3 break-all rounded bg-page-bg px-3 py-2 text-left text-xs text-page-sub">{String(this.state.error?.message || this.state.error)}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 rounded-lg bg-[#B9720A] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          새로고침
        </button>
      </div>
    )
  }
}
