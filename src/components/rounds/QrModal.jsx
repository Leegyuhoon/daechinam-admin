import { useMemo, useState } from 'react'
import { Download, Printer, Copy, Check } from 'lucide-react'
import { Modal, btnPrimary, btnGhost } from './ui'
import { qrSvg, qrPngDataUrl } from '../../lib/qr'
import { printElement } from '../PrintButton'

// 업체 전용 링크 QR — 화면 표시, PNG 내려받기, A4 안내문 인쇄
// kind: 'main'(업체 관리자용 — 전체 기능) | 'sub'(층·구역 문의 전용)
export default function QrModal({ siteName, label, kind, url, onClose }) {
  const svg = useMemo(() => qrSvg(url), [url])
  const [copied, setCopied] = useState(false)
  const title = kind === 'sub' ? `${siteName} ${label}` : siteName
  const fileBase = `${siteName}${kind === 'sub' ? `_${label}` : '_업체관리자용'}_QR`.replace(/\s+/g, '')

  const download = () => {
    const a = document.createElement('a')
    a.href = qrPngDataUrl(url, 1200)
    a.download = `${fileBase}.png`
    document.body.appendChild(a)
    a.click()
    a.remove()
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      window.prompt('아래 링크를 복사하세요', url)
    }
  }

  return (
    <Modal title={kind === 'sub' ? `QR · ${title} 문의 전용` : `QR · ${title} 업체 관리자용`} onClose={onClose}>
      <div className="flex flex-col items-center">
        <div className="w-56 rounded-xl border border-base-800 bg-white p-2" dangerouslySetInnerHTML={{ __html: svg }} />
        <p className="mt-3 text-center text-xs text-base-400">
          {kind === 'sub'
            ? '이 QR로 들어오면 "문의 남기기 · 문의 내역"만 보여요. 월간 보고서·청소 범위는 보이지 않고, 문의 내역도 이 층(구역)에서 남긴 것만 보여요.'
            : '업체 담당자용이에요. 문의 · 월간 보고서 · 청소 범위 등 모든 탭을 볼 수 있어요. 게시하지 말고 담당자에게만 전달하세요.'}
        </p>
        <p className="mt-1 break-all text-center text-[11px] text-base-500">{url}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button onClick={download} className={`${btnPrimary} flex items-center gap-1`}>
            <Download size={14} /> PNG 내려받기
          </button>
          <button onClick={() => printElement(`qr-poster`, fileBase)} className={`${btnGhost} flex items-center gap-1`}>
            <Printer size={14} /> 안내문 인쇄(A4)
          </button>
          <button onClick={copy} className={`${btnGhost} flex items-center gap-1`}>
            {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? '복사됨' : '링크 복사'}
          </button>
        </div>
      </div>

      {/* 인쇄용 A4 안내문 — 화면에는 숨김 */}
      <div className="print-only">
        <div id="qr-poster" className="print-no-title" style={{ color: '#12161b', textAlign: 'center', paddingTop: '22mm', fontFamily: 'inherit' }}>
          <div style={{ width: 60, height: 5, background: '#b8740a', borderRadius: 3, margin: '0 auto 14px' }} />
          <p style={{ fontSize: 15, letterSpacing: '0.2em', color: '#5b6470', margin: 0 }}>(주)이엘씨_대치남 고객센터</p>
          <p style={{ fontSize: 40, fontWeight: 800, margin: '14px 0 6px' }}>{title}</p>
          <p style={{ fontSize: 22, fontWeight: 600, margin: '0 0 30px' }}>
            {kind === 'sub' ? '청소 관련 요청 · 불편 사항을 남겨 주세요' : '업체 담당자 전용 페이지'}
          </p>
          <div style={{ width: '125mm', margin: '0 auto', border: '1px solid #d6dbe1', borderRadius: 14, padding: 10 }} dangerouslySetInnerHTML={{ __html: svg }} />
          <div style={{ fontSize: 17, lineHeight: 1.9, margin: '30px auto 0', maxWidth: '150mm', textAlign: 'left', color: '#333' }}>
            <p style={{ margin: 0 }}>① 휴대폰 카메라로 QR 코드를 비춰 주세요.</p>
            <p style={{ margin: 0 }}>② 문의 종류를 고르고 내용을 적어 주세요. 사진도 함께 보낼 수 있어요.</p>
            <p style={{ margin: 0 }}>③ 답변은 같은 화면의 "문의 내역"에서 확인할 수 있어요.</p>
          </div>
        </div>
      </div>
    </Modal>
  )
}
