import { fmtDate, TICKET_STATUS, ISSUE_STATUS } from '../../lib/rounds'
import { Thumb } from './Media'

// 월간 이슈·점검 보고서 본문 — 관리자 미리보기와 업체 페이지에서 같이 씀
// data = collectMonth(...) 결과, report = { rating, summary, nextPlan }
const RATING_CLS = {
  우수: 'text-teal-500',
  양호: 'text-mist-500',
  보통: 'text-base-300',
  미흡: 'text-red-500'
}

function Section({ title, children }) {
  return (
    <div className="mb-4" style={{ breakInside: 'avoid' }}>
      <p className="mb-1.5 border-l-2 border-mist-500 pl-2 text-xs font-semibold text-base-200">{title}</p>
      {children}
    </div>
  )
}

const Empty = ({ text }) => <p className="text-[11px] text-base-500">{text}</p>

export default function MonthlyReportDoc({ siteName, month, report, data, serviceReportLink }) {
  const [y, m] = month.split('-')
  const { inspections, tickets, executions, nextVisits } = data
  const issues = data.issues || []
  const issueRows = issues.flatMap((x) => (x.items || []).map((it, i) => ({ ...it, key: `${x.id}-${i}`, date: x.date })))
  const doneTickets = tickets.filter((t) => t.status === 'done').length
  const lastAdmin = (t) => {
    const m = [...(t.messages || [])].reverse().find((x) => x.from === 'admin' && (x.text || (x.media || []).length))
    return m ? m.text || '조치 사진·영상 전달' : ''
  }

  return (
    <div className="text-base-100">
      <div className="mb-4 flex items-end justify-between border-b border-base-800 pb-3">
        <div>
          <p className="text-[11px] text-base-500">
            {y}년 {Number(m)}월 청소 관리 보고서
          </p>
          <p className="text-lg font-bold">{siteName}</p>
        </div>
        <p className="text-[11px] text-base-500">(주)이엘씨_대치남</p>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {[
          ['종합 평가', report.rating || '-', RATING_CLS[report.rating] || ''],
          ['점검 방문', `${inspections.length}회`, ''],
          ['문의·요청', `${tickets.length}건 (완료 ${doneTickets})`, ''],
          ['현장 이슈', `${issueRows.length}건 (조치 ${issueRows.filter((r) => r.status === 'done').length})`, ''],
          ['추가 작업', `${executions.length}건`, '']
        ].map(([label, value, cls]) => (
          <div key={label} className="rounded-lg bg-base-900 px-2 py-2 text-center">
            <p className={`text-sm font-semibold ${cls}`}>{value}</p>
            <p className="text-[10px] text-base-500">{label}</p>
          </div>
        ))}
      </div>

      {report.summary && (
        <Section title="이번 달 총평">
          <p className="whitespace-pre-line rounded-lg bg-base-900 px-3 py-2 text-xs leading-relaxed text-base-200">{report.summary}</p>
        </Section>
      )}

      <Section title="점검 내역">
        {inspections.length === 0 ? (
          <Empty text="이번 달 점검 기록이 없습니다." />
        ) : (
          <table className="w-full border-collapse text-[11px]">
            <tbody>
              {inspections.map((v) => (
                <tr key={v.id}>
                  <td className="w-20 border border-base-700 bg-base-900 px-2 py-1 align-top text-base-300">{fmtDate(v.date)}</td>
                  <td className="whitespace-pre-line border border-base-700 px-2 py-1">{v.memo || '정기 점검 완료'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="현장 이슈 · 조치 내역">
        {issueRows.length === 0 ? (
          <Empty text="이번 달 보고된 현장 이슈가 없습니다." />
        ) : (
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-base-900 text-left text-base-300">
                <th className="w-16 border border-base-700 px-2 py-1 font-medium">날짜</th>
                <th className="border border-base-700 px-2 py-1 font-medium">이슈</th>
                <th className="border border-base-700 px-2 py-1 font-medium">조치 내용</th>
                <th className="w-16 border border-base-700 px-2 py-1 font-medium">상태</th>
              </tr>
            </thead>
            <tbody>
              {issueRows.map((r) => (
                <tr key={r.key}>
                  <td className="border border-base-700 px-2 py-1 align-top text-base-400">{fmtDate(r.date)}</td>
                  <td className="whitespace-pre-line border border-base-700 px-2 py-1 align-top">{r.issue}</td>
                  <td className="whitespace-pre-line border border-base-700 px-2 py-1 align-top text-base-300">{r.action || '-'}</td>
                  <td className={`border border-base-700 px-2 py-1 align-top ${r.status === 'done' ? 'text-teal-500' : 'text-amber-500'}`}>{ISSUE_STATUS[r.status] || '조치 완료'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="문의·요청 처리 내역">
        {tickets.length === 0 ? (
          <Empty text="이번 달 접수된 문의·요청이 없습니다." />
        ) : (
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-base-900 text-left text-base-300">
                <th className="w-16 border border-base-700 px-2 py-1 font-medium">접수일</th>
                <th className="border border-base-700 px-2 py-1 font-medium">내용</th>
                <th className="border border-base-700 px-2 py-1 font-medium">조치 내용</th>
                <th className="w-14 border border-base-700 px-2 py-1 font-medium">상태</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id}>
                  <td className="border border-base-700 px-2 py-1 align-top text-base-400">{fmtDate((t.createdAt || '').slice(0, 10))}</td>
                  <td className="border border-base-700 px-2 py-1 align-top">
                    <span className="text-base-500">[{t.category}]</span> {t.content || '(사진·영상 첨부)'}
                  </td>
                  <td className="border border-base-700 px-2 py-1 align-top text-base-300">
                    {lastAdmin(t) || '-'}
                    {(t.executionIds || []).map((id) => (
                      <a key={id} href={serviceReportLink(id)} target="_blank" rel="noreferrer" className="mt-0.5 block text-mist-600 underline">
                        전후 보고서 보기
                      </a>
                    ))}
                  </td>
                  <td className={`border border-base-700 px-2 py-1 align-top ${t.status === 'done' ? 'text-teal-500' : 'text-amber-500'}`}>
                    {TICKET_STATUS[t.status] || '접수'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="추가 작업 (전후 보고서)">
        {executions.length === 0 ? (
          <Empty text="이번 달 추가 작업이 없습니다." />
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {executions.map((e) => (
              <a key={e.id} href={serviceReportLink(e.id)} target="_blank" rel="noreferrer" className="block rounded-lg border border-base-800 p-2 hover:border-mist-500">
                <p className="mb-1 text-[11px] font-medium">
                  {e.ticketId && <span className="mr-1 text-amber-500">[요청 처리]</span>}
                  {fmtDate(e.date)} · {e.serviceName}
                </p>
                <div className="grid grid-cols-2 gap-1">
                  {[e.before?.[0], e.after?.[0]].map((p, i) => (
                    <div key={i} className="relative aspect-[4/3] overflow-hidden rounded bg-base-900">
                      {p && <Thumb m={p} className="h-full w-full" />}
                      <span className="absolute left-1 top-1 rounded bg-black/60 px-1 text-[9px] text-white">{i === 0 ? '전' : '후'}</span>
                    </div>
                  ))}
                </div>
              </a>
            ))}
          </div>
        )}
      </Section>

      <Section title="다음 달 계획">
        {nextVisits.length === 0 && !report.nextPlan ? (
          <Empty text="정기 청소 및 점검을 계속 진행합니다." />
        ) : (
          <div className="space-y-1.5">
            {nextVisits.length > 0 && (
              <ul className="space-y-0.5 text-[11px]">
                {nextVisits.map((v) => (
                  <li key={v.id}>
                    · {fmtDate(v.date)} {v.type === 'service' ? `${v.serviceName} 작업 예정` : '정기 점검 방문 예정'}
                  </li>
                ))}
              </ul>
            )}
            {report.nextPlan && <p className="whitespace-pre-line text-[11px] text-base-200">{report.nextPlan}</p>}
          </div>
        )}
      </Section>

      <p className="mt-5 border-t border-base-800 pt-3 text-center text-[10px] text-base-500">
        불편 사항이나 요청은 업체 전용 페이지의 "문의 남기기"로 남겨 주시면 빠르게 조치하겠습니다. — (주)이엘씨_대치남
      </p>
    </div>
  )
}
