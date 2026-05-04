import React from 'react';
import { RiNotification3Line, RiMailLine, RiSlackLine, RiDiscordLine, RiHistoryLine } from '@remixicon/react';

const Alerts = () => {
  const alertLogs = []; // Placeholder for real alert logs

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-gray-50">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <RiNotification3Line className="w-7 h-7 text-orange-500" />
            Alerts
          </h1>
          <p className="text-[13px] text-gray-500 mt-1">
            Review alert history and manage notification channels.
          </p>
        </div>
      </div>

      {/* Notification Channels */}
      <div className="mb-10">
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Notification Channels</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { name: 'Email Notifications', icon: RiMailLine, status: 'Active', color: 'bg-blue-500' },
            { name: 'Slack Integration', icon: RiSlackLine, status: 'Not Configured', color: 'bg-purple-500' },
            { name: 'Discord Webhook', icon: RiDiscordLine, status: 'Not Configured', color: 'bg-indigo-500' },
          ].map((channel, i) => (
            <div key={i} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 ${channel.color} rounded-lg flex items-center justify-center text-white`}>
                  <channel.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{channel.name}</p>
                  <p className={`text-[11px] font-semibold ${channel.status === 'Active' ? 'text-emerald-500' : 'text-gray-400'}`}>
                    {channel.status}
                  </p>
                </div>
              </div>
              <button className="text-xs font-bold text-indigo-600 hover:text-indigo-700">
                Configure
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Alert History */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-[15px] font-semibold text-gray-900 tracking-tight">Alert History</h2>
        </div>
        <div className="overflow-x-auto min-h-[300px]">
          {alertLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[300px] text-center p-8">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <RiHistoryLine className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-sm text-gray-500">No alert history found.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-6 py-4 text-[11px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">Monitor</th>
                  <th className="px-6 py-4 text-[11px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">Type</th>
                  <th className="px-6 py-4 text-[11px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">Timestamp</th>
                  <th className="px-6 py-4 text-[11px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">Channel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {/* Alert rows would go here */}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Alerts;