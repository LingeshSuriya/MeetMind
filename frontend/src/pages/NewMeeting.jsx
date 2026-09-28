import React, { useState, useCallback } from 'react';
import { analyzeMeeting } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, Loader2, Sparkles, AlertCircle, Mic, BookOpen, X, CheckCircle } from 'lucide-react';

const DEMO_TRANSCRIPTS = [
  {
    id: 'sprint',
    label: 'Sprint Planning',
    description: 'Engineering sprint — 4 participants, action items & deadlines',
    emoji: '🏃',
    file: '/demo-transcripts/sprint-planning.txt',
  },
  {
    id: 'product',
    label: 'Product Review',
    description: 'Q3 roadmap review — decisions, API migration, cost audit',
    emoji: '📊',
    file: '/demo-transcripts/product-review.txt',
  },
  {
    id: 'client',
    label: 'Client Sync',
    description: 'Enterprise sales call — compliance, SLA, pricing & go-live',
    emoji: '🤝',
    file: '/demo-transcripts/client-sync.txt',
  },
];

export default function NewMeeting() {
  const [title, setTitle] = useState('');
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [demoLoading, setDemoLoading] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const navigate = useNavigate();

  const wordCount = transcript.trim() ? transcript.trim().split(/\s+/).length : 0;
  const lineCount = transcript.trim() ? transcript.trim().split('\n').filter(l => l.trim()).length : 0;

  // ── File handling ──────────────────────────────────────────────────────────
  const loadFile = useCallback((file) => {
    if (!file) return;
    if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ''));
    const reader = new FileReader();
    reader.onload = (evt) => setTranscript(evt.target.result);
    reader.readAsText(file);
  }, [title]);

  const handleFileUpload = (e) => loadFile(e.target.files[0]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.txt')) loadFile(file);
  };

  // ── Load demo transcript ───────────────────────────────────────────────────
  const loadDemo = async (demo) => {
    setDemoLoading(demo.id);
    try {
      const res = await fetch(demo.file);
      const text = await res.text();
      setTranscript(text);
      if (!title) setTitle(demo.label);
    } catch {
      setError('Could not load demo transcript. Try uploading the file from demo-transcripts/ folder.');
    } finally {
      setDemoLoading(null);
    }
  };

  // ── Analyze ────────────────────────────────────────────────────────────────
  const handleAnalyze = async () => {
    if (!title.trim()) { setError('Please add a meeting title.'); return; }
    if (!transcript.trim()) { setError('Please paste or upload a transcript.'); return; }
    if (wordCount < 15) { setError(`Transcript too short (${wordCount} words). Need at least 15 words for meaningful analysis.`); return; }

    setLoading(true);
    setError(null);
    try {
      const result = await analyzeMeeting({ title, transcript });
      navigate(`/meetings/${result.meetingId}`);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Analysis failed.';
      setError(
        msg.includes('ECONNREFUSED') || msg.includes('Network')
          ? '❌ Cannot reach backend. Make sure it\'s running:\n  cd D:\\MeetMind\\backend && npm run dev'
          : msg
      );
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-brand-100 text-brand-600 rounded-xl">
          <Sparkles size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">New Meeting Intelligence</h1>
          <p className="text-slate-500">Upload, paste, or load a demo transcript to extract insights.</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl mb-6 border border-red-100 flex items-start gap-2 whitespace-pre-line">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <div className="flex-1">{error}</div>
          <button onClick={() => setError(null)} className="shrink-0 text-red-400 hover:text-red-600"><X size={16} /></button>
        </div>
      )}

      {/* From Extension tip */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 flex items-start gap-3">
        <Mic size={18} className="text-blue-500 mt-0.5 shrink-0" />
        <div className="text-sm text-blue-700">
          <strong>Live from Google Meet?</strong> Go to the <strong className="font-bold">Live View</strong> tab on the left to see your meeting transcript stream in real-time and analyze it directly!
        </div>
      </div>

      {/* Demo transcripts */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen size={16} className="text-slate-500" />
          <span className="text-sm font-semibold text-slate-600">Load a Demo Transcript</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {DEMO_TRANSCRIPTS.map(demo => (
            <button
              key={demo.id}
              onClick={() => loadDemo(demo)}
              disabled={demoLoading === demo.id || loading}
              className="text-left p-3 bg-white rounded-xl border border-slate-200 hover:border-brand-400 hover:bg-brand-50 transition-all group disabled:opacity-60"
            >
              <div className="text-lg mb-1">{demo.emoji}</div>
              <div className="text-xs font-semibold text-slate-800 group-hover:text-brand-700 mb-1">{demo.label}</div>
              <div className="text-xs text-slate-500 leading-tight">{demo.description}</div>
              {demoLoading === demo.id && <div className="text-xs text-brand-500 mt-1">Loading…</div>}
            </button>
          ))}
        </div>
      </div>

      {/* Main card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Title */}
        <div className="p-6 border-b border-slate-100">
          <label className="block text-sm font-medium text-slate-700 mb-2">Meeting Title</label>
          <input
            type="text"
            placeholder="e.g. Q3 Roadmap Planning"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* Transcript toolbar */}
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-600 font-medium text-sm">
            <FileText size={16} />
            Transcript
            {wordCount > 0 && (
              <span className="ml-2 text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                {wordCount.toLocaleString()} words · {lineCount} lines
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {transcript && (
              <button
                onClick={() => { setTranscript(''); setTitle(''); }}
                className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1"
              >
                <X size={12} /> Clear
              </button>
            )}
            <label className="cursor-pointer bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-sm">
              <Upload size={13} />
              Upload .txt
              <input type="file" accept=".txt" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>
        </div>

        {/* Textarea with drag-and-drop */}
        <div
          className={`p-6 transition-colors ${dragOver ? 'bg-brand-50' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          {dragOver && (
            <div className="absolute inset-6 border-2 border-dashed border-brand-400 rounded-xl flex items-center justify-center bg-brand-50/80 pointer-events-none z-10">
              <span className="text-brand-600 font-medium">Drop .txt file here</span>
            </div>
          )}
          <textarea
            placeholder={`Paste your meeting transcript here…\n\nFormat (optional):\nSpeaker Name: what they said\nAnother Person: their response\n\nOr drag & drop a .txt file anywhere in this box.`}
            className="w-full h-72 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all resize-none font-mono text-sm leading-relaxed"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
          />
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            {wordCount >= 15
              ? <span className="text-green-600 flex items-center gap-1"><CheckCircle size={12} /> Ready to analyze ({wordCount} words)</span>
              : wordCount > 0
                ? `Need ${15 - wordCount} more words`
                : 'Add transcript to begin'}
          </div>
          <button
            onClick={handleAnalyze}
            disabled={loading || wordCount < 15}
            className="bg-brand-600 hover:bg-brand-700 text-white px-8 py-3 rounded-xl font-semibold shadow-lg shadow-brand-500/30 transition-all flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <><Loader2 size={18} className="animate-spin" /> Analysing…</>
            ) : (
              <><Sparkles size={18} /> Analyze Meeting</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
