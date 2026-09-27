import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllDeadlines } from '../services/api';
import { Clock, ExternalLink, AlertTriangle, RefreshCw, Calendar } from 'lucide-react';

// Rough date-to-days parser for relative terms
function parseDateLabel(raw) {
  if (!raw) return null;
  const r = raw.toLowerCase();
  const today = new Date();

  if (r.includes('today'))        return new Date(today);
  if (r.includes('tomorrow'))     { const d = new Date(today); d.setDate(d.getDate()+1); return d; }
  if (r.includes('next monday'))  return nextWeekday(today,1);
  if (r.includes('next tuesday')) return nextWeekday(today,2);
  if (r.includes('next wednesday')) return nextWeekday(today,3);
  if (r.includes('next thursday')) return nextWeekday(today,4);
  if (r.includes('next friday'))  return nextWeekday(today,5);
  if (r.includes('friday'))       return nextWeekday(today,5);
  if (r.includes('thursday'))     return nextWeekday(today,4);
  if (r.includes('wednesday'))    return nextWeekday(today,3);
  if (r.includes('monday'))       return nextWeekday(today,1);
  if (r.includes('end of week') || r.includes('end of this week')) { const d = new Date(today); d.setDate(d.getDate()+(5-d.getDay())); return d; }
  if (r.includes('next week'))    { const d = new Date(today); d.setDate(d.getDate()+7); return d; }
  if (r.includes('end of month')) { return new Date(today.getFullYear(), today.getMonth()+1, 0); }
  // Try real date parse
  const parsed = new Date(raw);
  return isNaN(parsed) ? null : parsed;
}

function nextWeekday(from, day) {
  const d = new Date(from);
  const diff = ((day - d.getDay()) + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d;
}

function urgencyLabel(date) {
  if (!date) return { label: 'Unknown', color: 'bg-slate-100 text-slate-500', days: null };
  const now = new Date();
  const days = Math.round((date - now) / (1000*60*60*24));
  if (days < 0)  return { label: 'Overdue',     color: 'bg-red-100   text-red-700   border-red-200',    days };
  if (days === 0) return { label: 'Today',       color: 'bg-rose-100  text-rose-700  border-rose-200',   days };
  if (days <= 2) return { label: `${days}d left`, color: 'bg-orange-100 text-orange-700 border-orange-200', days };
  if (days <= 7) return { label: `${days}d left`, color: 'bg-amber-100 text-amber-700 border-amber-200', days };
  return { label: `${days}d left`, color: 'bg-green-100 text-green-700 border-green-200', days };
}

export default function DeadlinesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');   // all | overdue | this-week | upcoming

  const load = async () => {
    setLoading(true);
    try { setItems(await getAllDeadlines()); }
    catch { setItems([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // Enrich with parsed dates
  const enriched = items.map(d => {
    const parsed = parseDateLabel(d.date);
    const urgency = urgencyLabel(parsed);
    return { ...d, parsed, urgency };
  });

  const now = new Date();
  const weekEnd = new Date(now); weekEnd.setDate(now.getDate() + 7);

  const filtered = enriched.filter(d => {
    if (filter === 'overdue')   return d.urgency.days !== null && d.urgency.days < 0;
    if (filter === 'this-week') return d.urgency.days !== null && d.urgency.days >= 0 && d.urgency.days <= 7;
    if (filter === 'upcoming')  return d.urgency.days === null || d.urgency.days > 7;
    return true;
  });

  const counts = {
    overdue:   enriched.filter(d => d.urgency.days !== null && d.urgency.days < 0).length,
    thisWeek:  enriched.filter(d => d.urgency.days !== null && d.urgency.days >= 0 && d.urgency.days <= 7).length,
    upcoming:  enriched.filter(d => d.urgency.days === null || d.urgency.days > 7).length,
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Clock className="text-rose-500" size={30} />
            Deadlines
          </h1>
          <p className="text-slate-500 mt-1">{items.length} deadline{items.length !== 1 ? 's' : ''} across all meetings</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-xl text-slate-600 hover:bg-slate-200 transition-colors text-sm font-medium">
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { key: 'all',       label: `All (${items.length})` },
          { key: 'overdue',   label: `⚠ Overdue (${counts.overdue})`,     danger: true },
          { key: 'this-week', label: `📅 This week (${counts.thisWeek})` },
          { key: 'upcoming',  label: `⏳ Upcoming (${counts.upcoming})` },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === f.key
                ? f.danger ? 'bg-red-500 text-white' : 'bg-brand-500 text-white'
                : f.danger ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Overdue banner */}
      {counts.overdue > 0 && filter !== 'this-week' && filter !== 'upcoming' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <AlertTriangle size={20} className="text-red-500 shrink-0" />
          <div>
            <p className="font-semibold text-red-700">{counts.overdue} overdue deadline{counts.overdue !== 1 ? 's' : ''}</p>
            <p className="text-red-500 text-sm">These deadlines have passed — consider following up.</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-slate-200 animate-pulse rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <Calendar size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg">No deadlines in this category.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered
            .sort((a, b) => {
              if (a.urgency.days === null) return 1;
              if (b.urgency.days === null) return -1;
              return a.urgency.days - b.urgency.days;
            })
            .map(d => (
              <div key={d.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-start gap-4">
                {/* Urgency badge */}
                <div className="shrink-0 flex flex-col items-center">
                  <span className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${d.urgency.color}`}>
                    {d.urgency.label}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-slate-800 font-medium mb-1 leading-snug">{d.description}</p>
                  <div className="flex items-center gap-3 flex-wrap mt-2">
                    {d.date && (
                      <span className="text-sm text-rose-600 font-semibold flex items-center gap-1">
                        <Clock size={13} /> {d.date}
                      </span>
                    )}
                    <span className="text-xs text-slate-400">
                      from: <span className="font-medium text-slate-600">{d.meeting_title}</span>
                    </span>
                  </div>
                </div>

                <Link to={`/meetings/${d.meeting_id}`}
                  className="shrink-0 p-2 text-slate-400 hover:text-brand-500 hover:bg-brand-50 rounded-lg transition-colors">
                  <ExternalLink size={16} />
                </Link>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
