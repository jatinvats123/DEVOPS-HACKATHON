import { Link } from 'react-router';

export default function NotFound() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#0f172a',
      color: '#f8fafc',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h1 style={{ 
        fontSize: '8rem', 
        margin: '0', 
        fontWeight: '800', 
        background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', 
        WebkitBackgroundClip: 'text', 
        WebkitTextFillColor: 'transparent',
        lineHeight: '1'
      }}>
        404
      </h1>
      <h2 style={{ fontSize: '2rem', marginTop: '1rem', marginBottom: '1.5rem', fontWeight: '500' }}>
        Page Not Found
      </h2>
      <p style={{ fontSize: '1.125rem', color: '#94a3b8', marginBottom: '3rem', maxWidth: '450px', textAlign: 'center', lineHeight: '1.6' }}>
        Oops! The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
      </p>
      <Link 
        to="/" 
        style={{
          padding: '0.875rem 2rem',
          backgroundColor: '#3b82f6',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '0.5rem',
          fontWeight: '600',
          boxShadow: '0 4px 14px 0 rgba(59, 130, 246, 0.39)',
          transition: 'all 0.2s ease-in-out',
        }}
        onMouseOver={(e) => {
          e.target.style.backgroundColor = '#2563eb';
          e.target.style.transform = 'translateY(-2px)';
        }}
        onMouseOut={(e) => {
          e.target.style.backgroundColor = '#3b82f6';
          e.target.style.transform = 'translateY(0)';
        }}
      >
        Return to Home
      </Link>
    </div>
  );
}
