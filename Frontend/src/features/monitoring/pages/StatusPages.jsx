import { useState } from 'react';
import { RiAddLine } from '@remixicon/react';

const StatusPages = () => {
  const [pages] = useState([
    {
      id: 1,
      name: 'Main API Dashboard',
      url: 'status.acme.com',
      status: 'Operational',
      lastUpdated: '2 mins ago',
    },
    {
      id: 2,
      name: 'Client Portal',
      url: 'health.acme.io',
      status: 'Operational',
      lastUpdated: '5 mins ago',
    },
  ]);

  const getStatusBadge = (status) => {
    return (
      <span className="luxury-badge bg-[#cc785c]/10 text-[#cc785c]">
        {status}
      </span>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-12 luxury-container">
      <div className="flex items-center justify-between mb-16">
        <div>
          <h1 className="luxury-heading text-4xl">Status Pages</h1>
          <p className="luxury-subtext mt-3 max-w-md">
            Public-facing communication channels for service health and incident
            reporting.
          </p>
        </div>
        <button className="luxury-button-primary flex items-center gap-3 px-8">
          <RiAddLine className="w-5 h-5" /> Create Page
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
        <div className="flex flex-col gap-12">
          {pages.map((page) => (
            <div
              key={page.id}
              className="luxury-card group hover:border-[#cc785c]/30 transition-all duration-300"
            >
              <div className="flex justify-between items-start mb-10">
                <div>
                  <h3 className="luxury-heading text-2xl mb-2">{page.name}</h3>
                  <p className="text-sm text-[#6c6a64] font-mono">{page.url}</p>
                </div>
                {getStatusBadge(page.status)}
              </div>

              <div className="grid grid-cols-2 gap-8 mb-10">
                <div className="bg-[#faf9f5] p-6 rounded-xl border border-[#e6dfd8]">
                  <p className="luxury-label mb-2">Uptime (30d)</p>
                  <p className="text-2xl font-semibold text-[#141413]">
                    99.98%
                  </p>
                </div>
                <div className="bg-[#faf9f5] p-6 rounded-xl border border-[#e6dfd8]">
                  <p className="luxury-label mb-2">Avg Response</p>
                  <p className="text-2xl font-semibold text-[#141413]">124ms</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-[#e6dfd8]">
                <span className="text-xs text-[#6c6a64]">
                  Updated {page.lastUpdated}
                </span>
                <div className="flex gap-4">
                  <button className="luxury-button-outline py-2 px-6 text-sm">
                    Edit
                  </button>
                  <button className="luxury-button-primary py-2 px-6 text-sm">
                    View Public
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-12">
          {/* Public Preview Card */}
          <div className="bg-[#141413] rounded-3xl p-12 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#cc785c] rounded-full blur-[120px] opacity-20 -mr-32 -mt-32"></div>

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-16">
                <h4 className="luxury-heading text-white text-xl tracking-wide">
                  Public Preview
                </h4>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#cc785c] animate-pulse"></div>
                  <span className="text-[10px] uppercase tracking-widest font-bold">
                    Live Status
                  </span>
                </div>
              </div>

              <div className="mb-16">
                <h2 className="text-5xl font-light mb-6 font-serif">
                  All systems are{' '}
                  <span className="text-[#cc785c]">operational</span>.
                </h2>
                <p className="text-[#6c6a64] text-lg max-w-sm">
                  Global infrastructure is performing within optimal parameters.
                </p>
              </div>

              <div className="space-y-6">
                {['API Services', 'Database Clusters', 'CDN Edge'].map(
                  (service, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-4 border-b border-white/10 last:border-0"
                    >
                      <span className="text-sm font-medium opacity-80">
                        {service}
                      </span>
                      <span className="text-[10px] uppercase tracking-widest font-bold text-[#cc785c]">
                        Operational
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>

          <div className="luxury-card border-dashed border-2 flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-[#faf9f5] border border-[#e6dfd8] rounded-full flex items-center justify-center mb-6">
              <RiAddLine className="w-8 h-8 text-[#cc785c]" />
            </div>
            <h3 className="luxury-heading text-xl mb-3">Add Status Page</h3>
            <p className="text-sm text-[#6c6a64] max-w-[200px]">
              Create a new public-facing communication channel.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusPages;
