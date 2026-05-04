import React, { useState, useEffect } from 'react';
import { RiNotification3Line, RiAddLine, RiDeleteBinLine, RiLoader4Line, RiMailLine, RiSlackLine, RiLinksLine, RiRefreshLine } from '@remixicon/react';
import { getAlerts, createAlert, toggleAlertStatus, deleteAlert, getAlertHistory } from '../services/alert.api';
import Notification from '../../../components/Notification';

const Alerts = () => {
  const [channels, setChannels] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newChannel, setNewChannel] = useState({ type: 'email', target: '' });
  const [notification, setNotification] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const res = await getAlerts();
      if (res.data?.success) {
        setChannels(res.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch alerts:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      const res = await getAlertHistory();
      if (res.data?.success) {
        setHistory(res.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch history:", error);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    fetchHistory();
  }, []);

  const handleCreateAlert = async (e) => {
    e.preventDefault();
    if (!newChannel.target) return;
    
    try {
      setIsSubmitting(true);
      const res = await createAlert(newChannel);
      if (res.data?.success) {
        setChannels([...channels, res.data.data]);
        setShowAddModal(false);
        setNewChannel({ type: 'email', target: '' });
        setNotification({ message: 'Channel added successfully', type: 'success' });
      }
    } catch (error) {
      setNotification({ message: 'Failed to add channel', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (id) => {
    try {
      const res = await toggleAlertStatus(id);
      if (res.data?.success) {
        setChannels(channels.map(ch => ch._id === id ? res.data.data : ch));
      }
    } catch (error) {
      setNotification({ message: 'Failed to update status', type: 'error' });
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await deleteAlert(id);
      if (res.data?.success) {
        setChannels(channels.filter(ch => ch._id !== id));
        setNotification({ message: 'Channel deleted', type: 'success' });
      }
    } catch (error) {
      setNotification({ message: 'Failed to delete channel', type: 'error' });
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'email': return <RiMailLine className="w-6 h-6" />;
      case 'slack': return <RiSlackLine className="w-6 h-6" />;
      case 'webhook': return <RiLinksLine className="w-6 h-6" />;
      default: return <RiNotification3Line className="w-6 h-6" />;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-12 luxury-container">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-10 lg:mb-16 gap-6">
        <div>
          <h1 className="luxury-heading text-3xl lg:text-4xl">
            Alert Center
          </h1>
          <p className="luxury-subtext mt-3 max-w-md">
            Configure notification dispatch channels and monitor transmission history.
          </p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="luxury-button-primary flex items-center gap-3 px-8 w-full sm:w-auto justify-center"
        >
          <RiAddLine className="w-5 h-5" /> Add Channel
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RiLoader4Line className="w-10 h-10 animate-spin text-[#cc785c]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 lg:gap-12 mb-12 lg:mb-16">
          {channels.map((ch) => (
            <div key={ch._id} className="luxury-card group hover:border-[#cc785c]/30 transition-all duration-300 !p-8 lg:!p-10 relative overflow-hidden">
              <div className="flex justify-between items-start mb-8">
                <div className="w-12 h-12 bg-[#faf9f5] border border-[#e6dfd8] rounded-2xl flex items-center justify-center text-[#cc785c]">
                  {getIcon(ch.type)}
                </div>
                <div className="flex items-center gap-4">
                   <div className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={ch.isActive} 
                      onChange={() => handleToggle(ch._id)}
                    />
                    <div className="w-10 h-5 bg-[#e6dfd8] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#cc785c]"></div>
                  </div>
                </div>
              </div>
              <h3 className="luxury-heading text-2xl mb-2 capitalize">{ch.type}</h3>
              <p className="text-sm text-[#6c6a64] font-mono mb-8 truncate" title={ch.target}>{ch.target}</p>
              <div className="flex justify-between items-center pt-6 border-t border-[#e6dfd8]">
                <span className={`text-[10px] font-bold uppercase tracking-widest ${ch.isActive ? 'text-[#cc785c]' : 'text-[#6c6a64]'}`}>
                  {ch.isActive ? 'Active' : 'Disabled'}
                </span>
                <button 
                  onClick={() => handleDelete(ch._id)}
                  className="text-[#6c6a64] hover:text-red-500 transition-colors"
                >
                  <RiDeleteBinLine className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
          {channels.length === 0 && !loading && (
            <div className="md:col-span-2 xl:col-span-3 py-20 bg-white border border-dashed border-[#e6dfd8] rounded-3xl flex flex-col items-center justify-center text-center">
              <RiNotification3Line className="w-12 h-12 text-[#e6dfd8] mb-4" />
              <h3 className="luxury-heading text-xl mb-2">No Alert Channels</h3>
              <p className="luxury-subtext max-w-xs">You haven't configured any notification channels yet.</p>
            </div>
          )}
        </div>
      )}

      {/* Transmission Log */}
      <div className="bg-white border border-[#e6dfd8] rounded-3xl shadow-sm p-6 lg:p-10 overflow-hidden">
        <div className="flex items-center justify-between mb-8 lg:mb-12">
          <h2 className="luxury-heading text-xl lg:text-2xl">Transmission Log</h2>
          <button 
            onClick={fetchHistory}
            className="text-[#6c6a64] hover:text-[#cc785c] transition-colors"
          >
            <RiRefreshLine className={`w-5 h-5 ${historyLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        
        <div className="overflow-x-auto -mx-6 lg:mx-0 min-h-[200px] relative">
          <div className="inline-block min-w-full align-middle px-6 lg:px-0">
            {historyLoading && history.length === 0 ? (
              <div className="flex items-center justify-center py-10">
                <RiLoader4Line className="w-8 h-8 animate-spin text-[#cc785c]" />
              </div>
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="luxury-subtext">No transmission history found.</p>
              </div>
            ) : (
              <table className="luxury-table">
                <thead>
                  <tr>
                    <th>Monitor</th>
                    <th className="hidden sm:table-cell">Channel</th>
                    <th>Recipient</th>
                    <th className="hidden md:table-cell">Timestamp</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((log) => (
                    <tr key={log._id} className="group hover:bg-[#faf9f5] transition-colors">
                      <td>
                        <span className="text-[13px] font-semibold text-[#141413]">{log.monitorId?.title || 'Unknown'}</span>
                      </td>
                      <td className="text-sm text-[#3d3d3a] hidden sm:table-cell capitalize">{log.channelType}</td>
                      <td className="text-sm text-[#6c6a64] truncate max-w-[150px]">{log.target}</td>
                      <td className="text-sm text-[#6c6a64] hidden md:table-cell">
                        {new Date(log.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td>
                        <span className={`luxury-badge ${log.status === 'SENT' ? 'bg-[#cc785c]/10 text-[#cc785c]' : 'bg-red-50 text-red-500'}`}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-[#141413]/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[#faf9f5] border border-[#e6dfd8] rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">
            <form onSubmit={handleCreateAlert} className="p-8 lg:p-10">
              <h2 className="luxury-heading text-2xl mb-8">Add Dispatch Channel</h2>
              
              <div className="space-y-6 mb-10">
                <div className="form-group">
                  <label className="luxury-label">Channel Type</label>
                  <select 
                    value={newChannel.type}
                    onChange={(e) => setNewChannel({...newChannel, type: e.target.value})}
                    className="luxury-input bg-transparent"
                  >
                    <option value="email">Email</option>
                    <option value="slack">Slack Webhook</option>
                    <option value="webhook">Custom Webhook</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label className="luxury-label">
                    {newChannel.type === 'email' ? 'Email Address' : 'Webhook URL'}
                  </label>
                  <input 
                    type={newChannel.type === 'email' ? 'email' : 'text'}
                    value={newChannel.target}
                    onChange={(e) => setNewChannel({...newChannel, target: e.target.value})}
                    placeholder={newChannel.type === 'email' ? 'you@company.com' : 'https://hooks.slack.com/...'}
                    className="luxury-input"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="luxury-button-primary"
                >
                  {isSubmitting ? 'Adding...' : 'Authorize Channel'}
                </button>
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="luxury-button-outline"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {notification && (
        <Notification 
          message={notification.message} 
          type={notification.type} 
          onClose={() => setNotification(null)} 
        />
      )}
    </div>
  );
};

export default Alerts;