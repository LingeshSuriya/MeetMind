import React, { useEffect, useState } from 'react';
import { getMeetings, deleteMeeting } from '../services/api';
import { Link } from 'react-router-dom';
import { Trash2, ExternalLink, Calendar, Search } from 'lucide-react';

export default function MeetingHistory() {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    try {
      const data = await getMeetings();
      setMeetings(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this meeting?')) {
      try {
        await deleteMeeting(id);
        setMeetings(meetings.filter(m => m.id !== id));
      } catch (err) {
        alert("Failed to delete meeting");
      }
    }
  };

  const filteredMeetings = meetings.filter(m => 
    m.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Meeting History</h1>
          <p className="text-slate-500">Access and review all your previously analyzed meetings.</p>
        </div>
        
        <div className="relative">
          <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search meetings..." 
            className="pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/50 w-full md:w-64"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="text-slate-500">Loading history...</div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {filteredMeetings.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              No meetings found. Start by analyzing a new meeting!
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 font-semibold text-sm text-slate-600">Meeting Title</th>
                  <th className="px-6 py-4 font-semibold text-sm text-slate-600">Date Analyzed</th>
                  <th className="px-6 py-4 font-semibold text-sm text-slate-600 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMeetings.map((meeting) => (
                  <tr key={meeting.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {meeting.title}
                    </td>
                    <td className="px-6 py-4 text-slate-500 flex items-center gap-2">
                      <Calendar size={16} />
                      {new Date(meeting.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link 
                          to={`/meetings/${meeting.id}`}
                          className="p-2 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                          title="View Analysis"
                        >
                          <ExternalLink size={18} />
                        </Link>
                        <button 
                          onClick={() => handleDelete(meeting.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Meeting"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
