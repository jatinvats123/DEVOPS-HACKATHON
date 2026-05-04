import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { useMonitors } from "../hooks/useMonitor";
import { selectMonitors, selectLoading } from "../state/monitor.slice";
import { getAllIncidents } from "../services/incident.api";
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

// ─── SAMPLE DATA & ICONS ───────────────────────────────────────────────────
const uptimeData = [
  { time: "May 12", val: 99.5 },
  { time: "May 13", val: 99.2 },
  { time: "May 14", val: 97.8 },
  { time: "May 15", val: 98.0 },
  { time: "May 16", val: 99.3 },
  { time: "May 17", val: 99.5 },
  { time: "May 18", val: 99.7 },
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
        sub={`Total managed assets`}
        colorClass="text-indigo-600"
        icon={Icons.MonitorCard}
      />
      <Card
        title="Up Monitors"
        value={stats.up}
        sub={`${stats.total > 0 ? ((stats.up / stats.total) * 100).toFixed(1) : 0}% of total`}
        colorClass="text-emerald-500"
        icon={Icons.CheckCircle}
      />
      <Card
        title="Down Monitors"
        value={stats.down}
        sub={`${stats.total > 0 ? ((stats.down / stats.total) * 100).toFixed(1) : 0}% requiring attention`}
        colorClass="text-red-500"
        icon={Icons.XCircle}
      />
      <Card
        title="Avg. Uptime"
        value={stats.uptime}
        sub="Overall health score"
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

const StatusDistribution = ({ monitors = [] }) => {
  const up = monitors.filter(
    (m) => (m.status || "").toUpperCase() === "UP",
  ).length;
  const down = monitors.filter(
    (m) => (m.status || "").toUpperCase() === "DOWN",
  ).length;
  const paused = monitors.filter(
    (m) => (m.status || "").toUpperCase() === "PAUSED",
  ).length;
  const total = monitors.length || 1;
  const uptimePct = ((up / total) * 100).toFixed(0);

  const dynamicPieData = [
    { name: "Up", value: up, fill: "#22c55e" },
    { name: "Down", value: down, fill: "#ef4444" },
    { name: "Paused", value: paused, fill: "#9ca3af" },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col min-h-[350px]">
      <h2 className="text-[15px] font-semibold text-gray-900 tracking-tight mb-2">
        Status Distribution
      </h2>
      <div className="flex-1 relative flex items-center justify-center ">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={dynamicPieData}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
            >
              {dynamicPieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold text-gray-900">{uptimePct}%</span>
          <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
            Uptime
          </span>
        </div>
      </div>
      <div className="flex justify-center gap-5 mt-4">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <span className="text-xs text-gray-500">Up ({up})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
          <span className="text-xs text-gray-500">Down ({down})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-gray-400"></span>
          <span className="text-xs text-gray-500">Paused ({paused})</span>
        </div>
      </div>
    </div>
  );
};

const AllMonitors = ({ monitors = [] }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const validMonitors = monitors || [];
  const totalPages = Math.ceil(validMonitors.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedMonitors = validMonitors.slice(
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
          {Math.min(startIndex + itemsPerPage, validMonitors.length)} of{" "}
          {validMonitors.length} monitors
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

const RecentIncidents = ({ incidents = [] }) => {
  if (incidents.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-[15px] font-semibold text-gray-900 tracking-tight mb-4">
          Recent Incidents
        </h2>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Icons.CheckCircle className="w-8 h-8 text-emerald-500 mb-2 opacity-20" />
          <p className="text-sm text-gray-500">No recent incidents</p>
          <p className="text-[11px] text-gray-400">
            Your systems are running smoothly
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-[15px] font-semibold text-gray-900 tracking-tight">
          Recent Incidents
        </h2>
        <Link
          to="/incidents"
          className="text-[12px] font-medium text-indigo-600 hover:text-indigo-700"
        >
          View All
        </Link>
      </div>
      <div className="flex flex-col gap-4">
        {incidents.slice(0, 3).map((inc) => (
          <div
            key={inc._id || inc.id}
            className="border border-gray-100 rounded-lg p-4 shadow-sm hover:border-gray-200 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <h4 className="text-[13px] font-semibold text-gray-900 truncate">
                {inc.monitorTitle || inc.name || "Unknown Monitor"}
              </h4>
              <span
                className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide shrink-0 ${inc.status === "ONGOING" || inc.status === "OPEN" ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}
              >
                {inc.status}
              </span>
            </div>
            <p className="text-[12px] text-gray-500 mb-3">
              {new Date(inc.createdAt || inc.date).toLocaleString()}
            </p>
            <Link
              to={`/incidents/${inc._id}`}
              className="block w-full py-1.5 border border-gray-200 rounded text-[12px] text-center font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              View Incident
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── MAIN DASHBOARD COMPONENT ───────────────────────────────────────────────

const Dashboard = () => {
  const [incidents, setIncidents] = useState([]);
  const monitorsData = useSelector(selectMonitors);
  const monitors = monitorsData || [];
  const loading = useSelector(selectLoading);
  const { handleGetMonitors } = useMonitors();

  useEffect(() => {
    handleGetMonitors();

    const fetchIncidents = async () => {
      try {
        const res = await getAllIncidents();
        if (res && res.data) {
          setIncidents(res.data);
        }
      } catch (err) {
        console.error("Failed to fetch incidents:", err);
      }
    };

    fetchIncidents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const up = monitors.filter((m) => {
    const s = (m.status || "").toUpperCase();
    return s === "UP" || s === "HEALTHY";
  }).length;

  const down = monitors.filter((m) => {
    const s = (m.status || "").toUpperCase();
    return s === "DOWN" || s === "FAILING";
  }).length;

  const stats = {
    total: monitors.length,
    up,
    down,
    uptime:
      monitors.length > 0
        ? `${((up / monitors.length) * 100).toFixed(2)}%`
        : "100%",
  };

  return (
    <main className="flex-1 overflow-y-auto p-8">
      <StatsCards stats={stats} />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* LEFT SIDE (8 columns) */}
        <div className="xl:col-span-8 flex flex-col gap-6">
          <UptimeOverview />
          <div className="relative">
            {loading && monitors.length === 0 && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            )}
            <AllMonitors monitors={monitors} />
          </div>
        </div>

        {/* RIGHT SIDE (4 columns) */}
        <div className="xl:col-span-4 flex flex-col gap-6">
          {/* Quick Navigation Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-[15px] font-semibold text-gray-900 tracking-tight mb-4">
              Quick Navigation
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <Link
                to="/monitors"
                className="flex items-center gap-2 p-3 rounded-lg border border-gray-50 bg-gray-50/50 hover:bg-indigo-50 hover:border-indigo-100 transition-all group"
              >
                <Icons.Monitors />
                <span className="text-xs font-medium text-gray-700 group-hover:text-indigo-700">
                  Monitors
                </span>
              </Link>
              <Link
                to="/incidents"
                className="flex items-center gap-2 p-3 rounded-lg border border-gray-50 bg-gray-50/50 hover:bg-indigo-50 hover:border-indigo-100 transition-all group"
              >
                <Icons.Incidents />
                <span className="text-xs font-medium text-gray-700 group-hover:text-indigo-700">
                  Incidents
                </span>
              </Link>
              <Link
                to="/alerts"
                className="flex items-center gap-2 p-3 rounded-lg border border-gray-50 bg-gray-50/50 hover:bg-indigo-50 hover:border-indigo-100 transition-all group"
              >
                <Icons.Alerts />
                <span className="text-xs font-medium text-gray-700 group-hover:text-indigo-700">
                  Alerts
                </span>
              </Link>
              <Link
                to="/status-pages"
                className="flex items-center gap-2 p-3 rounded-lg border border-gray-50 bg-gray-50/50 hover:bg-indigo-50 hover:border-indigo-100 transition-all group"
              >
                <Icons.Status />
                <span className="text-xs font-medium text-gray-700 group-hover:text-indigo-700">
                  Status
                </span>
              </Link>
              <Link to="/team" className="flex items-center gap-2 p-3 rounded-lg border border-gray-50 bg-gray-50/50 hover:bg-indigo-50 hover:border-indigo-100 transition-all group">
                <Icons.Team />
                <span className="text-xs font-medium text-gray-700 group-hover:text-indigo-700">Team</span>
              </Link>
              <Link to="/settings" className="flex items-center gap-2 p-3 rounded-lg border border-gray-50 bg-gray-50/50 hover:bg-indigo-50 hover:border-indigo-100 transition-all group">
                <Icons.Settings />
                <span className="text-xs font-medium text-gray-700 group-hover:text-indigo-700">
                  Settings
                </span>
              </Link>
            </div>
          </div>

          <StatusDistribution monitors={monitors} />
          <RecentIncidents incidents={incidents} />
        </div>
      </div>
    </main>
  );
};

export default Dashboard;
