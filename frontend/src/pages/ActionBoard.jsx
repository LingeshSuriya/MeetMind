import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllActionItems, updateActionItemStatus } from '../services/api';
import { CheckSquare, Filter, ExternalLink, Clock, User, RefreshCw } from 'lucide-react';

const STATUS_COLS = [
  { key: 'Pending',     label: 'Pending',     color: 'bg-amber-50  border-amber-200', dot: 'bg-amber-400',  text: 'text-amber-700'  },
  { key: 'In Progress', label: 'In Progress', color: 'bg-blue-50   border-blue-200',  dot: 'bg-blue-400',   text: 'text-blue-700'   },
  { key: 'Completed',   label: 'Completed',   color: 'bg-green-50  border-green-200', dot: 'bg-green-500',  text: 'text-green-700'  },
];

function ActionCard({ item, onStatusChange }) {
  const [changing, setChanging] = useState(false);
  const handle = async (newStatus) => {
    setChanging(true);
    await onStatusChange(item.id, newStatus);
    setChanging(false);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:shadow-md transition-shadow group">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
          <User size={11} />
          <span className="font-semibold text-brand-600">{item.person || 'Team'}</span>
        </div>
        <Link to={`/meetings/${item.meeting_id}`} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-brand-500">
          <ExternalLink size={13} />
        </Link>
      </div>

      <p className="text-sm text-slate-800 mb-3 leading-relaxed">{item.task}</p>

      {item.deadline && (
        <div className="flex items-center gap-1 text-xs text-rose-500 font-medium mb-3">
          <Clock size={11} /> Due: {item.deadline}
        </div>
      )}

      <div className="text-xs text-slate-400 mb-3 truncate" title={item.meeting_title}>
        📋 {item.meeting_title}
      </div>

      <select
        value={item.status}
        disabled={changing}
        onChange={e => handle(e.target.value)}
        className="w-full text-xs rounded-lg px-2 py-1.5 border cursor-pointer outline-none bg-white"
      >
        <option>Pending</option>
        <option>In Progress</option>
        <option>Completed</option>
      </select>
    </div>
  );
}

export default function ActionBoard() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [personFilter, setPersonFilter] = useState('');

  const load = async () => {
    setLoading(true);
    try { setItems(await getAllActionItems()); }
    catch { setItems([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleStatusChange = async (id, status) => {
    await updateActionItemStatus(id, status);
    setItems(prev => prev.map(it => it.id === id ? { ...it, status } : it));
  };

  const allPeople = [...new Set(items.map(i => i.person).filter(Boolean))].sort();

  const filtered = items.filter(it => {
    const matchSearch = !search || it.task.toLowerCase().includes(search.toLowerCase()) || (it.meeting_title || '').toLowerCase().includes(search.toLowerCase());
    const matchPerson = !personFilter || it.person === personFilter;
    return matchSearch && matchPerson;
  });

  const byStatus = (status) => filtered.filter(i => i.status === status);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <CheckSquare className="text-brand-500" size={30} />
            Action Board
          </h1>
          <p className="text-slate-500 mt-1">{items.length} action items across all meetings</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-xl text-slate-600 hover:bg-slate-200 transition-colors text-sm font-medium">
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-8 flex-wrap">
        <input
          type="text"
          placeholder="Search tasks or meetings…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 bg-white flex-1 min-w-48"
        />
        <div className="flex items-center gap-2">
          <Filter size={15} className="text-slate-400" />
          <select value={personFilter} onChange={e => setPersonFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white outline-none cursor-pointer">
            <option value="">All People</option>
            {allPeople.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-6">
          {[1,2,3].map(i => (
            <div key={i} className="space-y-3">
              {[1,2,3].map(j => <div key={j} className="h-32 bg-slate-200 animate-pulse rounded-xl" />)}
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {STATUS_COLS.map(col => {
            const colItems = byStatus(col.key);
            return (
              <div key={col.key} className={`rounded-2xl border p-4 ${col.color}`}>
                <div className="flex items-center gap-2 mb-4">
                  <div className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
                  <h2 className={`font-bold text-sm ${col.text}`}>{col.label}</h2>
                  <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full bg-white border ${col.text}`}>
                    {colItems.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {colItems.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm italic">No items</div>
                  ) : (
                    colItems.map(item => (
                      <ActionCard key={item.id} item={item} onStatusChange={handleStatusChange} />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Summary bar */}
      {!loading && (
        <div className="mt-8 bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="font-bold text-slate-700 mb-4">Completion Overview</h3>
          {(() => {
            const total = filtered.length || 1;
            const done = byStatus('Completed').length;
            const inprog = byStatus('In Progress').length;
            const pending = byStatus('Pending').length;
            return (
              <div>
                <div className="flex gap-0.5 h-3 rounded-full overflow-hidden mb-3">
                  <div className="bg-green-400 transition-all" style={{ width: `${(done/total)*100}%` }} />
                  <div className="bg-blue-400 transition-all"  style={{ width: `${(inprog/total)*100}%` }} />
                  <div className="bg-amber-300 transition-all" style={{ width: `${(pending/total)*100}%` }} />
                </div>
                <div className="flex gap-6 text-sm text-slate-600">
                  <span><span className="font-bold text-green-600">{done}</span> completed</span>
                  <span><span className="font-bold text-blue-600">{inprog}</span> in progress</span>
                  <span><span className="font-bold text-amber-600">{pending}</span> pending</span>
                  <span className="ml-auto font-semibold text-slate-800">
                    {total > 0 ? Math.round((done/total)*100) : 0}% done
                  </span>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
