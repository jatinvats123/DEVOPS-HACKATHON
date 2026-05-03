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
} from "recharts";

// ─── DUMMY DATA & ICONS ─────────────────────────────────────────────────────

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
  {
    id: 1,
    name: "api.payment-gateway.com",
    date: "May 18, 2024 10:24 AM",
    status: "ONGOING",
  },
  {
    id: 2,
    name: "store.example.com",
    date: "May 17, 2024 08:15 PM",
    status: "RESOLVED",
  },
  {
    id: 3,
    name: "api.user-service.com",
    date: "May 16, 2024 11:02 AM",
    status: "RESOLVED",
  },
];

const Icons = {
  Logo: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-5 h-5 text-indigo-600"
    >
      <path d="M19.5 3h-15C3.12 3 2 4.12 2 5.5v13C2 19.88 3.12 21 4.5 21h15c1.38 0 2.5-1.12 2.5-2.5v-13C22 4.12 20.88 3 19.5 3zM13 18v-4h-2v4H8l4-5 4 5h-3zm3-7l-4-5-4 5h3v4h2v-4h3z" />
    </svg>
  ),
  Dashboard: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
      />
    </svg>
  ),
  Monitors: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  Incidents: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  ),
  Alerts: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      />
    </svg>
  ),
  Status: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V15a2 2 0 01-2 2z"
      />
    </svg>
  ),
  Team: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
      />
    </svg>
  ),
  Settings: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  ),
  Billing: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
      />
    </svg>
  ),
  Star: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-5 h-5"
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
  ),
  ChevronDown: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 9l-7 7-7-7"
      />
    </svg>
  ),
  Plus: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 4v16m8-8H4"
      />
    </svg>
  ),
  Bell: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      />
    </svg>
  ),
  CheckCircle: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-6 h-6"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  XCircle: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-6 h-6"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  Activity: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-6 h-6"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 10V3L4 14h7v7l9-11h-7z"
      />
    </svg>
  ),
  Dots: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"
      />
    </svg>
  ),
  MonitorCard: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-6 h-6"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  ),
};

// ─── INTERNAL COMPONENTS ────────────────────────────────────────────────────

const Sidebar = () => {
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
    <aside className="w-[240px] bg-gradient-to-b from-blue-900 to-indigo-900 text-gray-300 flex-shrink-0 h-screen hidden lg:flex flex-col">
      <div className="p-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-white p-1.5 rounded-lg shadow-sm">
            <Icons.Logo />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg tracking-tight leading-tight">
              UptimeAI
            </h1>
            <p className="text-[10px] text-gray-300 font-medium tracking-wide">
              Website Monitoring Platform
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <a
            key={item.name}
            href="#"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
              item.active
                ? "bg-white/10 text-white shadow-sm"
                : "text-gray-300 hover:bg-white/5 hover:text-white"
            }`}
          >
            <item.icon />
            {item.name}
          </a>
        ))}
      </nav>

      <div className="px-4 pb-4">
        <div className="bg-black/20 p-4 rounded-xl border border-white/10 shadow-inner">
          <div className="flex items-center gap-2 text-white font-semibold text-sm mb-2">
            <Icons.Star /> Upgrade to Pro
          </div>
          <p className="text-[11px] text-gray-300 mb-4 leading-relaxed">
            Get advanced monitoring, multi-location checks, and more.
          </p>
          <button className="w-full bg-indigo-500 text-white text-[13px] font-medium py-2 rounded-lg hover:bg-indigo-600 transition-colors shadow-sm">
            Upgrade Now
          </button>
        </div>
      </div>

      <div className="p-4 border-t border-white/10 hover:bg-white/5 transition-colors cursor-pointer">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-indigo-500 flex items-center justify-center text-white font-semibold text-sm shadow-inner">
              AD
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white leading-tight truncate">
                Arjun Dev
              </p>
              <p className="text-xs text-gray-300 truncate">
                arjun@example.com
              </p>
            </div>
          </div>
          <Icons.ChevronDown />
        </div>
      </div>
    </aside>
  );
};

const Navbar = () => {
  return (
    <header className="px-8 py-5 flex items-center justify-between bg-white border-b border-gray-100 z-10 shadow-sm shrink-0">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          Dashboard
        </h1>
        <p className="text-[13px] text-gray-500 mt-1">
          Overview of all your website and API monitors.
        </p>
      </div>
      <div className="flex items-center gap-5">
        <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm">
          <Icons.Plus /> Add Monitor
        </button>
        <button className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors border border-gray-200">
          <Icons.Bell />
          <span className="absolute top-0 right-0 -mt-1 -mr-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
            3
          </span>
        </button>
        <div className="w-9 h-9 rounded-full bg-gray-200 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center text-gray-600 text-sm font-bold">
          AD
        </div>
      </div>
    </header>
  );
};

const Card = ({ title, value, sub, colorClass, icon: Icon }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 transition-transform hover:-translate-y-0.5 duration-200">
    <div className="flex justify-between items-start">
      <div>
        <h3 className="text-sm font-medium text-gray-500 mb-2">{title}</h3>
        <span className="text-3xl font-bold text-gray-900 tracking-tight">
          {value}
        </span>
        {sub && (
          <p className={`text-[12px] font-medium mt-2 ${colorClass}`}>{sub}</p>
        )}
      </div>
      <div
        className={`w-12 h-12 rounded-full flex items-center justify-center bg-gray-50 ${colorClass}`}
      >
        <Icon />
      </div>
    </div>
  </div>
);

const StatsCards = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
      <Card
        title="Total Monitors"
        value={stats.total}
        sub="▲ 2 this month"
        colorClass="text-indigo-600"
        icon={Icons.MonitorCard}
      />
      <Card
        title="Up Monitors"
        value={stats.up}
        sub="75%"
        colorClass="text-emerald-500"
        icon={Icons.CheckCircle}
      />
      <Card
        title="Down Monitors"
        value={stats.down}
        sub="16.7%"
        colorClass="text-red-500"
        icon={Icons.XCircle}
      />
      <Card
        title="Avg. Uptime"
        value={stats.uptime}
        sub="▲ 1.2% this month"
        colorClass="text-emerald-500"
        icon={Icons.Activity}
      />
    </div>
  );
};

const UptimeOverview = () => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 min-h-[350px]">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[15px] font-semibold text-gray-900 tracking-tight">
          Uptime Overview
        </h2>
        <select className="text-xs border border-gray-200 rounded-md px-2 py-1.5 text-gray-600 outline-none hover:bg-gray-50 cursor-pointer">
          <option>Last 7 Days</option>
          <option>Last 30 Days</option>
        </select>
      </div>
      <div className="h-64 w-full -ml-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={uptimeData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorUptime" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#f1f5f9"
            />
            <XAxis
              dataKey="time"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#64748b", fontSize: 11 }}
              dy={10}
            />
            <YAxis
              domain={["dataMin - 1", 100]}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#64748b", fontSize: 11 }}
              tickFormatter={(val) => `${val}%`}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "8px",
                border: "none",
                boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
              }}
            />
            <Area
              type="monotone"
              dataKey="val"
              stroke="#4f46e5"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorUptime)"
              activeDot={{ r: 5, strokeWidth: 0 }}
              dot={{ r: 3, fill: "#4f46e5", strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const StatusDistribution = () => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col min-h-[350px]">
      <h2 className="text-[15px] font-semibold text-gray-900 tracking-tight mb-2">
        Status Distribution
      </h2>
      <div className="flex-1 relative flex items-center justify-center ">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={90}
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
          <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
            Uptime
          </span>
        </div>
      </div>
      <div className="flex justify-center gap-5 mt-4">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <span className="text-xs text-gray-500">Up (9)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
          <span className="text-xs text-gray-500">Down (2)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-gray-400"></span>
          <span className="text-xs text-gray-500">Paused (1)</span>
        </div>
      </div>
    </div>
  );
};

const AllMonitors = ({ monitors }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const totalPages = Math.ceil(monitors.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedMonitors = monitors.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  const getBadgeStyle = (status) => {
    if (status === "UP") return "bg-emerald-100 text-emerald-700";
    if (status === "DOWN") return "bg-red-100 text-red-700";
    return "bg-orange-100 text-orange-700";
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 min-h-[512px]">
      <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-gray-900 tracking-tight">
          All Monitors
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              <th className="px-6 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                Monitor Name
              </th>
              <th className="px-6 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                Status
              </th>
              <th className="px-6 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                Type
              </th>
              <th className="px-6 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                Last Checked
              </th>
              <th className="px-6 py-3.5 border-b border-gray-100"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {paginatedMonitors.map((m, i) => (
              <tr
                key={m._id || i}
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="px-6 py-4">
                  <p className="text-[13px] font-semibold text-gray-900">
                    {m.title}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{m.url}</p>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${getBadgeStyle(m.status)}`}
                  >
                    {m.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-[13px] text-gray-600">
                  {m.type || "Website"}
                </td>
                <td className="px-6 py-4 text-[13px] text-gray-500">
                  {m.lastChecked || "Just now"}
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-gray-400 hover:text-gray-700 transition-colors">
                    <Icons.Dots />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
        <span className="text-xs text-gray-500">
          Showing {startIndex + 1} to{" "}
          {Math.min(startIndex + itemsPerPage, monitors.length)} of{" "}
          {monitors.length} monitors
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 rounded border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 text-xs font-medium"
          >
            ← Previous
          </button>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 rounded border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 text-xs font-medium"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
};

const RecentIncidents = () => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 min-h-[500px]">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[15px] font-semibold text-gray-900 tracking-tight">
          Recent Incidents
        </h2>
        <button className="text-[12px] font-medium text-indigo-600 hover:text-indigo-700">
          View All
        </button>
      </div>
      <div className="flex flex-col gap-4 ">
        {mockIncidents.map((inc) => (
          <div
            key={inc.id}
            className="border h-35 border-gray-100 rounded-lg p-4 shadow-sm hover:border-gray-200 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <h4 className="text-[13px] font-semibold text-gray-900 truncate">
                {inc.name}
              </h4>
              <span
                className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide shrink-0 ${inc.status === "ONGOING" ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}
              >
                {inc.status}
              </span>
            </div>
            <p className="text-[12px] text-gray-500 mb-3">{inc.date}</p>
            <button className="w-full py-1.5 border border-gray-200 rounded text-[12px] font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              View Incident
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── MAIN DASHBOARD COMPONENT ───────────────────────────────────────────────

const Dashboard = () => {
  const { fetchMonitors, monitors } = useMonitors();

  useEffect(() => {
    fetchMonitors();
  }, [fetchMonitors]);

  const safeMonitors =
    Array.isArray(monitors) && monitors.length > 0
      ? monitors
      : [
          {
            _id: "1",
            title: "Payment API",
            url: "https://api.payment-gateway.com",
            type: "API",
            status: "DOWN",
            lastChecked: "10s ago",
          },
          {
            _id: "2",
            title: "Main Website",
            url: "https://example.com",
            type: "Website",
            status: "UP",
            lastChecked: "30s ago",
          },
          {
            _id: "3",
            title: "Storefront",
            url: "https://store.example.com",
            type: "Website",
            status: "DEGRADED",
            lastChecked: "20s ago",
          },
          {
            _id: "4",
            title: "User Service",
            url: "https://api.user-service.com",
            type: "API",
            status: "UP",
            lastChecked: "15s ago",
          },
          {
            _id: "5",
            title: "Blog",
            url: "https://blog.example.com",
            type: "Website",
            status: "UP",
            lastChecked: "25s ago",
          },
          {
            _id: "6",
            title: "Auth Service",
            url: "https://auth.example.com",
            type: "API",
            status: "UP",
            lastChecked: "1m ago",
          },
        ];

  const stats = {
    total: safeMonitors.length,
    up: safeMonitors.filter((m) => m.status === "UP").length,
    down: safeMonitors.filter((m) => m.status === "DOWN").length,
    uptime: "99.42%",
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-8">
          <StatsCards stats={stats} />

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            {/* LEFT SIDE (8 columns) */}
            <div className="xl:col-span-8 flex flex-col gap-6">
              <UptimeOverview />
              <AllMonitors monitors={safeMonitors} />
            </div>

            {/* RIGHT SIDE (4 columns) */}
            <div className="xl:col-span-4 flex flex-col gap-6">
              <StatusDistribution />
              <RecentIncidents />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
