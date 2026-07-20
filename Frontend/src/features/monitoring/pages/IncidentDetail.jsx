import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { RiArrowLeftLine, RiRobot2Line, RiRefreshLine } from '@remixicon/react';
import { getIncidentById } from '../services/incident.api';

const fmtDuration = (seconds) => {
  if (!seconds || seconds < 60) return `${seconds || 0}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return `${m}m ${s}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
};

const IncidentDetail = () => {
  const { incidentId } = useParams();
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getIncidentById(incidentId);
      setIncident(res?.data || null);
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || 'Failed to load incident'
      );
    } finally {
      setLoading(false);
    }
  }, [incidentId]);

  useEffect(() => {
    load();
  }, [load]);

  const monitor = incident?.monitorId;
  const ongoing = incident?.status === 'ONGOING';

  return (
    <div className="flex-1 overflow-y-auto p-12 luxury-container">
      <Link
        to="/incidents"
        className="inline-flex items-center gap-2 text-sm text-[#6c6a64] hover:text-[#141413] transition-colors mb-10"
      >
        <RiArrowLeftLine className="w-4 h-4" /> Back to Journal
      </Link>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#cc785c]" />
        </div>
      ) : error ? (
        <div className="p-8 bg-red-50 border border-red-100 rounded-2xl">
          <p className="text-sm text-red-700 mb-4">{error}</p>
          <button onClick={load} className="luxury-button-outline flex items-center gap-2">
            <RiRefreshLine className="w-4 h-4" /> Try again
          </button>
        </div>
      ) : !incident ? (
        <p className="luxury-subtext">Incident not found.</p>
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-6 mb-12">
            <div className="min-w-0">
              <h1 className="luxury-heading text-4xl break-words">
                {monitor?.title || 'Untitled monitor'}
              </h1>
              <p className="luxury-subtext mt-3 font-mono text-sm break-all">
                {monitor?.url || 'N/A'}
              </p>
            </div>
            <span
              className={`luxury-badge ${
                ongoing
                  ? 'bg-[#cc785c]/10 text-[#cc785c]'
                  : 'bg-[#e6dfd8]/30 text-[#6c6a64]'
              }`}
            >
              {incident.status}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {[
              {
                label: 'Triggered',
                value: incident.startTime
                  ? new Date(incident.startTime).toLocaleString()
                  : '—',
              },
              {
                label: 'Resolved',
                value: incident.endTime
                  ? new Date(incident.endTime).toLocaleString()
                  : 'Ongoing',
              },
              {
                label: 'Downtime',
                value: ongoing ? 'Active' : fmtDuration(incident.duration),
              },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-white border border-[#e6dfd8] rounded-2xl p-8"
              >
                <p className="luxury-label mb-3">{s.label}</p>
                <p className="text-base font-medium text-[#141413] break-words">
                  {s.value}
                </p>
              </div>
            ))}
          </div>

          <div className="bg-white border border-[#e6dfd8] rounded-2xl p-10 mb-12">
            <p className="luxury-label mb-4">Root cause</p>
            <p className="text-sm text-[#141413] font-mono break-words">
              {incident.reason || 'Under analysis'}
            </p>
          </div>

          {incident.aiSummary && (
            <div className="bg-white border border-[#cc785c]/20 rounded-2xl p-10">
              <div className="flex items-center gap-4 mb-8 pb-6 border-b border-[#e6dfd8]">
                <RiRobot2Line className="w-7 h-7 text-[#cc785c]" />
                <h2 className="luxury-heading text-2xl">AI Diagnosis</h2>
              </div>
              <p className="text-base text-[#3d3d3a] leading-relaxed whitespace-pre-wrap font-light">
                {incident.aiSummary}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default IncidentDetail;
