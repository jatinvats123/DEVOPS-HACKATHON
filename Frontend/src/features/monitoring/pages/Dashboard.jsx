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
import {
  RiPulseLine,
  RiDashboardLine,
  RiMacbookLine,
  RiAlertLine,
  RiNotification3Line,
  RiHeartPulseLine,
  RiTeamLine,
  RiSettings4Line,
  RiBankCardLine,
  RiStarLine,
  RiArrowDownSLine,
  RiAddLine,
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiMoreFill,
  RiComputerLine,
} from "@remixicon/react";

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
  Logo: () => <RiPulseLine className="w-5 h-5 text-indigo-600" />,
  Dashboard: () => <RiDashboardLine className="w-5 h-5" />,
  Monitors: () => <RiMacbookLine className="w-5 h-5" />,
  Incidents: () => <RiAlertLine className="w-5 h-5" />,
  Alerts: () => <RiNotification3Line className="w-5 h-5" />,
  Status: () => <RiHeartPulseLine className="w-5 h-5" />,
  Team: () => <RiTeamLine className="w-5 h-5" />,
  Settings: () => <RiSettings4Line className="w-5 h-5" />,
  Billing: () => <RiBankCardLine className="w-5 h-5" />,
  Star: () => <RiStarLine className="w-5 h-5" />,
  ChevronDown: () => <RiArrowDownSLine className="w-4 h-4" />,
  Plus: () => <RiAddLine className="w-4 h-4" />,
  Bell: () => <RiNotification3Line className="w-5 h-5" />,
  CheckCircle: () => <RiCheckboxCircleLine className="w-6 h-6" />,
  XCircle: () => <RiCloseCircleLine className="w-6 h-6" />,
  Activity: () => <RiPulseLine className="w-6 h-6" />,
  Dots: () => <RiMoreFill className="w-5 h-5" />,
  MonitorCard: () => <RiComputerLine className="w-6 h-6" />,
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

  const timeAgo = (dateString) => {
    if (!dateString) return "Just now";

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    const seconds = Math.floor((new Date() - date) / 1000);

    if (seconds < 60) return `${Math.max(0, seconds)} sec ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hrs ago`;
    const days = Math.floor(hours / 24);
    return `${days} days ago`;
  };

  const getBadgeStyle = (status) => {
    if (status === "UP") return "bg-emerald-100 text-emerald-700";
    if (status === "DOWN") return "bg-red-100 text-red-700";
    return "bg-orange-100 text-orange-700";
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
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
                  {timeAgo(m.lastChecked)}
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
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
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
  const { fetchMonitors, fetchIncidents, incidents, monitors } = useMonitors();

  useEffect(() => {
    fetchMonitors();
    fetchIncidents();
  }, [fetchMonitors, fetchIncidents]);

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
