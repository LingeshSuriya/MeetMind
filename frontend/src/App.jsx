import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, History, BrainCircuit } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import NewMeeting from './pages/NewMeeting';
import MeetingAnalysis from './pages/MeetingAnalysis';
import MeetingHistory from './pages/MeetingHistory';

function Sidebar() {
  const location = useLocation();
  
  const navItems = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
    { name: 'New Meeting', path: '/new', icon: <PlusCircle size={20} /> },
    { name: 'History', path: '/history', icon: <History size={20} /> },
  ];

  return (
    <div className="w-64 bg-slate-900 text-white flex flex-col min-h-screen shadow-2xl">
      <div className="p-6 flex items-center gap-3 border-b border-slate-800">
        <div className="bg-brand-500 p-2 rounded-lg">
          <BrainCircuit size={24} className="text-white" />
        </div>
        <h1 className="text-xl font-bold tracking-tight">MeetMind</h1>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive 
                  ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {item.icon}
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>
      
      <div className="p-6 text-xs text-slate-500 border-t border-slate-800">
        &copy; 2023 MeetMind Inc.
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="flex bg-slate-50 min-h-screen font-sans">
        <Sidebar />
        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/new" element={<NewMeeting />} />
            <Route path="/history" element={<MeetingHistory />} />
            <Route path="/meetings/:id" element={<MeetingAnalysis />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
