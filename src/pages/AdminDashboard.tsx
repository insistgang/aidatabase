import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  CheckCircle,
  Clock,
  Download,
  RefreshCw,
  Shield,
  Target,
  Users,
} from 'lucide-react';
import { learningApiUrl } from '@/lib/learningAnalytics';

interface Summary {
  visits: number;
  sessions: number;
  students: number;
  answers: number;
  correct_answers: number;
  level_results: number;
  passed_levels: number;
}

interface StudentStat {
  student_name: string;
  sessions: number;
  answers: number;
  correct_answers: number;
  best_score: number;
  last_seen: string;
}

interface LevelStat {
  level_id: number;
  level_name: string;
  answers: number;
  correct_answers: number;
  average_time: number;
  results: number;
  passed_results: number;
}

interface RecentEvent {
  id: number;
  created_at: string;
  event_type: string;
  session_id: string;
  student_name: string;
  level_name: string;
  question_id: number | null;
  selected_answer: number | null;
  correct: boolean | null;
  time_taken: number | null;
  score: number | null;
  lives: number | null;
  passed: boolean | null;
  ip: string;
}

interface StatsResponse {
  summary: Summary;
  students: StudentStat[];
  levels: LevelStat[];
  recent_events: RecentEvent[];
}

const TOKEN_KEY = 'aidatabase_admin_token';

function formatPercent(numerator: number, denominator: number) {
  if (!denominator) return '0%';
  return `${Math.round((numerator / denominator) * 100)}%`;
}

function formatDate(value: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', { hour12: false });
}

function eventLabel(type: string) {
  const labels: Record<string, string> = {
    visit: '访问页面',
    game_started: '开始学习',
    level_started: '进入关卡',
    answer: '提交答案',
    level_result: '关卡结算',
    victory: '完成通关',
  };
  return labels[type] ?? type;
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint: string;
  icon: typeof Activity;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm text-slate-500">{label}</span>
        <Icon size={18} className="text-blue-600" />
      </div>
      <div className="text-2xl font-semibold text-slate-950">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{hint}</div>
    </div>
  );
}

export function AdminDashboard() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) ?? '');
  const [draftToken, setDraftToken] = useState(token);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const loadStats = useCallback(async () => {
    if (!token) return;
    const statsUrl = learningApiUrl('/stats');
    if (!statsUrl) {
      setError('当前静态部署未配置学习数据后台 API');
      setStats(null);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetch(statsUrl, {
        headers: {
          'X-Admin-Token': token,
        },
      });
      if (!response.ok) {
        throw new Error(response.status === 401 ? '管理口令不正确' : `请求失败：${response.status}`);
      }
      const data = (await response.json()) as StatsResponse;
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '无法读取后台数据');
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const correctRate = useMemo(() => {
    if (!stats) return '0%';
    return formatPercent(stats.summary.correct_answers, stats.summary.answers);
  }, [stats]);

  const handleLogin = () => {
    const nextToken = draftToken.trim();
    localStorage.setItem(TOKEN_KEY, nextToken);
    setToken(nextToken);
  };

  const handleExport = async () => {
    if (!token || exporting) return;
    const exportUrl = learningApiUrl('/export.csv');
    if (!exportUrl) {
      setError('当前静态部署未配置学习数据后台 API');
      return;
    }

    setExporting(true);
    setError('');
    try {
      const response = await fetch(exportUrl, {
        headers: {
          'X-Admin-Token': token,
        },
      });
      if (!response.ok) {
        throw new Error(response.status === 401 ? '管理口令不正确' : `导出失败：${response.status}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'learning-events.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : '无法导出后台数据');
    } finally {
      setExporting(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-100 px-4 py-10 text-slate-950">
        <div className="mx-auto max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Shield size={20} className="text-blue-600" />
            <h1 className="text-lg font-semibold">学习数据后台</h1>
          </div>
          <label className="mb-2 block text-sm text-slate-600">管理口令</label>
          <input
            value={draftToken}
            onChange={(event) => setDraftToken(event.target.value)}
            type="password"
            className="mb-4 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            placeholder="请输入管理口令"
          />
          <button
            onClick={handleLogin}
            className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            进入后台
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950">
      <div className="mx-auto max-w-7xl">
        <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">学习数据后台</h1>
            <p className="mt-1 text-sm text-slate-500">访问、答题、关卡完成情况统计</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => void handleExport()}
              disabled={exporting}
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Download size={16} />
              {exporting ? '导出中' : '导出 CSV'}
            </button>
            <button
              onClick={() => void loadStats()}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              刷新
            </button>
          </div>
        </header>

        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {stats && (
          <>
            <section className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="访问次数" value={stats.summary.visits} hint={`${stats.summary.sessions} 个会话`} icon={Activity} />
              <StatCard label="学生数" value={stats.summary.students} hint="按填写姓名去重" icon={Users} />
              <StatCard label="答题数" value={stats.summary.answers} hint={`正确率 ${correctRate}`} icon={Target} />
              <StatCard label="通过关卡" value={stats.summary.passed_levels} hint={`${stats.summary.level_results} 次结算`} icon={CheckCircle} />
            </section>

            <section className="mb-5 rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-4 py-3">
                <h2 className="flex items-center gap-2 text-base font-semibold">
                  <Users size={18} className="text-blue-600" />
                  学生学习概览
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">学生</th>
                      <th className="px-4 py-3 font-medium">会话</th>
                      <th className="px-4 py-3 font-medium">答题数</th>
                      <th className="px-4 py-3 font-medium">正确率</th>
                      <th className="px-4 py-3 font-medium">最高分</th>
                      <th className="px-4 py-3 font-medium">最后访问</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.students.map((student) => (
                      <tr key={`${student.student_name}-${student.last_seen}`} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-medium">{student.student_name}</td>
                        <td className="px-4 py-3">{student.sessions}</td>
                        <td className="px-4 py-3">{student.answers}</td>
                        <td className="px-4 py-3">{formatPercent(student.correct_answers, student.answers)}</td>
                        <td className="px-4 py-3">{student.best_score}</td>
                        <td className="px-4 py-3">{formatDate(student.last_seen)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mb-5 rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-4 py-3">
                <h2 className="flex items-center gap-2 text-base font-semibold">
                  <BarChart3 size={18} className="text-blue-600" />
                  关卡统计
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">关卡</th>
                      <th className="px-4 py-3 font-medium">答题数</th>
                      <th className="px-4 py-3 font-medium">正确率</th>
                      <th className="px-4 py-3 font-medium">平均用时</th>
                      <th className="px-4 py-3 font-medium">通过次数</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.levels.map((level) => (
                      <tr key={level.level_id} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-medium">{level.level_name}</td>
                        <td className="px-4 py-3">{level.answers}</td>
                        <td className="px-4 py-3">{formatPercent(level.correct_answers, level.answers)}</td>
                        <td className="px-4 py-3">{level.average_time.toFixed(1)} 秒</td>
                        <td className="px-4 py-3">{level.passed_results}/{level.results}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-4 py-3">
                <h2 className="flex items-center gap-2 text-base font-semibold">
                  <Clock size={18} className="text-blue-600" />
                  最近事件
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[960px] text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">时间</th>
                      <th className="px-4 py-3 font-medium">事件</th>
                      <th className="px-4 py-3 font-medium">学生</th>
                      <th className="px-4 py-3 font-medium">关卡</th>
                      <th className="px-4 py-3 font-medium">题号</th>
                      <th className="px-4 py-3 font-medium">结果</th>
                      <th className="px-4 py-3 font-medium">分数</th>
                      <th className="px-4 py-3 font-medium">IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recent_events.map((event) => (
                      <tr key={event.id} className="border-t border-slate-100">
                        <td className="px-4 py-3">{formatDate(event.created_at)}</td>
                        <td className="px-4 py-3">{eventLabel(event.event_type)}</td>
                        <td className="px-4 py-3">{event.student_name || '未填写'}</td>
                        <td className="px-4 py-3">{event.level_name || '-'}</td>
                        <td className="px-4 py-3">{event.question_id ?? '-'}</td>
                        <td className="px-4 py-3">
                          {event.correct === null
                            ? event.passed === null
                              ? '-'
                              : event.passed
                                ? '通过'
                                : '未通过'
                            : event.correct
                              ? '正确'
                              : '错误'}
                        </td>
                        <td className="px-4 py-3">{event.score ?? '-'}</td>
                        <td className="px-4 py-3">{event.ip}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
