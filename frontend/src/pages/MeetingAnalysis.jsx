import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getMeetingById, updateActionItemStatus } from '../services/api';
import { Users, CheckSquare, MessageSquare, Clock, Tag, ChevronDown } from 'lucide-react';

function ConfidenceBadge({ score }) {
  const value = parseFloat(score);
  let color = 'bg-slate-100 text-slate-600';
  let label = 'Low';
  
  if (value >= 0.8) {
    color = 'bg-green-100 text-green-700 border-green-200';
    label = 'High';
  } else if (value >= 0.6) {
    color = 'bg-yellow-100 text-yellow-700 border-yellow-200';
    label = 'Medium';
  }

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium border ${color}`}>
      {label} ({Math.round(value * 100)}%)
    </span>
  );
}

export default function MeetingAnalysis() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('insights');

  useEffect(() => {
    getMeetingById(id)
      .then(res => {
        setData(res);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <div className="p-8">Loading analysis...</div>;
  if (!data) return <div className="p-8 text-red-500">Meeting not found.</div>;

  const handleStatusChange = async (itemId, newStatus) => {
    try {
      await updateActionItemStatus(itemId, newStatus);
      const updated = data.actionItems.map(item => 
        item.id === itemId ? { ...item, status: newStatus } : item
      );
      setData({ ...data, actionItems: updated });
    } catch (err) {
      alert("Failed to update status");
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">{data.title}</h1>
        <div className="flex gap-4 text-sm text-slate-500">
          <span>Analyzed on {new Date(data.created_at).toLocaleDateString()}</span>
          <span>•</span>
          <span className="flex items-center gap-1"><Users size={16} /> {data.participants?.length || 0} Participants</span>
        </div>
      </div>

      <div className="flex border-b border-slate-200 mb-8">
        <button 
          className={`px-6 py-3 font-medium border-b-2 transition-colors ${activeTab === 'insights' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          onClick={() => setActiveTab('insights')}
        >
          Extracted Insights
        </button>
        <button 
          className={`px-6 py-3 font-medium border-b-2 transition-colors ${activeTab === 'transcript' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          onClick={() => setActiveTab('transcript')}
        >
          Raw Transcript
        </button>
      </div>

      {activeTab === 'insights' && (
        <div className="space-y-8">
          
          {/* Action Items */}
          <section>
            <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
              <CheckSquare size={24} className="text-brand-500" /> 
              Action Items
            </h2>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-sm font-semibold text-slate-600">Person</th>
                    <th className="px-6 py-3 text-sm font-semibold text-slate-600">Task</th>
                    <th className="px-6 py-3 text-sm font-semibold text-slate-600">Deadline</th>
                    <th className="px-6 py-3 text-sm font-semibold text-slate-600">Status</th>
                    <th className="px-6 py-3 text-sm font-semibold text-slate-600">Confidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.actionItems?.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">{item.person}</td>
                      <td className="px-6 py-4 text-slate-700">{item.task}</td>
                      <td className="px-6 py-4 text-slate-600 whitespace-nowrap">{item.deadline || '-'}</td>
                      <td className="px-6 py-4">
                        <select 
                          value={item.status}
                          onChange={(e) => handleStatusChange(item.id, e.target.value)}
                          className={`text-sm rounded-lg px-3 py-1.5 border appearance-none outline-none focus:ring-2 focus:ring-brand-500/50 ${
                            item.status === 'Completed' ? 'bg-green-50 text-green-700 border-green-200' : 
                            item.status === 'In Progress' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                            'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          <option value="Pending">Pending</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Completed</option>
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <ConfidenceBadge score={item.confidence} />
                      </td>
                    </tr>
                  ))}
                  {data.actionItems?.length === 0 && (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center text-slate-500">No action items found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Decisions */}
            <section>
              <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
                <MessageSquare size={24} className="text-purple-500" /> 
                Key Decisions
              </h2>
              <div className="space-y-3">
                {data.decisions?.map(dec => (
                  <div key={dec.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col gap-2">
                    <p className="text-slate-800 font-medium">{dec.decision}</p>
                    <div className="self-start">
                      <ConfidenceBadge score={dec.confidence} />
                    </div>
                  </div>
                ))}
                {data.decisions?.length === 0 && (
                  <div className="text-slate-500 italic">No decisions recorded.</div>
                )}
              </div>
            </section>

            {/* Deadlines */}
            <section>
              <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
                <Clock size={24} className="text-rose-500" /> 
                Deadlines
              </h2>
              <div className="space-y-3">
                {data.deadlines?.map(dl => (
                  <div key={dl.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-rose-400">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-rose-600">{dl.date}</span>
                      <ConfidenceBadge score={dl.confidence} />
                    </div>
                    <p className="text-slate-700">{dl.description}</p>
                  </div>
                ))}
                {data.deadlines?.length === 0 && (
                  <div className="text-slate-500 italic">No explicit deadlines found.</div>
                )}
              </div>
            </section>
          </div>
          
          {/* Topics & Participants */}
          <section className="bg-slate-100 p-6 rounded-2xl">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-bold flex items-center gap-2 mb-3 text-slate-800"><Tag size={18} /> Discussion Topics</h3>
                  <div className="flex flex-wrap gap-2">
                    {data.keyTopics?.map(topic => (
                      <span key={topic.id} className="bg-white px-3 py-1.5 rounded-full text-sm font-medium border border-slate-200 text-slate-700 shadow-sm">
                        {topic.topic}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="font-bold flex items-center gap-2 mb-3 text-slate-800"><Users size={18} /> Participants Detected</h3>
                  <div className="flex flex-wrap gap-2">
                    {data.participants?.map(p => (
                      <span key={p.id} className="bg-brand-50 text-brand-700 px-3 py-1.5 rounded-full text-sm font-bold border border-brand-200">
                        {p.name}
                      </span>
                    ))}
                  </div>
                </div>
             </div>
          </section>

        </div>
      )}

      {activeTab === 'transcript' && (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
          <div className="prose max-w-none text-slate-800 font-serif leading-loose whitespace-pre-wrap">
            {data.transcript}
          </div>
        </div>
      )}
    </div>
  );
}
