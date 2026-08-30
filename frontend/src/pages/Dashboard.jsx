import React, { useEffect, useState } from 'react';
import { getDashboardStats } from '../services/api';
import { Users, CheckSquare, MessageSquare, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

function StatCard({ title, value, icon: Icon, colorClass }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className={`p-4 rounded-xl ${colorClass}`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <h3 className="text-3xl font-bold text-slate-900 mt-1">{value}</h3>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalMeetings: 0,
    totalActionItems: 0,
    pendingActionItems: 0,
    totalDecisions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getDashboardStats()
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to load dashboard statistics.');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="p-8">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-500">{error}</div>;
  }

  const chartData = [
    { name: 'Meetings', value: stats.totalMeetings },
    { name: 'Decisions', value: stats.totalDecisions },
    { name: 'Total Actions', value: stats.totalActionItems },
    { name: 'Pending', value: stats.pendingActionItems },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Overview</h1>
      <p className="text-slate-500 mb-8">Welcome back. Here is your meeting intelligence summary.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard 
          title="Total Meetings" 
          value={stats.totalMeetings} 
          icon={Users} 
          colorClass="bg-blue-100 text-blue-600"
        />
        <StatCard 
          title="Total Decisions" 
          value={stats.totalDecisions} 
          icon={MessageSquare} 
          colorClass="bg-purple-100 text-purple-600"
        />
        <StatCard 
          title="Total Actions" 
          value={stats.totalActionItems} 
          icon={CheckSquare} 
          colorClass="bg-emerald-100 text-emerald-600"
        />
        <StatCard 
          title="Pending Actions" 
          value={stats.pendingActionItems} 
          icon={AlertCircle} 
          colorClass="bg-amber-100 text-amber-600"
        />
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h2 className="text-lg font-bold mb-6">Activity Overview</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Bar dataKey="value" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
