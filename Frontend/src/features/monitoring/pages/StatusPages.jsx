import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectMonitors } from '../state/monitor.slice';
import { useMonitors } from '../hooks/useMonitor';
import { 
  RiHeartPulseLine, 
  RiAddLine, 
  RiGlobalLine, 
  RiSettings3Line, 
  RiExternalLinkLine, 
  RiDeleteBinLine,
  RiCheckDoubleLine,
  RiErrorWarningLine
} from '@remixicon/react';

const StatusPages = () => {
  const monitors = useSelector(selectMonitors);
  const { handleGetMonitors } = useMonitors();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await handleGetMonitors();
      setLoading(false);
    };
    init();
  }, []);

  const getStatusBadge = (monitorsList) => {
    const total = monitorsList.length;
    if (total === 0) return { label: 'Empty', color: 'bg-gray-100 text-gray-600' };
    
    const down = monitorsList.filter(m => m.status === 'DOWN').length;
    if (down === 0) return { label: 'All Systems Operational', color: 'bg-emerald-100 text-emerald-700' };
    if (down === total) return { label: 'Major Outage', color: 'bg-red-100 text-red-700' };
    return { label: 'Partial Outage', color: 'bg-orange-100 text-orange-700' };
  };

  const statusInfo = getStatusBadge(monitors);

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-gray-50">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <RiHeartPulseLine className="w-7 h-7 text-indigo-500" />
            Status Pages
          </h1>
          <p className="text-[13px] text-gray-500 mt-1">
            Manage your public-facing service health dashboards.
          </p>
        </div>
        <button
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
        >
          <RiAddLine className="w-4 h-4" /> Create Status Page
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-20 flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
            <p className="text-sm text-gray-500">Loading status pages...</p>
          </div>
        ) : monitors.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl border border-gray-100 p-12 text-center shadow-sm">
            <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <RiGlobalLine className="w-10 h-10 text-indigo-400 opacity-60" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">No status pages yet</h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto mb-8">
              Keep your users updated on your service status. Create a public page in seconds.
            </p>
            <button
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-all shadow-md active:scale-95"
            >
              <RiAddLine className="w-5 h-5" /> Build Your First Page
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden group hover:shadow-md transition-all duration-300">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                  <RiGlobalLine className="w-6 h-6" />
                </div>
                <span className={`px-2 py-1 ${statusInfo.color} text-[10px] font-bold rounded uppercase tracking-wider`}>
                  {statusInfo.label}
                </span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Global Status Page</h3>
              <p className="text-sm text-gray-500 mb-4 truncate">status.uptimeai.io/main</p>
              
              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between text-xs text-gray-500 pb-2 border-b border-gray-50">
                  <span>Monitors Attached</span>
                  <span className="font-semibold text-gray-900">{monitors.length}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 pb-2 border-b border-gray-50">
                  <span>Current Uptime</span>
                  <span className="font-semibold text-emerald-600">99.98%</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button className="flex-1 px-3 py-2 bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-100 transition-colors flex items-center justify-center gap-1.5">
                  <RiSettings3Line className="w-4 h-4" /> Edit
                </button>
                <button className="px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-semibold hover:bg-indigo-100 transition-colors">
                  <RiExternalLinkLine className="w-4 h-4" />
                </button>
                <button className="px-3 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-100 transition-colors">
                  <RiDeleteBinLine className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Preview Section */}
      {monitors.length > 0 && (
        <div className="mt-12">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6">Live Preview</h2>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden max-w-4xl">
            <div className={`p-8 ${statusInfo.color.split(' ')[0]} flex items-center justify-between`}>
              <div>
                <h3 className="text-2xl font-bold mb-1">System Health</h3>
                <p className="text-sm opacity-80 font-medium">{statusInfo.label}</p>
              </div>
              {statusInfo.label === 'All Systems Operational' ? (
                <RiCheckDoubleLine className="w-12 h-12 opacity-40" />
              ) : (
                <RiErrorWarningLine className="w-12 h-12 opacity-40" />
              )}
            </div>
            <div className="p-8 space-y-4">
              {monitors.slice(0, 5).map((m) => (
                <div key={m._id} className="flex items-center justify-between p-4 rounded-xl border border-gray-50 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${m.status === 'UP' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                    <span className="text-sm font-semibold text-gray-900">{m.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold uppercase ${m.status === 'UP' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {m.status}
                    </span>
                    {m.lastStatusCode && (
                      <span className="text-[10px] font-mono text-gray-400">
                        ({m.lastStatusCode})
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {monitors.length > 5 && (
                <p className="text-center text-xs text-gray-400 pt-2 italic">and {monitors.length - 5} more monitors...</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusPages;