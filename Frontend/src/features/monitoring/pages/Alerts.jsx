import { useState } from 'react';
import { RiNotification3Line, RiAddLine } from '@remixicon/react';

const Alerts = () => {
  const [channels] = useState([
    { id: 1, type: 'Email', target: 'dev-ops@acme.com', active: true },
    { id: 2, type: 'Slack', target: '#monitoring-alerts', active: true },
    { id: 3, type: 'SMS', target: '+1 (555) 0123', active: false },
  ]);

  return (
    <div className="flex-1 overflow-y-auto p-12 luxury-container">
      <div className="flex items-center justify-between mb-16">
        <div>
          <h1 className="luxury-heading text-4xl">
            Alert Center
          </h1>
          <p className="luxury-subtext mt-3 max-w-md">
            Configure notification dispatch channels and monitor transmission history.
          </p>
        </div>
        <button className="luxury-button-primary flex items-center gap-3 px-8">
          <RiAddLine className="w-5 h-5" /> Add Channel
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-12 mb-16">
        {channels.map((ch) => (
          <div key={ch.id} className="luxury-card group hover:border-[#cc785c]/30 transition-all duration-300">
            <div className="flex justify-between items-start mb-8">
              <div className="w-12 h-12 bg-[#faf9f5] border border-[#e6dfd8] rounded-2xl flex items-center justify-center text-[#cc785c]">
                <RiNotification3Line className="w-6 h-6" />
              </div>
              <div className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked={ch.active} />
                <div className="w-10 h-5 bg-[#e6dfd8] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#cc785c]"></div>
              </div>
            </div>
            <h3 className="luxury-heading text-2xl mb-2">{ch.type}</h3>
            <p className="text-sm text-[#6c6a64] font-mono mb-8">{ch.target}</p>
            <div className="flex gap-4 pt-6 border-t border-[#e6dfd8]">
              <button className="text-xs font-semibold text-[#cc785c] hover:underline">Edit</button>
              <button className="text-xs font-semibold text-[#6c6a64] hover:text-[#141413]">Test Dispatch</button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-[#e6dfd8] rounded-2xl shadow-sm p-10 overflow-hidden">
        <h2 className="luxury-heading text-2xl mb-12">Transmission Log</h2>
        <div className="overflow-x-auto min-h-[300px]">
          <table className="luxury-table">
            <thead>
              <tr>
                <th>Event Type</th>
                <th>Channel</th>
                <th>Recipient</th>
                <th>Timestamp</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {[
                { event: 'CRITICAL_OUTAGE', channel: 'Slack', target: '#ops', time: '10m ago', status: 'Delivered' },
                { event: 'HEALTH_RECOVERY', channel: 'Email', target: 'devs@acme.com', time: '45m ago', status: 'Delivered' },
                { event: 'WARNING_LATENCY', channel: 'Slack', target: '#ops', time: '2h ago', status: 'Delivered' },
              ].map((log, i) => (
                <tr key={i} className="group hover:bg-[#faf9f5] transition-colors">
                  <td>
                    <span className="text-sm font-semibold text-[#141413] font-mono">{log.event}</span>
                  </td>
                  <td className="text-sm text-[#3d3d3a]">{log.channel}</td>
                  <td className="text-sm text-[#6c6a64]">{log.target}</td>
                  <td className="text-sm text-[#6c6a64]">{log.time}</td>
                  <td>
                    <span className="luxury-badge bg-[#cc785c]/10 text-[#cc785c]">
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Alerts;