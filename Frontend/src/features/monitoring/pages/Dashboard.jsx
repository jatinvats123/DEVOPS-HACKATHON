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
  <div className="bg-white border border-gray-100 p-6 lg:p-8 transition-all duration-300 hover:border-black group h-full">
    <div className="flex justify-between items-start">
      <div>
        <h3 className="luxury-label mb-4">{title}</h3>
        <span className="text-3xl lg:text-4xl luxury-heading">
          {value}
        </span>
        {sub && (
          <p className="luxury-subtext mt-4">{sub}</p>
        )}
      </div>
      <div className="w-10 h-10 flex items-center justify-center text-gray-300 group-hover:text-black transition-colors shrink-0">
        <Icon />
      </div>
    </div>
  </div>
);

const StatsCards = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-0 border-t border-l border-gray-100 mb-8 lg:mb-12">
      <div className="border-r border-b border-gray-100">
        <Card
          title="Total Assets"
          value={stats.total}
          sub="Managed Infrastructure"
          icon={Icons.MonitorCard}
        />
      </div>
      <div className="border-r border-b border-gray-100">
        <Card
          title="Active Status"
          value={stats.up}
          sub={`${stats.total > 0 ? ((stats.up / stats.total) * 100).toFixed(1) : 0}% Uptime`}
          icon={Icons.CheckCircle}
        />
      </div>
      <div className="border-r border-b border-gray-100">
        <Card
          title="Attention Required"
          value={stats.down}
          sub="Service Outages"
          icon={Icons.XCircle}
        />
      </div>
      <div className="border-r border-b border-gray-100">
        <Card
          title="Global Health"
          value={stats.uptime}
          sub="Average Performance"
          icon={Icons.Activity}
        />
      </div>
    </div>
  );
};

const UptimeOverview = () => {
  return (
    <div className="bg-white border border-[#e6dfd8] p-6 lg:p-8 rounded-xl shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 lg:mb-10 gap-4">
        <h2 className="luxury-heading text-xl">
          Performance History
        </h2>
        <select className="luxury-label bg-transparent border border-[#e6dfd8] rounded-md px-2 py-1 outline-none cursor-pointer">
          <option>Last 7 Days</option>
          <option>Last 30 Days</option>
        </select>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={uptimeData}
            margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="0"
              vertical={false}
              stroke="#e6dfd8"
            />
            <XAxis
              dataKey="time"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#6c6a64", fontSize: 11, fontFamily: 'Inter' }}
              dy={15}
            />
            <YAxis
              domain={["dataMin - 1", 100]}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#6c6a64", fontSize: 11, fontFamily: 'Inter' }}
              tickFormatter={(val) => `${val}%`}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid #e6dfd8",
                boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                fontFamily: 'Inter',
                fontSize: '12px',
                backgroundColor: '#fff'
              }}
            />
            <Area
              type="monotone"
              dataKey="val"
              stroke="#cc785c"
              strokeWidth={2}
              fillOpacity={0.1}
              fill="#cc785c"
              activeDot={{ r: 5, fill: '#cc785c', strokeWidth: 0 }}
              dot={false}
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
    { name: "Up", value: up, fill: "#cc785c" },
    { name: "Down", value: down, fill: "#3d3d3a" },
    { name: "Paused", value: paused, fill: "#e6dfd8" },
  ];

  return (
    <div className="bg-white border border-[#e6dfd8] p-6 lg:p-8 rounded-xl shadow-sm flex flex-col min-h-[400px]">
      <h2 className="luxury-heading text-xl mb-10">
        Asset Distribution
      </h2>
      <div className="flex-1 relative flex items-center justify-center ">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={dynamicPieData}
              cx="50%"
              cy="50%"
              innerRadius={80}
              outerRadius={100}
              paddingAngle={4}
              dataKey="value"
              stroke="none"
              cornerRadius={4}
            >
              {dynamicPieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-4xl luxury-heading text-[#cc785c]">{uptimePct}%</span>
          <span className="luxury-label mt-1">
            Uptime
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-4 mt-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#cc785c]"></div>
            <span className="luxury-label">Operational</span>
          </div>
          <span className="text-sm font-medium">{up}</span>
        </div>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#3d3d3a]"></div>
            <span className="luxury-label">Critical</span>
          </div>
          <span className="text-sm font-medium">{down}</span>
        </div>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#e6dfd8]"></div>
            <span className="luxury-label">Inactive</span>
          </div>
          <span className="text-sm font-medium">{paused}</span>
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
    if (seconds < 60) return `${Math.max(0, seconds)}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="bg-white border border-gray-100 p-6 lg:p-8">
      <div className="flex items-center justify-between mb-8">
        <h2 className="luxury-heading text-base">
          System Registry
        </h2>
      </div>

      <div className="overflow-x-auto -mx-6 lg:mx-0">
        <div className="inline-block min-w-full align-middle px-6 lg:px-0">
          <table className="luxury-table">
            <thead>
              <tr>
                <th>Asset Name</th>
                <th>Status</th>
                <th className="hidden md:table-cell">Type</th>
                <th className="hidden lg:table-cell">Last Checked</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paginatedMonitors.map((m, i) => (
                <tr key={m._id || i}>
                  <td>
                    <p className="font-medium text-black truncate max-w-[150px] sm:max-w-xs">{m.title}</p>
                    <p className="text-[11px] text-gray-400 mt-1 uppercase tracking-wider truncate max-w-[150px] sm:max-w-xs">{m.url}</p>
                  </td>
                  <td>
                    <span className={`text-[10px] font-bold tracking-widest uppercase ${m.status === 'UP' ? 'text-black' : 'text-gray-400'}`}>
                      {m.status}
                    </span>
                  </td>
                  <td className="text-[12px] font-light uppercase tracking-tight hidden md:table-cell">
                    {m.type || "Website"}
                  </td>
                  <td className="text-[12px] text-gray-400 hidden lg:table-cell">
                    {timeAgo(m.lastChecked)}
                  </td>
                  <td className="text-right">
                    <button className="text-gray-300 hover:text-black transition-colors">
                      <Icons.Dots />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-6">
        <span className="luxury-label">
          {startIndex + 1} — {Math.min(startIndex + itemsPerPage, validMonitors.length)} / {validMonitors.length}
        </span>
        <div className="flex items-center gap-8">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="luxury-label hover:text-black disabled:opacity-30 transition-colors"
          >
            Previous
          </button>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="luxury-label hover:text-black disabled:opacity-30 transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

const RecentIncidents = ({ incidents = [] }) => {
  if (incidents.length === 0) {
    return (
      <div className="bg-white border border-gray-100 p-6 lg:p-8">
        <h2 className="luxury-heading text-base mb-8">
          Incident Journal
        </h2>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="luxury-subtext">Record is clear</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-100 p-6 lg:p-8">
      <div className="flex items-center justify-between mb-8">
        <h2 className="luxury-heading text-base">
          Incident Journal
        </h2>
        <Link to="/incidents" className="luxury-label hover:text-black transition-colors">
          View All
        </Link>
      </div>
      <div className="flex flex-col gap-6">
        {incidents.slice(0, 3).map((inc) => (
          <div
            key={inc._id || inc.id}
            className="border-b border-gray-100 pb-6 last:border-0"
          >
            <div className="flex items-start justify-between mb-2">
              <h4 className="text-[13px] font-medium text-black">
                {inc.monitorTitle || inc.name || "Unknown Asset"}
              </h4>
              <span
                className={`luxury-label text-[9px] ${inc.status === "ONGOING" || inc.status === "OPEN" ? "text-black" : "text-gray-400"}`}
              >
                {inc.status}
              </span>
            </div>
            <p className="text-[11px] text-gray-400 mb-4 uppercase tracking-tight">
              {new Date(inc.createdAt || inc.date).toLocaleString()}
            </p>
            <Link
              to={`/incidents/${inc._id}`}
              className="luxury-button-outline w-full py-2 text-[10px] text-center block"
            >
              Details
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
    <main className="flex-1 overflow-y-auto p-6 lg:p-12 luxury-container">
      <StatsCards stats={stats} />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 lg:gap-12">
        {/* LEFT SIDE (8 columns) */}
        <div className="xl:col-span-8 flex flex-col gap-8 lg:gap-12">
          <UptimeOverview />
          <div className="relative">
            {loading && monitors.length === 0 && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
              </div>
            )}
            <AllMonitors monitors={monitors} />
          </div>
        </div>

        {/* RIGHT SIDE (4 columns) */}
        <div className="xl:col-span-4 flex flex-col gap-8 lg:gap-12">
          {/* Quick Navigation Section */}
          <div className="bg-white border border-gray-100 p-6 lg:p-8">
            <h2 className="luxury-heading text-base mb-8">
              Quick Links
            </h2>
            <div className="grid grid-cols-1 gap-2">
              <Link to="/monitors" className="luxury-sidebar-item border border-gray-50 flex items-center gap-4 hover:border-black transition-all !m-0">
                <Icons.Monitors />
                <span>Monitors</span>
              </Link>
              <Link to="/incidents" className="luxury-sidebar-item border border-gray-50 flex items-center gap-4 hover:border-black transition-all !m-0">
                <Icons.Incidents />
                <span>Incidents</span>
              </Link>
              <Link to="/alerts" className="luxury-sidebar-item border border-gray-50 flex items-center gap-4 hover:border-black transition-all !m-0">
                <Icons.Alerts />
                <span>Alerts</span>
              </Link>
              <Link to="/status-pages" className="luxury-sidebar-item border border-gray-50 flex items-center gap-4 hover:border-black transition-all !m-0">
                <Icons.Status />
                <span>Status</span>
              </Link>
              <Link to="/settings" className="luxury-sidebar-item border border-gray-50 flex items-center gap-4 hover:border-black transition-all !m-0">
                <Icons.Settings />
                <span>Settings</span>
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
