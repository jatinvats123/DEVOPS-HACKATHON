import React, { useEffect, useState } from 'react';
import { getAllIncidents } from '../services/incident.api';
import { RiAlertLine, RiRefreshLine, RiHistoryLine, RiTimeLine, RiRobot2Line } from '@remixicon/react';

const Incidents = () => {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const res = await getAllIncidents();
      if (res && res.data) {
        setIncidents(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to fetch incidents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  const getStatusStyle = (status) => {
    const s = (status || "").toUpperCase();
    if (s === "ONGOING" || s === "OPEN" || s === "FAILING") return "bg-red-100 text-red-700";
    if (s === "RESOLVED" || s === "CLOSED") return "bg-emerald-100 text-emerald-700";
    return "bg-gray-100 text-gray-700";
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-gray-50">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <RiAlertLine className="w-7 h-7 text-red-500" />
            Incidents
          </h1>
          <p className="text-[13px] text-gray-500 mt-1">
            Track and manage service outages and performance issues.
          </p>
        </div>
        <button
          onClick={fetchIncidents}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
        >
          <RiRefreshLine className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto min-h-[400px]">
          {loading && incidents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[400px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-3"></div>
              <p className="text-sm text-gray-500">Loading incidents...</p>
            </div>
          ) : incidents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[400px] text-center p-8">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
                <RiHistoryLine className="w-8 h-8 text-emerald-500 opacity-40" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-1">All Systems Operational</h3>
              <p className="text-sm text-gray-500 max-w-xs mx-auto">
                No incidents recorded. We'll list any service disruptions or performance issues here.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-6 py-4 text-[11px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">Monitor / Service</th>
                  <th className="px-6 py-4 text-[11px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">Status</th>
                  <th className="px-6 py-4 text-[11px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">Started At</th>
                  <th className="px-6 py-4 text-[11px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">Resolved At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {incidents.map((inc) => (
                  <tr key={inc._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-[14px] font-semibold text-gray-900">{inc.monitorTitle || "Unknown Monitor"}</p>
                      <p className="text-[12px] text-gray-500 mt-0.5">{inc.monitorUrl || inc.url || "N/A"}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${getStatusStyle(inc.status)}`}>
                        {inc.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[13px] text-gray-600">
                      {new Date(inc.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-[13px] text-gray-500">
                      {inc.resolvedAt ? new Date(inc.resolvedAt).toLocaleString() : (
                        <span className="text-red-500 italic font-medium">Ongoing</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 shadow-sm">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && incidents.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-sm text-gray-500 font-medium">Fetching global incidents...</p>
        </div>
      ) : incidents.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl shadow-sm border border-gray-100 text-gray-500">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
            <RiAlertLine className="w-8 h-8 text-emerald-500" />
          </div>
          <p className="text-[15px] font-medium text-gray-900 mb-1">No incidents found</p>
          <p className="text-sm">Your infrastructure has a clean record.</p>
        </div>
      ) : (
        /* Incidents List */
        <div className="space-y-4">
          {incidents.map((incident) => (
            <div key={incident._id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:border-gray-200 transition-all duration-200">
              
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center justify-between bg-gray-50/30 gap-3">
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide uppercase ${incident.status === 'ONGOING' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'}`}>
                    {incident.status || 'UNKNOWN'}
                  </span>
                  <h3 className="text-[15px] font-semibold text-gray-900">
                    {incident.reason || "Outage detected"}
                  </h3>
                </div>
                
                <div className="flex items-center gap-4 text-[12px] font-medium text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <RiTimeLine className="w-4 h-4 text-gray-400" />
                    <span>Duration: {incident.duration ? `${incident.duration}s` : 'Ongoing'}</span>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Start Time</p>
                    <p className="text-[13px] text-gray-900 font-medium">{incident.startTime}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">End Time</p>
                    <p className="text-[13px] text-gray-900 font-medium">{incident.endTime ? incident.endTime : 'N/A'}</p>
                  </div>
                </div>

                {/* AI Summary */}
                {incident.aiSummary && (
                  <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-4 flex gap-3">
                    <RiRobot2Line className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[12px] font-semibold text-indigo-900 mb-1">AI Root Cause Analysis</p>
                      <p className="text-[13px] text-indigo-800/80 leading-relaxed whitespace-pre-wrap">
                        {incident.aiSummary}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Incidents;