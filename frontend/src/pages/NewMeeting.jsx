import React, { useState } from 'react';
import { analyzeMeeting } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, Loader2, Sparkles, AlertCircle } from 'lucide-react';

export default function NewMeeting() {
  const [title, setTitle] = useState('');
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
      const reader = new FileReader();
      reader.onload = (evt) => {
        setTranscript(evt.target.result);
      };
      reader.readAsText(file);
    }
  };

  const handleAnalyze = async () => {
    if (!title.trim() || !transcript.trim()) {
      setError("Please provide both a title and a transcript.");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await analyzeMeeting({ title, transcript });
      navigate(`/meetings/${result.meetingId}`);
    } catch (err) {
      setError(err.response?.data?.error || "An error occurred while analyzing the meeting.");
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-brand-100 text-brand-600 rounded-xl">
          <Sparkles size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">New Meeting Intelligence</h1>
          <p className="text-slate-500">Upload or paste a transcript to extract insights.</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 border border-red-100 flex items-center gap-2">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
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
        
        <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-600 font-medium">
            <FileText size={20} />
            Transcript Content
          </div>
          <label className="cursor-pointer bg-white border border-slate-200 px-4 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm">
            <Upload size={16} />
            Upload .txt
            <input type="file" accept=".txt" className="hidden" onChange={handleFileUpload} />
          </label>
        </div>

        <div className="p-6">
          <textarea 
            placeholder="Paste your meeting transcript here..."
            className="w-full h-80 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all resize-none font-mono text-sm leading-relaxed"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
          />
        </div>
        
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button 
            onClick={handleAnalyze}
            disabled={loading}
            className="bg-brand-600 hover:bg-brand-700 text-white px-8 py-3 rounded-xl font-semibold shadow-lg shadow-brand-500/30 transition-all flex items-center gap-2 disabled:opacity-70"
          >
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Processing NLP...
              </>
            ) : (
              <>
                <Sparkles size={20} />
                Analyze Meeting
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
