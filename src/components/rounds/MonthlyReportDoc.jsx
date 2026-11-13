import { ISSUE_STATUS, SCORE_LABEL, stars } from '../../lib/rounds'

// 월간 정기청소 보고서 — 회사 HWP 양식(【업체명】 YYYY년 M월 정기청소 보고서)과 같은 배치
// 흰 종이 · 검은 글씨로 고정 (화면 테마와 무관, PDF·인쇄 그대로)
// data = collectMonth(...) 결과, report = 작성 내용, scope = 현장 청소 범위
const LINE = '1px solid #333'
const DOT = '1px dotted #9a9a9a'
const HEAD_BG = '#f2f2f2'
const BOX_BG = '#f7f7f7'
const th = { borderBottom: DOT, padding: '6px 10px', textAlign: 'center', fontWeight: 400, background: HEAD_BG, fontSize: 12.5 }
const td = { padding: '7px 10px', fontSize: 12.5, verticalAlign: 'top' }

const md = (d) => (d ? `${Number(d.slice(5, 7))}월 ${Number(d.slice(8, 10))}일` : '')
const ymd = (d) => (d ? `${d.slice(0, 4)}년 ${Number(d.slice(5, 7))}월 ${Number(d.slice(8, 10))}일` : '')

// 청소 범위 → "작업내용" 줄 (매일이 아닌 항목은 주기를 괄호로)
export function scopeToWorkLines(scope = []) {
  return scope
    .filter((z) => z.zone || (z.items || []).length)
    .map((z) => {
      const items = (z.items || []).filter((it) => it.task)
      if (!items.length) return `${z.zone} 위생관리`
      return `${z.zone} ${items.map((it) => (it.freq && it.freq !== '매일' ? `${it.task} (${it.freq})` : it.task)).join(', ')}`
    })
}

const lastAdmin = (t) => {
  const m = [...(t.messages || [])].reverse().find((x) => x.from === 'admin' && (x.text || (x.media || []).length))
  return m ? m.text || '조치 사진 전달' : ''
}

function Section({ title, children }) {
  return (
    <div style={{ marginTop: 16, breakInside: 'avoid', pageBreakInside: 'avoid' }}>
      <p style={{ margin: '0 0 6px', fontSize: 13.5, fontWeight: 700 }}>■ {title}</p>
      {children}
    </div>
  )
}

function Lines({ lines, empty }) {
  const list = lines.filter(Boolean)
  if (!list.length) return <p style={{ margin: 0 }}>- {empty}</p>
  return list.map((l, i) => (
    <p key={i} style={{ margin: 0, whiteSpace: 'pre-line' }}>
      - {l}
    </p>
  ))
}

export default function MonthlyReportDoc({ siteName, month, report, data, serviceReportLink, scope = [], inspectCycleMonths = 1 }) {
  const [y, m] = month.split('-')
  const { inspections, tickets, executions, nextVisits } = data
  const issues = data.issues || []

  // 1. 작업내용 — 직접 적은 내용이 있으면 그것, 없으면 청소 범위에서 자동
  const workLines = report.workContent?.trim() ? report.workContent.split('\n').map((l) => l.replace(/^\s*-\s*/, '')) : scopeToWorkLines(scope)

  // 2. 특이사항 — 점검 · 현장 이슈 · 추가 작업 자동 + 직접 적은 메모
  const special = [
    ...inspections.map((v) => `${md(v.date)} 본사 정기 점검${v.memo ? ` — ${v.memo.replace(/\n+/g, ' ')}` : ' — 이상 없음'}`),
    ...issues.flatMap((x) =>
      (x.items || []).map((it) => `${md(x.date)} ${it.issue}${it.action ? ` → ${it.action}` : ''}${it.status && it.status !== 'done' ? ` (${ISSUE_STATUS[it.status]})` : ''}`)
    ),
    ...executions.map((e) => `${md(e.date)} ${e.serviceName} 작업 완료${(e.before || []).length + (e.after || []).length ? ' [별첨] 참조' : ''}`),
    ...(report.specialNotes?.trim() ? report.specialNotes.split('\n').map((l) => l.replace(/^\s*-\s*/, '')) : [])
  ]
  if (!inspections.length && (Number(inspectCycleMonths) || 1) > 1 && !special.length) special.push('이번 달은 정기 점검 대상 월이 아님')

  // 요청사항 ↔ 결과
  const requests = tickets.map((t, i) => {
    const res = lastAdmin(t)
    const linked = (t.executionIds || []).length > 0
    const result =
      t.status === 'done'
        ? `${res || '조치 완료'}${linked ? ' [별첨] 참조' : ''}`
        : t.status === 'progress'
          ? `처리 중${res ? ` — ${res}` : ''}`
          : res || '확인 중'
    return { n: i + 1, req: t.content || '(사진·영상 첨부 요청)', result, ids: t.executionIds || [] }
  })

  const proposals = (report.proposals || []).filter((p) => p.text || p.price)

  // [별첨] 사진 — 추가 작업(전/후) · 현장 이슈 사진
  const photos = [
    ...executions.flatMap((e) => [
      ...(e.before || []).map((p) => ({ ...p, cap: `${md(e.date)} ${e.serviceName} — 작업 전`, link: e.id })),
      ...(e.after || []).map((p) => ({ ...p, cap: `${md(e.date)} ${e.serviceName} — 작업 후`, link: e.id }))
    ]),
    ...issues.flatMap((x) => (x.media || []).map((p) => ({ ...p, cap: `${md(x.date)} 현장 이슈` })))
  ]
  const isVid = (p) => p.kind === 'video' || /regular-media/.test(p.url || '')
  const pics = photos.filter((p) => !isVid(p)).slice(0, 12)
  const vids = photos.filter(isVid)

  const writtenDate = report.writtenDate || (report.publishedAt || '').slice(0, 10) || new Date().toLocaleDateString('sv-SE')

  return (
    <div className="mr-doc" style={{ background: '#fff', color: '#111', fontFamily: "'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif", lineHeight: 1.6, fontSize: 12.5 }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '8px 6px', position: 'relative' }}>
        {/* 회사 로고 — 제목 오른쪽 위 (아래쪽에 두면 내용이 길 때 로고만 다음 쪽으로 넘어가서) */}
        <img className="mr-logo" src="/brand/elc-cleaning-logo.png" alt="ELC cleaning services" style={{ position: 'absolute', right: 6, top: 6, width: 96, height: 'auto' }} />
        <p className="mr-title" style={{ textAlign: 'center', margin: '4px 0 0', fontSize: 21, fontWeight: 700 }}>【 {siteName} 】</p>
        <p className="mr-title" style={{ textAlign: 'center', margin: '2px 0 14px', fontSize: 21, fontWeight: 700 }}>
          {y}년 {Number(m)}월 정기청소 보고서
        </p>

        <table style={{ width: '100%', borderCollapse: 'collapse', borderTop: LINE, borderBottom: LINE }}>
          <tbody>
            <tr style={{ borderBottom: DOT }}>
              <td style={{ ...td, background: HEAD_BG, textAlign: 'center', width: '17%', whiteSpace: 'nowrap' }}>관리업체</td>
              <td style={{ ...td, textAlign: 'center', width: '33%' }}>(주)이엘씨_대치남</td>
              <td style={{ ...td, background: HEAD_BG, textAlign: 'center', width: '17%', whiteSpace: 'nowrap' }}>담당자</td>
              <td style={{ ...td, textAlign: 'center' }}>{report.manager || ''}</td>
            </tr>
            <tr>
              <td style={{ ...td, background: HEAD_BG, textAlign: 'center', whiteSpace: 'nowrap' }}>작업자</td>
              <td style={{ ...td, textAlign: 'center' }}>{report.workerNames || ''}</td>
              <td style={{ ...td, background: HEAD_BG, textAlign: 'center', whiteSpace: 'nowrap' }}>작성일</td>
              <td style={{ ...td, textAlign: 'center', whiteSpace: 'nowrap' }}>{ymd(writtenDate)}</td>
            </tr>
          </tbody>
        </table>

        <Section title="요청사항">
          <table style={{ width: '100%', borderCollapse: 'collapse', borderTop: LINE, borderBottom: '1px solid #4a7a3a' }}>
            <thead>
              <tr>
                <th style={{ ...th, width: '50%', borderRight: DOT }}>요청사항</th>
                <th style={th}>결과</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td style={{ ...td, borderRight: DOT }}>1. 접수된 요청사항 없음</td>
                  <td style={td}>1-1. 해당 없음</td>
                </tr>
              ) : (
                requests.map((r) => (
                  <tr key={r.n} style={{ borderTop: r.n > 1 ? DOT : 'none', breakInside: 'avoid' }}>
                    <td style={{ ...td, borderRight: DOT, whiteSpace: 'pre-line' }}>
                      {r.n}. {r.req}
                    </td>
                    <td style={{ ...td, whiteSpace: 'pre-line' }}>
                      {r.n}-1. {r.result}
                      {r.ids.map((id) => (
                        <a key={id} href={serviceReportLink(id)} target="_blank" rel="noreferrer" className="no-print" style={{ marginLeft: 6, color: '#2f6fb3' }}>
                          [전후 사진 보기]
                        </a>
                      ))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Section>

        <Section title="작업현황">
          <div style={{ borderTop: LINE, borderBottom: LINE, background: BOX_BG }}>
            <div style={{ padding: '7px 10px 10px', borderBottom: DOT }}>
              <p style={{ margin: 0 }}>1. 작업내용</p>
              <Lines lines={workLines} empty="계약 범위에 따른 정기 청소" />
            </div>
            <div style={{ padding: '7px 10px 10px', borderBottom: DOT }}>
              <p style={{ margin: 0 }}>2. 특이사항</p>
              <Lines lines={special} empty="특이사항 없음" />
            </div>
            <div style={{ padding: '7px 10px 12px' }}>
              <p style={{ margin: 0 }}>3. 총평</p>
              <p style={{ margin: '0 0 0 12px', whiteSpace: 'pre-line' }}>{report.summary || '특이사항 없이 정기청소를 진행하고 있음.'}</p>
            </div>
          </div>
        </Section>

        <Section title="제안사항">
          <table style={{ width: '100%', borderCollapse: 'collapse', borderTop: LINE, borderBottom: LINE }}>
            <thead>
              <tr>
                <th style={{ ...th, width: '50%', borderRight: DOT }}>제안사항</th>
                <th style={th}>금액안내 (정기청소 업체 할인적용)</th>
              </tr>
            </thead>
            <tbody>
              {proposals.length === 0 ? (
                <tr>
                  <td style={{ ...td, borderRight: DOT, padding: '14px 10px' }}>1. 별도의 제안사항 없음</td>
                  <td style={{ ...td, padding: '14px 10px' }}>1-1. 별도의 제안사항 없음</td>
                </tr>
              ) : (
                proposals.map((p, i) => (
                  <tr key={i} style={{ borderTop: i ? DOT : 'none' }}>
                    <td style={{ ...td, borderRight: DOT, whiteSpace: 'pre-line' }}>
                      {i + 1}. {p.text}
                    </td>
                    <td style={{ ...td, whiteSpace: 'pre-line' }}>
                      {i + 1}-1. {p.price || '별도 협의'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Section>

        {(nextVisits.length > 0 || report.nextPlan) && (
          <Section title="다음 달 일정">
            <div style={{ borderTop: LINE, borderBottom: LINE, padding: '8px 10px' }}>
              {nextVisits.map((v) => (
                <p key={v.id} style={{ margin: 0 }}>
                  - {md(v.date)} {v.type === 'service' ? `${v.serviceName} 작업 예정` : '본사 정기 점검 예정'}
                </p>
              ))}
              {report.nextPlan && <p style={{ margin: 0, whiteSpace: 'pre-line' }}>- {report.nextPlan}</p>}
            </div>
          </Section>
        )}

        {report.clientRating && (
          <Section title="고객 만족도">
            <div style={{ borderTop: LINE, borderBottom: LINE, padding: '8px 10px' }}>
              <p style={{ margin: 0 }}>
                <span style={{ color: '#c58a12' }}>{stars(report.clientRating.score)}</span> {SCORE_LABEL[report.clientRating.score]}
              </p>
              {report.clientRating.comment && <p style={{ margin: '2px 0 0', whiteSpace: 'pre-line' }}>"{report.clientRating.comment}"</p>}
            </div>
          </Section>
        )}

      </div>

      {(pics.length > 0 || vids.length > 0) && (
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '8px 6px', breakBefore: 'page', pageBreakBefore: 'always' }}>
          <p style={{ margin: '18px 0 10px', fontSize: 13.5, fontWeight: 700 }}>[별첨]</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {pics.map((p, i) => (
              <div key={p.url + i} style={{ breakInside: 'avoid' }}>
                <div style={{ height: 300, background: '#eee', border: '1px solid #ddd', overflow: 'hidden' }}>
                  <img src={p.url} alt={p.cap} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <p style={{ margin: '3px 0 0', fontSize: 11.5, color: '#555' }}>{p.cap}</p>
              </div>
            ))}
          </div>
          {vids.length > 0 && <p style={{ marginTop: 10, fontSize: 12, color: '#555' }}>※ 작업 영상 {vids.length}개는 전후 보고서 링크에서 확인하실 수 있습니다.</p>}
          <div style={{ textAlign: 'right', marginTop: 12, breakInside: 'avoid' }}>
            <img src="/brand/elc-cleaning-logo.png" alt="" style={{ width: 120, height: 'auto' }} />
          </div>
        </div>
      )}
    </div>
  )
}
