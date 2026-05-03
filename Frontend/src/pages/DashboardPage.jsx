import { useNavigate } from 'react-router';
import { useState, useEffect } from 'react';
import { getMonitors, deleteMonitor } from '../features/monitoring/services/monitor.api.js';
import { getAllIncidents } from '../features/monitoring/services/incident.api.js';
import { getAllLogs } from '../features/monitoring/services/logs.api.js';
import '../styles/dashboard.css';

const DashboardPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Data states
  const [monitors, setMonitors] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [logs, setLogs] = useState([]);
  
  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(null);

  // Authentication check
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    } else {
      navigate('/login');
    }
  }, [navigate]);

  // Fetch all data
  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [monitorsRes, incidentsRes, logsRes] = await Promise.all([
        getMonitors().catch(err => {
          console.error('Error fetching monitors:', err);
          return { data: [] };
        }),
        getAllIncidents().catch(err => {
          console.error('Error fetching incidents:', err);
          return { data: [] };
        }),
        getAllLogs().catch(err => {
          console.error('Error fetching logs:', err);
          return { data: [] };
        })
      ]);

      setMonitors(Array.isArray(monitorsRes?.data) ? monitorsRes.data : []);
      setIncidents(Array.isArray(incidentsRes?.data) ? incidentsRes.data : []);
      setLogs(Array.isArray(logsRes?.data) ? logsRes.data : []);
    } catch (err) {
      console.error('Dashboard data fetch error:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats from real data
  const stats = {
    totalMonitors: monitors.length,
    activeIncidents: incidents.filter(i => i.status === 'active').length,
    systemHealth: monitors.length > 0 
      ? Math.round((monitors.filter(m => m.status === 'online').length / monitors.length) * 100)
      : 0,
    uptime: 99.8 // This would come from a separate API endpoint
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleDeleteMonitor = async (monitorId) => {
    if (window.confirm('Are you sure you want to delete this monitor?')) {
      try {
        setDeleteLoading(monitorId);
        await deleteMonitor(monitorId);
        // Remove from local state
        setMonitors(monitors.filter(m => m._id !== monitorId));
      } catch (err) {
        console.error('Error deleting monitor:', err);
        alert('Failed to delete monitor');
      } finally {
        setDeleteLoading(null);
      }
    }
  };

  const handleAddMonitor = () => {
    navigate('/add-monitor');
  };

  const handleEditMonitor = (monitorId) => {
    // TODO: Navigate to edit monitor page or open modal
    alert('Edit monitor: ' + monitorId);
  };

  const handleViewAllIncidents = () => {
    navigate('/incidents');
  };

  const handleViewAllLogs = () => {
    navigate('/logs');
  };

  const getStatusBadgeClass = (status) => {
    switch(status?.toLowerCase()) {
      case 'online':
        return 'status-online';
      case 'warning':
        return 'status-warning';
      case 'offline':
        return 'status-offline';
      default:
        return 'status-online';
    }
  };

  const getIncidentSeverityClass = (severity) => {
    switch(severity?.toLowerCase()) {
      case 'critical':
        return 'severity-critical';
      case 'warning':
        return 'severity-warning';
      case 'info':
        return 'severity-info';
      default:
        return 'severity-warning';
    }
  };

  const getLogLevelClass = (level) => {
    switch(level?.toLowerCase()) {
      case 'error':
        return 'level-error';
      case 'warning':
        return 'level-warning';
      case 'info':
        return 'level-info';
      default:
        return 'level-info';
    }
  };

  // Format time helper
  const formatTime = (date) => {
    if (!date) return 'N/A';
    const time = new Date(date);
    const now = new Date();
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return time.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className={`dashboard-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <h2>DevOps</h2>
          <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
            ☰
          </button>
        </div>

        <nav className="sidebar-nav">
          <a href="#dashboard" className="nav-link active">📊 Dashboard</a>
          <a href="#monitors" className="nav-link">📡 Monitors</a>
          <a href="#incidents" className="nav-link">⚠️ Incidents</a>
          <a href="#logs" className="nav-link">📋 Logs</a>
          <a href="#settings" className="nav-link">⚙️ Settings</a>
          <a href="#help" className="nav-link">❓ Help</a>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Header */}
        <header className="dashboard-header">
          <h1>Dashboard</h1>
          <div className="header-actions">
            {user && (
              <>
                <span className="user-name">👤 {user.fullname}</span>
                <button onClick={handleLogout} className="logout-btn">Logout</button>
              </>
            )}
          </div>
        </header>

        {/* Content */}
        <div className="dashboard-content">
          {error && <div style={{ color: 'red', marginBottom: '20px' }}>{error}</div>}

          {/* Overview Cards */}
          <section className="overview-section">
            <h2>Overview</h2>
            <div className="overview-cards">
              <div className="card">
                <h3>Total Monitors</h3>
                <p className="stat-number">{stats.totalMonitors}</p>
                <p className="stat-label">Active services</p>
              </div>
              <div className="card">
                <h3>Active Incidents</h3>
                <p className="stat-number critical">{stats.activeIncidents}</p>
                <p className="stat-label">Needs attention</p>
              </div>
              <div className="card">
                <h3>System Health</h3>
                <p className="stat-number">{stats.systemHealth}%</p>
                <p className="stat-label">Overall status</p>
              </div>
              <div className="card">
                <h3>Uptime</h3>
                <p className="stat-number">{stats.uptime}%</p>
                <p className="stat-label">This month</p>
              </div>
            </div>
          </section>

          {/* Monitors Section */}
          <section className="monitors-section">
            <div className="section-header">
              <h2>Monitors</h2>
              <button className="btn-primary" onClick={handleAddMonitor}>+ Add Monitor</button>
            </div>
            {monitors.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>No monitors found. Create one to get started!</p>
            ) : (
              <table className="monitors-table">
                <thead>
                  <tr>
                    <th>Monitor Name</th>
                    <th>Status</th>
                    <th>Response Time</th>
                    <th>Last Checked</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {monitors.map(monitor => (
                    <tr key={monitor._id}>
                      <td><strong>{monitor.name || monitor.url}</strong></td>
                      <td>
                        <span className={`status-badge ${getStatusBadgeClass(monitor.status)}`}>
                          ● {monitor.status?.charAt(0).toUpperCase() + monitor.status?.slice(1) || 'Unknown'}
                        </span>
                      </td>
                      <td>{monitor.responseTime || '-'} ms</td>
                      <td>{formatTime(monitor.lastChecked)}</td>
                      <td>
                        <button 
                          className="btn-small" 
                          onClick={() => handleEditMonitor(monitor._id)}
                        >
                          Edit
                        </button>
                        <button 
                          className="btn-small btn-danger"
                          onClick={() => handleDeleteMonitor(monitor._id)}
                          disabled={deleteLoading === monitor._id}
                        >
                          {deleteLoading === monitor._id ? 'Deleting...' : 'Delete'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <div className="dashboard-grid">
            {/* Incidents Section */}
            <section className="incidents-section">
              <div className="section-header">
                <h2>Recent Incidents</h2>
                <a href="#all-incidents" className="view-all" onClick={handleViewAllIncidents}>View All →</a>
              </div>
              {incidents.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>No incidents</p>
              ) : (
                <div className="incidents-list">
                  {incidents.slice(0, 3).map(incident => (
                    <div key={incident._id} className={`incident-item ${getIncidentSeverityClass(incident.severity)}`}>
                      <div className="incident-header">
                        <h4>{incident.title || 'Incident'}</h4>
                        <span className={`incident-status ${incident.status}`}>
                          {incident.status?.toUpperCase() || 'UNKNOWN'}
                        </span>
                      </div>
                      <p className="incident-time">{formatTime(incident.createdAt)}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Activity Logs Section */}
            <section className="logs-section">
              <div className="section-header">
                <h2>Activity Logs</h2>
                <a href="#all-logs" className="view-all" onClick={handleViewAllLogs}>View All →</a>
              </div>
              {logs.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>No logs</p>
              ) : (
                <div className="logs-list">
                  {logs.slice(0, 4).map(log => (
                    <div key={log._id} className={`log-item ${getLogLevelClass(log.level)}`}>
                      <div className="log-level">{log.level?.toUpperCase() || 'INFO'}</div>
                      <div className="log-content">
                        <p>{log.message || log.description}</p>
                        <span className="log-time">{formatTime(log.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Quick Actions */}
          <section className="quick-actions">
            <h2>Quick Actions</h2>
            <div className="actions-grid">
              <button className="action-card" onClick={handleAddMonitor}>
                <span className="icon">➕</span>
                <span>Create Monitor</span>
              </button>
              <button className="action-card" onClick={handleViewAllIncidents}>
                <span className="icon">🔔</span>
                <span>View Alerts</span>
              </button>
              <button className="action-card">
                <span className="icon">📊</span>
                <span>View Reports</span>
              </button>
              <button className="action-card">
                <span className="icon">⚙️</span>
                <span>Configure Alert</span>
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;
