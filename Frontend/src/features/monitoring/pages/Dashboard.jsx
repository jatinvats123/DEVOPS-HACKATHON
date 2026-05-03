import React, { useState, useEffect } from "react";
import { useMonitors } from "../hooks/useMonitor";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

// ─── Dummy Data for Charts ──────────────────────────────────────────────────
const uptimeData = [
  { time: "May 12", val: 99.5 },
  { time: "May 13", val: 99.2 },
  { time: "May 14", val: 97.8 },
  { time: "May 15", val: 98.0 },
  { time: "May 16", val: 99.3 },
  { time: "May 17", val: 99.5 },
  { time: "May 18", val: 99.7 },
];

const pieData = [
  { name: "Up", value: 9, fill: "#22c55e" },
  { name: "Down", value: 2, fill: "#ef4444" },
  { name: "Paused", value: 1, fill: "#9ca3af" },
];

const mockIncidents = [
  { id: 1, name: "api.payment-gateway.com", date: "May 18, 2024 10:24 AM - Ongoing", duration: "24m 15s", status: "DOWN" },
  { id: 2, name: "store.example.com", date: "May 17, 2024 08:15 PM - 08:32 PM", duration: "17m", status: "DEGRADED" },
  { id: 3, name: "api.user-service.com", date: "May 16, 2024 11:02 AM - 11:18 AM", duration: "16m", status: "DOWN" },
];

const mockAlerts = [
  { id: 1, text: "api.payment-gateway.com is DOWN", sub: "Monitor is not responding", time: "10:24 AM", type: "down" },
  { id: 2, text: "api.user-service.com is UP", sub: "Monitor is back online", time: "11:18 AM", type: "up" },
  { id: 3, text: "High response time on store.example.com", sub: "Response time is above 1s", time: "08:20 PM", type: "warn" },
];

// ─── Icons ──────────────────────────────────────────────────────────────────
const Icons = {
  Logo: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-indigo-600">
      <path d="M19.5 3h-15C3.12 3 2 4.12 2 5.5v13C2 19.88 3.12 21 4.5 21h15c1.38 0 2.5-1.12 2.5-2.5v-13C22 4.12 20.88 3 19.5 3zM13 18v-4h-2v4H8l4-5 4 5h-3zm3-7l-4-5-4 5h3v4h2v-4h3z" />
    </svg>
  ),
  Dashboard: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>,
  Monitors: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Incidents: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
  Alerts: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>,
  Status: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V15a2 2 0 01-2 2z" /></svg>,
  Team: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
  Settings: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  Billing: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>,
  Star: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>,
  ChevronDown: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>,
  ChevronLeft: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>,
  ChevronRight: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>,
  Plus: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>,
  Bell: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>,
  MonitorCard: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
  CheckCard: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  DownCard: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13l-3 3m0 0l-3-3m3 3V8m0 13a9 9 0 110-18 9 9 0 010 18z" /></svg>,
  ActivityCard: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
  Search: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
  Dots: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" /></svg>,
  ArrowDown: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>,
  ArrowUp: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>,
  Warning: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
};

// ─── Main Components ────────────────────────────────────────────────────────

function Sidebar() {
  const menuItems = [
    { name: "Dashboard", icon: Icons.Dashboard, active: true },
    { name: "Monitors", icon: Icons.Monitors },
    { name: "Incidents", icon: Icons.Incidents },
    { name: "Alerts", icon: Icons.Alerts },
    { name: "Status Pages", icon: Icons.Status },
    { name: "Team", icon: Icons.Team },
    { name: "Settings", icon: Icons.Settings },
    { name: "Billing", icon: Icons.Billing },
  ];

  return (
    <aside className="w-[260px] bg-[#1a1d2d] text-gray-300 flex-shrink-0 h-screen hidden lg:flex flex-col">
      {/* Logo Area */}
      <div className="p-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-white p-1.5 rounded-lg shadow-sm">
             <Icons.Logo />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg tracking-tight leading-tight">UptimeAI</h1>
            <p className="text-[10px] text-gray-400 font-medium tracking-wide uppercase">Website Monitoring Platform</p>
          </div>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => (
          <a
            key={item.name}
            href="#"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
              item.active
                ? "bg-indigo-600 text-white shadow-[0_0_12px_rgba(79,70,229,0.4)]"
                : "text-gray-400 hover:bg-[#25283b] hover:text-white"
            }`}
          >
            <item.icon />
            {item.name}
          </a>
        ))}
      </nav>

      {/* Upgrade to Pro */}
      <div className="px-4 pb-4">
        <div className="bg-[#25283b] p-4 rounded-xl border border-gray-700/30 shadow-inner">
           <div className="flex items-center gap-2 text-white font-semibold text-sm mb-2">
             <Icons.Star /> Upgrade to Pro
           </div>
           <p className="text-[11px] text-gray-400 mb-4 leading-relaxed">
             Get advanced monitoring, multi-location checks, and more.
           </p>
           <button className="w-full bg-indigo-600 text-white text-[13px] font-medium py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
             Upgrade Now
           </button>
        </div>
      </div>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-700/50 hover:bg-[#25283b] transition-colors cursor-pointer">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gray-600 flex items-center justify-center text-white font-semibold text-sm shadow-inner">
              AD
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white leading-tight truncate">Arjun Dev</p>
              <p className="text-xs text-gray-400 truncate">arjun@example.com</p>
            </div>
          </div>
          <Icons.ChevronDown />
        </div>
      </div>
    </aside>
  );
}

function StatCard({ title, value, subValue, trend, trendColor, icon: Icon, iconBg, iconColor }) {
  return (
    <div className="bg-white rounded-xl shadow-[0_2px_8px_rgb(0,0,0,0.04)] border border-gray-100 p-5 transition-transform hover:-translate-y-0.5 duration-200">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-2">{title}</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900 tracking-tight">{value}</span>
          </div>
          {trend && <p className={`text-[11px] font-semibold mt-2 ${trendColor}`}>{trend}</p>}
          {subValue && <p className={`text-[11px] font-semibold mt-2 ${trendColor}`}>{subValue}</p>}
        </div>
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${iconBg} ${iconColor}`}>
          <Icon />
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ─────────────────────────────────────────────────────────

const Dashboard = () => {
  const { fetchMonitors, monitors, loading } = useMonitors();
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    fetchMonitors();
  }, [fetchMonitors]);

  const safeMonitors = Array.isArray(monitors) && monitors.length > 0 
    ? monitors 
    : [
        // Fallback dummy data closely matching the design if Redux is empty
        { _id: '1', title: 'https://example.com', type: 'Website', status: 'UP', responseTime: '321 ms', uptime: '99.98%', lastChecked: '30s ago' },
        { _id: '2', title: 'https://api.example.com', type: 'API', status: 'UP', responseTime: '245 ms', uptime: '100%', lastChecked: '15s ago' },
        { _id: '3', title: 'https://store.example.com', type: 'Website', status: 'DEGRADED', responseTime: '1.2 s', uptime: '98.45%', lastChecked: '20s ago' },
        { _id: '4', title: 'https://api.payment-gateway.com', type: 'API', status: 'DOWN', responseTime: '-', uptime: '95.12%', lastChecked: '10s ago' },
        { _id: '5', title: 'https://blog.example.com', type: 'Website', status: 'UP', responseTime: '412 ms', uptime: '99.91%', lastChecked: '25s ago' },
      ];

  const totalMonitors = safeMonitors.length;
  const totalPages = Math.ceil(totalMonitors / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedMonitors = safeMonitors.slice(startIndex, startIndex + itemsPerPage);

  const getStatusStyle = (status) => {
    if (status === 'UP') return 'bg-emerald-100 text-emerald-700';
    if (status === 'DOWN') return 'bg-red-100 text-red-700';
    return 'bg-orange-100 text-orange-700'; // DEGRADED
  };

  return (
    <div className="h-screen bg-[#f8fafc] flex font-sans overflow-hidden">
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="px-8 py-5 flex items-center justify-between bg-white border-b border-gray-100 z-10 shadow-[0_1px_2px_rgb(0,0,0,0.02)] shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
            <p className="text-[13px] text-gray-500 mt-1">Overview of all your website and API monitors.</p>
          </div>
          <div className="flex items-center gap-5">
            <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm shadow-indigo-200">
              <Icons.Plus /> Add Monitor
            </button>
            <button className="relative p-2.5 text-gray-500 hover:bg-gray-100 rounded-full transition-colors border border-gray-200">
              <Icons.Bell />
              <span className="absolute top-0 right-0 -mt-1 -mr-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">3</span>
            </button>
          </div>
        </header>

        {/* Main Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-8">
          
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
            <StatCard 
              title="Total Monitors" 
              value="12" 
              trend="▲ 2 this month" 
              trendColor="text-emerald-500"
              icon={Icons.MonitorCard} 
              iconBg="bg-indigo-50" 
              iconColor="text-indigo-600" 
            />
            <StatCard 
              title="Up Monitors" 
              value="9" 
              subValue="75%" 
              trendColor="text-emerald-500"
              icon={Icons.CheckCard} 
              iconBg="bg-emerald-50" 
              iconColor="text-emerald-500" 
            />
            <StatCard 
              title="Down Monitors" 
              value="2" 
              subValue="16.7%" 
              trendColor="text-red-500"
              icon={Icons.DownCard} 
              iconBg="bg-red-50" 
              iconColor="text-red-500" 
            />
            <StatCard 
              title="Avg. Uptime" 
              value="99.42%" 
              trend="▲ 1.2% this month" 
              trendColor="text-emerald-500"
              icon={Icons.ActivityCard} 
              iconBg="bg-indigo-50" 
              iconColor="text-indigo-600" 
            />
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            
            {/* LEFT COLUMN: Charts & Table */}
            <div className="xl:col-span-2 flex flex-col gap-6">
              
              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Uptime Overview Line Chart */}
                <div className="bg-white rounded-xl shadow-[0_2px_8px_rgb(0,0,0,0.04)] border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-[15px] font-semibold text-gray-900 tracking-tight">Uptime Overview</h2>
                    <select className="text-xs border border-gray-200 rounded-md px-2 py-1.5 text-gray-600 outline-none hover:bg-gray-50 cursor-pointer">
                      <option>Last 7 Days</option>
                      <option>Last 30 Days</option>
                    </select>
                  </div>
                  <div className="h-56 w-full -ml-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={uptimeData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorUptime" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} dy={10} />
                        <YAxis domain={['dataMin - 1', 100]} axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} tickFormatter={(val) => `${val}%`} />
                        <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}} />
                        <Area type="monotone" dataKey="val" stroke="#4f46e5" strokeWidth={2.5} fillOpacity={1} fill="url(#colorUptime)" activeDot={{ r: 5, strokeWidth: 0 }} dot={{ r: 3, fill: "#4f46e5", strokeWidth: 0 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Status Distribution Pie Chart */}
                <div className="bg-white rounded-xl shadow-[0_2px_8px_rgb(0,0,0,0.04)] border border-gray-100 p-6 flex flex-col">
                  <h2 className="text-[15px] font-semibold text-gray-900 tracking-tight mb-2">Status Distribution</h2>
                  <div className="flex-1 relative flex items-center justify-center min-h-[224px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={65}
                          outerRadius={85}
                          paddingAngle={2}
                          dataKey="value"
                          stroke="none"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                       <span className="text-2xl font-bold text-gray-900">75%</span>
                       <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Overall Uptime</span>
                    </div>
                  </div>
                  <div className="flex justify-center gap-5 mt-2">
                    <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span><span className="text-xs text-gray-500">Up (9)</span></div>
                    <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500"></span><span className="text-xs text-gray-500">Down (2)</span></div>
                    <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-gray-400"></span><span className="text-xs text-gray-500">Paused (1)</span></div>
                  </div>
                </div>
                
              </div>

              {/* Monitors Table */}
              <div className="bg-white rounded-xl shadow-[0_2px_8px_rgb(0,0,0,0.04)] border border-gray-100">
                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="text-[15px] font-semibold text-gray-900 tracking-tight">All Monitors</h2>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Icons.Search />
                    </div>
                    <input type="text" placeholder="Search monitors..." className="block w-56 pl-9 pr-3 py-1.5 border border-gray-200 rounded-md text-xs placeholder-gray-400 focus:outline-none focus:border-indigo-500" />
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr>
                        <th className="px-6 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">Monitor Name</th>
                        <th className="px-6 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">Status</th>
                        <th className="px-6 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">Response Time</th>
                        <th className="px-6 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">Uptime (7d)</th>
                        <th className="px-6 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">Last Checked</th>
                        <th className="px-6 py-3.5 border-b border-gray-100"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {paginatedMonitors.map((m) => (
                        <tr key={m._id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <p className="text-[13px] font-semibold text-gray-900">{m.title}</p>
                            <p className="text-[11px] text-gray-500 mt-0.5">{m.type || 'Website'}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${getStatusStyle(m.status)}`}>
                              {m.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-[13px] text-gray-600">{m.responseTime || '320 ms'}</td>
                          <td className="px-6 py-4 text-[13px] text-gray-600">{m.uptime || '99.9%'}</td>
                          <td className="px-6 py-4 text-[13px] text-gray-500">{m.lastChecked || 'Just now'}</td>
                          <td className="px-6 py-4 text-right">
                            <button className="text-gray-400 hover:text-gray-700 transition-colors"><Icons.Dots /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, totalMonitors)} of {totalMonitors} monitors
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50">
                      <Icons.ChevronLeft />
                    </button>
                    <button className="w-8 h-8 flex items-center justify-center rounded bg-indigo-600 text-white text-xs font-medium">1</button>
                    <button className="w-8 h-8 flex items-center justify-center rounded text-gray-500 hover:bg-gray-50 text-xs font-medium">2</button>
                    <button className="w-8 h-8 flex items-center justify-center rounded text-gray-500 hover:bg-gray-50 text-xs font-medium">3</button>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50">
                      <Icons.ChevronRight />
                    </button>
                  </div>
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: Incidents & Alerts */}
            <div className="flex flex-col gap-6">
              
              {/* Recent Incidents */}
              <div className="bg-white rounded-xl shadow-[0_2px_8px_rgb(0,0,0,0.04)] border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-[15px] font-semibold text-gray-900 tracking-tight">Recent Incidents</h2>
                  <button className="text-[13px] font-medium text-indigo-600 hover:text-indigo-700">View All</button>
                </div>
                
                <div className="flex flex-col gap-4">
                  {mockIncidents.map(inc => (
                    <div key={inc.id} className="border border-gray-100 rounded-lg p-4 shadow-[0_1px_3px_rgb(0,0,0,0.02)] hover:border-gray-200 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${inc.status === 'DOWN' ? 'bg-red-50 text-red-500' : 'bg-orange-50 text-orange-500'}`}>
                          {inc.status === 'DOWN' ? <Icons.ArrowDown /> : <Icons.Warning />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-[13px] font-semibold text-gray-900 truncate leading-tight">{inc.name}</h4>
                            <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider shrink-0 ${inc.status === 'DOWN' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                              {inc.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-500 mt-1.5">{inc.date}</p>
                          <p className="text-[11px] text-gray-500 mt-0.5">Duration: {inc.duration}</p>
                          <button className="mt-3.5 px-3 py-1.5 border border-gray-200 rounded text-[11px] font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                            View Incident
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Alerts */}
              <div className="bg-white rounded-xl shadow-[0_2px_8px_rgb(0,0,0,0.04)] border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-[15px] font-semibold text-gray-900 tracking-tight">Recent Alerts</h2>
                  <button className="text-[13px] font-medium text-indigo-600 hover:text-indigo-700">View All</button>
                </div>
                
                <div className="flex flex-col">
                  {mockAlerts.map(alert => (
                    <div key={alert.id} className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0 last:pb-0">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${alert.type === 'down' ? 'bg-red-50 text-red-500' : alert.type === 'up' ? 'bg-emerald-50 text-emerald-500' : 'bg-orange-50 text-orange-500'}`}>
                        {alert.type === 'down' ? <Icons.ArrowDown /> : alert.type === 'up' ? <Icons.ArrowUp /> : <Icons.Warning />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-gray-900 truncate">{alert.text}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">{alert.sub}</p>
                      </div>
                      <span className="text-[11px] text-gray-400 shrink-0">{alert.time}</span>
                    </div>
                  ))}
                </div>
                <button className="w-full mt-4 py-2 border border-gray-200 rounded-lg text-xs font-medium text-indigo-600 hover:bg-gray-50 transition-colors">
                  View All Alerts
                </button>
              </div>

            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
