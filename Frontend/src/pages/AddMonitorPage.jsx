import { useNavigate } from 'react-router';
import { useState } from 'react';
import { createMonitoring } from '../features/monitoring/services/monitor.api.js';
import '../styles/add-monitor.css';

const AddMonitorPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    type: 'http',
    interval: 60,
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name.trim()) {
      setError('Monitor name is required');
      return;
    }
    if (!formData.url.trim()) {
      setError('URL is required');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await createMonitoring({
        name: formData.name,
        url: formData.url,
        type: formData.type,
        interval: parseInt(formData.interval),
        description: formData.description
      });

      if (response.success) {
        setSuccess(true);
        // Redirect back to dashboard after 1.5 seconds
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      }
    } catch (err) {
      console.error('Error creating monitor:', err);
      setError(err.response?.data?.message || 'Failed to create monitor. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-monitor-container">
      <div className="add-monitor-card">
        <div className="add-monitor-header">
          <button className="back-button" onClick={() => navigate('/dashboard')}>
            ← Back to Dashboard
          </button>
          <h1>Add New Monitor</h1>
          <p>Set up monitoring for your service or application</p>
        </div>

        {success && (
          <div className="success-message">
            ✓ Monitor created successfully! Redirecting...
          </div>
        )}

        {error && (
          <div className="error-message">
            ✗ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="monitor-form">
          <div className="form-group">
            <label htmlFor="name">Monitor Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              placeholder="e.g., API Server, Database, Website"
              value={formData.name}
              onChange={handleChange}
              required
            />
            <small>Give your monitor a descriptive name</small>
          </div>

          <div className="form-group">
            <label htmlFor="url">URL/Endpoint *</label>
            <input
              type="url"
              id="url"
              name="url"
              placeholder="e.g., https://api.example.com/health"
              value={formData.url}
              onChange={handleChange}
              required
            />
            <small>The URL or endpoint to monitor</small>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="type">Monitor Type *</label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleChange}
              >
                <option value="http">HTTP/HTTPS</option>
                <option value="ping">Ping</option>
                <option value="tcp">TCP</option>
                <option value="dns">DNS</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="interval">Check Interval (seconds) *</label>
              <input
                type="number"
                id="interval"
                name="interval"
                min="30"
                max="3600"
                value={formData.interval}
                onChange={handleChange}
                required
              />
              <small>How often to check (30-3600 seconds)</small>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              placeholder="Optional: Add notes about this monitor"
              value={formData.description}
              onChange={handleChange}
              rows="4"
            />
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn-cancel"
              onClick={() => navigate('/dashboard')}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-submit"
              disabled={loading}
            >
              {loading ? 'Creating Monitor...' : 'Create Monitor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMonitorPage;
