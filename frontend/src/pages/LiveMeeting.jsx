import React, { useState, useEffect, useRef } from 'react';
import { Radio, Users, Settings } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { analyzeMeeting } from '../services/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export default function LiveMeeting() {
  const [liveData, setLiveData] = useState({ transcript: '', count: 0 });
  const [error, setError] = useState(false);
  const [title, setTitle] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  // Poll backend for live transcript every 1.5 seconds
  useEffect(() => {
    let interval;
    const fetchLive = async () => {
      try {
        const res = await axios.get(`${API_URL}/live`);
        setLiveData(res.data);
        setError(false);
      } catch (e) {
        setError(true);
      }
    };
    
    fetchLive();
    interval = setInterval(fetchLive, 1500);
    return () => clearInterval(interval);
  }, []);

  // Auto scroll to bottom when transcript updates
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [liveData.transcript]);

  const handleAnalyze = async () => {
    if (!liveData.transcript) return;
    const meetingTitle = title.trim() || 'Live Meeting ' + new Date().toLocaleString();
    setAnalyzing(true);
    try {
      const res = await analyzeMeeting({ title: meetingTitle, transcript: liveData.transcript });
      // Clear live session on backend? Handled by user hitting 'clear' in extension usually, 
      // but we can just redirect to the results.
      navigate(`/meetings/${res.meetingId}`);
    } catch (err) {
      alert('Analysis failed: ' + (err.response?.data?.error || err.message));
      setAnalyzing(false);
    }
  };

  const lines = liveData.transcript ? liveData.transcript.split('\n') : [];

  return (
    <div className="p-8 max-w-5xl mx-auto h-[calc(100vh-60px)] flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <div className="relative flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
            </div>
            Live View
          </h1>
          <p className="text-slate-500 mt-1">Watching active Google Meet in real-time</p>
        </div>
        
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm border border-red-200">
            Cannot reach backend server.
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden">
        {/* Header bar */}
        <div className="border-b border-slate-100 p-4 bg-slate-50 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Radio size={18} className="text-brand-500" />
            <span className="font-semibold text-slate-700">Incoming Transcript</span>
            <span className="bg-brand-100 text-brand-700 text-xs font-bold px-2 py-0.5 rounded-full ml-2">
              {liveData.count} lines
            </span>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Meeting Title (optional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-brand-500"
            />
            <button
              onClick={handleAnalyze}
              disabled={analyzing || liveData.count < 3}
              className="px-4 py-1.5 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {analyzing ? 'Analyzing...' : 'Analyze Now'}
            </button>
          </div>
        </div>

        {/* Transcript Area */}
        <div 
          ref={containerRef}
          className="flex-1 p-6 overflow-y-auto bg-slate-50/50 space-y-4"
        >
          {lines.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <Users size={48} className="mb-4 opacity-20" />
              <p className="text-lg font-medium">Waiting for meeting audio...</p>
              <p className="text-sm mt-2 max-w-md text-center leading-relaxed">
                Make sure the MeetMind extension is running in a Google Meet tab, and that captions are turned on.
              </p>
            </div>
          ) : (
            lines.map((line, i) => {
              const colonIdx = line.indexOf(':');
              const spk = colonIdx > 0 ? line.slice(0, colonIdx).trim() : 'Participant';
              const txt = colonIdx > 0 ? line.slice(colonIdx + 1).trim() : line;
              const colors = ['bg-brand-100 text-brand-700','bg-purple-100 text-purple-700','bg-rose-100 text-rose-700','bg-amber-100 text-amber-700','bg-teal-100 text-teal-700'];
              const ci = (spk.charCodeAt(0) || 0) % colors.length;

              return (
                <div key={i} className="flex gap-4 items-start max-w-3xl">
                  <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${colors[ci]}`}>
                    {spk.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="bg-white p-3 rounded-2xl rounded-tl-sm border border-slate-100 shadow-sm text-slate-700">
                    <div className="text-xs font-bold text-slate-400 mb-1">{spk}</div>
                    <div className="leading-relaxed">{txt}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
