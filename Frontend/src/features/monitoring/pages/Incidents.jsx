import { useEffect, useState } from 'react';
import { getAllIncidents } from '../services/incident.api';
import { Link } from 'react-router';
import { RiRefreshLine, RiRobot2Line } from '@remixicon/react';
import EmptyState from '../../../components/ui/EmptyState';
import { LoadingRegion, SkeletonRows } from '../../../components/ui/Skeleton';
import { RiShieldCheckLine } from '@remixicon/react';

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
      setError(
        err.response?.data?.message ||
          err.message ||
          'Failed to fetch incidents'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-12 luxury-container">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 sm:mb-12 lg:mb-16">
        <div>
          <h1 className="luxury-heading text-2xl sm:text-3xl lg:text-4xl">
            Journal
          </h1>
          <p className="luxury-subtext mt-3 max-w-md">
            A chronological record of system events, outages, and resolutions.
          </p>
        </div>
        <button
          onClick={fetchIncidents}
          disabled={loading}
          className="luxury-button-outline flex items-center gap-3"
        >
          <RiRefreshLine
            className={`w-5 h-5 ${loading ? 'animate-spin text-[#cc785c]' : ''}`}
          />
          Refresh Journal
        </button>
      </div>

      {error && (
        <div className="mb-10 p-6 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white border border-[#e6dfd8] rounded-2xl shadow-sm p-4 sm:p-6 lg:p-10 overflow-hidden mb-16">
        <div className="flex items-center justify-between gap-4 mb-6 sm:mb-10 lg:mb-12">
          <h2 className="luxury-heading text-xl sm:text-2xl">System Events</h2>
        </div>

        <div className="overflow-x-auto min-h-[400px] relative">
          {loading && incidents.length === 0 ? (
            <LoadingRegion label="Loading incidents">
              <div className="p-4">
                <SkeletonRows rows={4} />
              </div>
            </LoadingRegion>
          ) : incidents.length === 0 ? (
            // Positive tone: an empty incident list is GOOD NEWS on a
            // monitoring dashboard, and must not read as a broken feature.
            <EmptyState
              icon={RiShieldCheckLine}
              tone="positive"
              title="No incidents recorded"
              description="Every monitored endpoint has been responding normally. Incidents appear here automatically when one fails its configured threshold."
            />
          ) : (
            <table className="luxury-table">
              <thead>
                <tr>
                  <th>Asset / Service</th>
                  <th>Status</th>
                  <th>Triggered</th>
                  <th>Resolved</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((inc) => (
                  <tr
                    key={inc._id}
                    className="group hover:bg-[#faf9f5] transition-colors"
                  >
                    <td>
                      <p className="font-semibold text-[#141413]">
                        {inc.monitorId?.title ||
                          inc.monitorId?.url ||
                          'Untitled monitor'}
                      </p>
                      <p className="text-xs text-[#6c6a64] mt-1 font-mono uppercase tracking-widest">
                        {inc.monitorId?.url || 'N/A'}
                      </p>
                    </td>
                    <td>
                      <span
                        className={`luxury-badge ${inc.status === 'ONGOING' || inc.status === 'OPEN' ? 'bg-[#cc785c]/10 text-[#cc785c]' : 'bg-[#e6dfd8]/30 text-[#6c6a64]'}`}
                      >
                        {inc.status}
                      </span>
                    </td>
                    <td className="text-sm text-[#6c6a64]">
                      {new Date(inc.createdAt).toLocaleString()}
                    </td>
                    <td className="text-sm text-[#6c6a64]">
                      {inc.endTime ? (
                        new Date(inc.endTime).toLocaleString()
                      ) : (
                        <span className="text-[#cc785c] font-medium">
                          Ongoing
                        </span>
                      )}
                    </td>
                    <td className="text-right">
                      <Link
                        to={`/incidents/${inc._id}`}
                        className="text-xs font-semibold text-[#a8543a] hover:underline"
                      >
                        Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* AI Analysis Cards */}
      <div className="grid grid-cols-1 gap-12">
        {incidents
          .filter((inc) => inc.aiSummary)
          .map((incident) => (
            <div
              key={`ai-${incident._id}`}
              className="bg-white border border-[#cc785c]/20 p-12 rounded-2xl shadow-sm relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4">
                <div className="bg-[#cc785c]/10 text-[#a8543a] px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
                  AI Diagnosis
                </div>
              </div>

              <div className="flex items-center gap-6 mb-12 pb-6 border-b border-[#e6dfd8]">
                <RiRobot2Line className="w-8 h-8 text-[#cc785c]" />
                <h3 className="luxury-heading text-xl sm:text-2xl">
                  Intelligence Summary
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
                <div>
                  <p className="luxury-label mb-3">Root Cause</p>
                  <p className="text-sm text-[#141413] font-medium leading-relaxed">
                    {incident.reason || 'Under analysis'}
                  </p>
                </div>
                <div>
                  <p className="luxury-label mb-3">Down Duration</p>
                  <p className="text-sm text-[#141413] font-medium leading-relaxed">
                    {incident.duration
                      ? `${incident.duration}s`
                      : 'Active incident'}
                  </p>
                </div>
                <div>
                  <p className="luxury-label mb-3">Initial Event</p>
                  <p className="text-sm text-[#141413] font-medium leading-relaxed">
                    {new Date(incident.startTime).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="bg-[#faf9f5] p-10 rounded-xl border border-[#e6dfd8]">
                <p className="luxury-label mb-6 text-[#cc785c]">
                  Technical Analysis
                </p>
                <p className="text-base text-[#3d3d3a] leading-relaxed whitespace-pre-wrap font-light">
                  {incident.aiSummary}
                </p>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

export default Incidents;
