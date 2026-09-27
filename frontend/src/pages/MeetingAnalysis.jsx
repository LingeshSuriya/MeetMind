import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { getMeetingById, updateActionItemStatus, summarizeMeeting } from '../services/api';
import { Users, CheckSquare, MessageSquare, Clock, Tag, Copy, Download, Sparkles, BarChart2, CheckCircle } from 'lucide-react';

// ── Helpers ──────────────────────────────────────────────────────────────────
function ConfidenceBadge({ score }) {
  const v = parseFloat(score);
  const [color, label] =
    v >= 0.8 ? ['bg-green-100 text-green-700 border-green-200', 'High'] :
    v >= 0.6 ? ['bg-yellow-100 text-yellow-700 border-yellow-200', 'Medium'] :
               ['bg-slate-100 text-slate-600 border-slate-200', 'Low'];
  return <span className={`px-2 py-0.5 rounded text-xs font-medium border ${color}`}>{label} {Math.round(v * 100)}%</span>;
}

function StatusBadge({ status }) {
  const cfg = {
    Completed:   'bg-green-100 text-green-700',
    'In Progress': 'bg-blue-100 text-blue-700',
    Pending:     'bg-amber-100 text-amber-700',
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cfg[status] || cfg.Pending}`}>{status}</span>;
}

// ── Speaker Breakdown ─────────────────────────────────────────────────────────
function SpeakerBreakdown({ transcript }) {
  if (!transcript) return null;
  const lines = transcript.split('\n').filter(l => l.includes(':'));
  const counts = {};
  lines.forEach(l => {
    const [spk] = l.split(':');
    const name = spk.trim();
    if (name && name.length < 40) counts[name] = (counts[name] || 0) + 1;
  });
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  const colors = ['bg-brand-500', 'bg-purple-500', 'bg-rose-500', 'bg-amber-500', 'bg-teal-500', 'bg-indigo-500'];
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
        <BarChart2 size={18} className="text-brand-500" /> Speaker Breakdown
      </h3>
      <div className="space-y-3">
        {sorted.map(([name, count], i) => {
          const pct = Math.round((count / total) * 100);
          return (
            <div key={name}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-slate-700">{name}</span>
                <span className="text-slate-500">{count} lines · {pct}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full ${colors[i % colors.length]} rounded-full transition-all`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Keyword Cloud ─────────────────────────────────────────────────────────────
function KeywordCloud({ transcript }) {
  if (!transcript) return null;
  const STOP = new Set(['the','a','an','and','or','but','in','on','at','to','for','of','with','by','from','is','are','was','were','be','been','have','has','had','do','does','did','will','would','could','should','may','might','this','that','these','those','we','you','i','he','she','it','they','our','your','his','her','its','their','my','me','us','them','so','if','as','up','out','about','also','just','not','no','can','get','all','one','into','more','than','then','when','what','how','who']);
  const words = transcript.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(w => w.length > 3 && !STOP.has(w));
  const freq = {};
  words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
  const top = Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,20);
  if (!top.length) return null;
  const max = top[0][1];
  const tagColors = ['bg-brand-100 text-brand-700','bg-purple-100 text-purple-700','bg-teal-100 text-teal-700','bg-rose-100 text-rose-700','bg-amber-100 text-amber-700'];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
        <Tag size={18} className="text-teal-500" /> Key Terms
      </h3>
      <div className="flex flex-wrap gap-2">
        {top.map(([word, count], i) => {
          const size = count / max;
          const fs = size > 0.7 ? 'text-base font-bold' : size > 0.4 ? 'text-sm font-semibold' : 'text-xs font-medium';
          return (
            <span key={word} className={`px-3 py-1 rounded-full ${tagColors[i % tagColors.length]} ${fs}`}>
              {word}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function MeetingAnalysis() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('insights');
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getMeetingById(id)
      .then(res => { setData(res); setLoading(false); if (res.summary) setSummary(res.summary); })
      .catch(() => setLoading(false));
  }, [id]);

  const handleStatusChange = async (itemId, newStatus) => {
    try {
      await updateActionItemStatus(itemId, newStatus);
      setData(d => ({ ...d, actionItems: d.actionItems.map(a => a.id === itemId ? { ...a, status: newStatus } : a) }));
    } catch { alert('Failed to update status'); }
  };

  const handleGetSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const result = await summarizeMeeting(id);
      setSummary(result.summary);
      setActiveTab('summary');
    } catch {
      setSummary('Failed to generate summary. Is the ML service running on port 8000?');
      setActiveTab('summary');
    } finally { setSummaryLoading(false); }
  }, [id]);

  const handleCopyTranscript = useCallback(() => {
    navigator.clipboard.writeText(data?.transcript || '').then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [data]);

  const handleExportMarkdown = useCallback(() => {
    const lines = [
      `# ${data.title}`,
      `Analyzed: ${new Date(data.created_at).toLocaleDateString()}`,
      '',
      ...(summary ? ['## Summary', summary, ''] : []),
      '## Action Items',
      ...(data.actionItems?.map(a => `- [${a.status}] **${a.person}**: ${a.task}${a.deadline ? ` _(by ${a.deadline})_` : ''}`) || ['_None_']),
      '',
      '## Key Decisions',
      ...(data.decisions?.map(d => `- ${d.decision}`) || ['_None_']),
      '',
      '## Deadlines',
      ...(data.deadlines?.map(d => `- **${d.date}**: ${d.description}`) || ['_None_']),
      '',
      '## Participants',
      ...(data.participants?.map(p => `- ${p.name}`) || ['_None_']),
      '',
      '## Raw Transcript',
      data.transcript || '',
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${data.title.replace(/\s+/g, '_')}.md`; a.click();
    URL.revokeObjectURL(url);
  }, [data, summary]);

  if (loading) return (
    <div className="p-8 max-w-7xl mx-auto space-y-4">
      {[1,2,3].map(i => <div key={i} className="h-24 bg-slate-200 animate-pulse rounded-2xl" />)}
    </div>
  );
  if (!data) return <div className="p-8 text-red-500">Meeting not found.</div>;

  const TABS = [
    { id: 'insights', label: '📊 Extracted Insights' },
    { id: 'speakers', label: '🎙 Speaker View' },
    { id: 'transcript', label: '📄 Transcript' },
    { id: 'summary', label: '✨ AI Summary' },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">{data.title}</h1>
        <div className="flex flex-wrap gap-4 text-sm text-slate-500 mb-4">
          <span>Analyzed {new Date(data.created_at).toLocaleDateString()}</span>
          <span>•</span>
          <span className="flex items-center gap-1"><Users size={14} /> {data.participants?.length || 0} participants</span>
          <span>•</span>
          <span className="flex items-center gap-1"><CheckSquare size={14} /> {data.actionItems?.length || 0} action items</span>
          <span>•</span>
          <span className="flex items-center gap-1"><Clock size={14} /> {data.deadlines?.length || 0} deadlines</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={handleGetSummary} disabled={summaryLoading}
            className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-60 transition-colors">
            <Sparkles size={15} /> {summaryLoading ? 'Generating…' : summary ? 'Regenerate Summary' : 'AI Summary'}
          </button>
          <button onClick={handleCopyTranscript}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-700 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors">
            {copied ? <><CheckCircle size={15} /> Copied!</> : <><Copy size={15} /> Copy Transcript</>}
          </button>
          <button onClick={handleExportMarkdown}
            className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors">
            <Download size={15} /> Export .md
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-8 gap-1 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id}
            className={`px-5 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === t.id ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Insights tab */}
      {activeTab === 'insights' && (
        <div className="space-y-8">
          {/* Action Items */}
          <section>
            <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
              <CheckSquare size={22} className="text-brand-500" /> Action Items
              <span className="ml-auto text-sm font-normal text-slate-400">{data.actionItems?.length || 0} items</span>
            </h2>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['Person','Task','Deadline','Status','Confidence'].map(h => (
                      <th key={h} className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.actionItems?.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900 whitespace-nowrap">{item.person}</td>
                      <td className="px-6 py-4 text-slate-700 max-w-xs">{item.task}</td>
                      <td className="px-6 py-4 text-slate-600 whitespace-nowrap">{item.deadline || <span className="text-slate-300">—</span>}</td>
                      <td className="px-6 py-4">
                        <select value={item.status} onChange={e => handleStatusChange(item.id, e.target.value)}
                          className={`text-sm rounded-lg px-3 py-1.5 border appearance-none outline-none cursor-pointer ${
                            item.status === 'Completed' ? 'bg-green-50 text-green-700 border-green-200' :
                            item.status === 'In Progress' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                          <option>Pending</option>
                          <option>In Progress</option>
                          <option>Completed</option>
                        </select>
                      </td>
                      <td className="px-6 py-4"><ConfidenceBadge score={item.confidence} /></td>
                    </tr>
                  ))}
                  {!data.actionItems?.length && (
                    <tr><td colSpan="5" className="px-6 py-10 text-center text-slate-400">No action items found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Decisions */}
            <section>
              <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
                <MessageSquare size={22} className="text-purple-500" /> Key Decisions
              </h2>
              <div className="space-y-3">
                {data.decisions?.map(dec => (
                  <div key={dec.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-purple-400">
                    <p className="text-slate-800 mb-2">{dec.decision}</p>
                    <ConfidenceBadge score={dec.confidence} />
                  </div>
                ))}
                {!data.decisions?.length && <p className="text-slate-400 italic">No decisions recorded.</p>}
              </div>
            </section>

            {/* Deadlines */}
            <section>
              <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
                <Clock size={22} className="text-rose-500" /> Deadlines
              </h2>
              <div className="space-y-3">
                {data.deadlines?.map(dl => (
                  <div key={dl.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-rose-400">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-rose-600 text-sm">📅 {dl.date}</span>
                      <ConfidenceBadge score={dl.confidence} />
                    </div>
                    <p className="text-slate-700 text-sm">{dl.description}</p>
                  </div>
                ))}
                {!data.deadlines?.length && <p className="text-slate-400 italic">No explicit deadlines found.</p>}
              </div>
            </section>
          </div>

          {/* Participants + Topics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-50 rounded-2xl p-6">
              <h3 className="font-bold text-slate-700 flex items-center gap-2 mb-3"><Users size={16} /> Participants</h3>
              <div className="flex flex-wrap gap-2">
                {data.participants?.map(p => (
                  <span key={p.id} className="bg-brand-100 text-brand-800 px-3 py-1.5 rounded-full text-sm font-semibold border border-brand-200">
                    {p.name}
                  </span>
                ))}
                {!data.participants?.length && <p className="text-slate-400 italic text-sm">None detected.</p>}
              </div>
            </div>
            <div className="bg-slate-50 rounded-2xl p-6">
              <h3 className="font-bold text-slate-700 flex items-center gap-2 mb-3"><Tag size={16} /> Discussion Topics</h3>
              <div className="flex flex-wrap gap-2">
                {data.keyTopics?.map(t => (
                  <span key={t.id} className="bg-white text-slate-700 px-3 py-1.5 rounded-full text-sm border border-slate-200 shadow-sm">{t.topic}</span>
                ))}
                {!data.keyTopics?.length && <p className="text-slate-400 italic text-sm">None extracted.</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Speaker view tab */}
      {activeTab === 'speakers' && (
        <div className="space-y-6">
          <SpeakerBreakdown transcript={data.transcript} />
          <KeywordCloud transcript={data.transcript} />
          {/* Per-speaker transcript */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-bold text-slate-800 mb-4">Per-Speaker Lines</h3>
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              {data.transcript?.split('\n').filter(l => l.trim()).map((line, i) => {
                const colonIdx = line.indexOf(':');
                const spk = colonIdx > 0 ? line.slice(0, colonIdx).trim() : 'Participant';
                const txt = colonIdx > 0 ? line.slice(colonIdx + 1).trim() : line;
                const colors = ['border-l-brand-400','border-l-purple-400','border-l-rose-400','border-l-amber-400','border-l-teal-400','border-l-indigo-400'];
                const ci = (spk.charCodeAt(0) || 0) % colors.length;
                return (
                  <div key={i} className={`pl-4 border-l-4 ${colors[ci]}`}>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">{spk}</span>
                    <p className="text-slate-700 text-sm mt-0.5">{txt}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Transcript tab */}
      {activeTab === 'transcript' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center">
            <span className="text-sm font-medium text-slate-600">Raw Transcript</span>
            <button onClick={handleCopyTranscript}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-600 transition-colors">
              {copied ? <><CheckCircle size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
            </button>
          </div>
          <div className="p-8 prose max-w-none text-slate-800 font-mono text-sm leading-relaxed whitespace-pre-wrap">
            {data.transcript}
          </div>
        </div>
      )}

      {/* Summary tab */}
      {activeTab === 'summary' && (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 min-h-[200px]">
          {summary ? (
            <div>
              <h2 className="text-lg font-bold text-slate-800 mb-4">📝 AI-Generated Summary</h2>
              <p className="text-slate-700 leading-relaxed text-base whitespace-pre-line">{summary}</p>
              <button onClick={handleGetSummary} disabled={summaryLoading}
                className="mt-6 px-4 py-2 bg-purple-100 text-purple-700 text-sm rounded-lg hover:bg-purple-200 transition-colors disabled:opacity-60">
                {summaryLoading ? 'Regenerating…' : '↺ Regenerate'}
              </button>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-slate-500 mb-2 text-lg">No summary yet.</p>
              <p className="text-slate-400 text-sm mb-6">Requires the ML service running on port 8000.</p>
              <button onClick={handleGetSummary} disabled={summaryLoading}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-60 transition-colors font-medium flex items-center gap-2 mx-auto">
                <Sparkles size={18} /> {summaryLoading ? 'Generating…' : 'Generate AI Summary'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
