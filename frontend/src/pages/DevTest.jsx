import React, { useState, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

const DevTest = () => {
  const { user, setUser } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [emailSubject, setEmailSubject] = useState('Test Email from Cardipool');
  const [emailBody, setEmailBody] = useState('<h1>Test Email</h1><p>This is a test email from your cardipool app!</p>');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleDevLogin = async () => {
    try {
      setLoading(true);
      const response = await fetch('/auth/dev-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, name })
      });
      
      const data = await response.json();
      if (response.ok) {
        setUser(data.user);
        setMessage('✅ Development login successful!');
      } else {
        setMessage('❌ Login failed: ' + data.error);
      }
    } catch (error) {
      setMessage('❌ Login error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDevLogout = async () => {
    try {
      const response = await fetch('/auth/dev-logout', { credentials: 'include' });
      if (response.ok) {
        setUser(null);
        setMessage('✅ Logged out successfully!');
      }
    } catch (error) {
      setMessage('❌ Logout error: ' + error.message);
    }
  };

  const handleTestEmail = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          to: testEmail,
          subject: emailSubject,
          html: emailBody
        })
      });
      
      const data = await response.json();
      if (response.ok) {
        setMessage('✅ Test email sent successfully!');
      } else {
        setMessage('❌ Email failed: ' + data.error);
      }
    } catch (error) {
      setMessage('❌ Email error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return <div>This page is only available in development mode.</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🔧 Development Testing Page</h1>
      
      {message && (
        <div style={{ 
          padding: '10px', 
          margin: '10px 0', 
          backgroundColor: message.includes('✅') ? '#d4edda' : '#f8d7da',
          border: `1px solid ${message.includes('✅') ? '#c3e6cb' : '#f5c6cb'}`,
          borderRadius: '4px'
        }}>
          {message}
        </div>
      )}

      <div style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h2>Authentication Testing</h2>
        
        {!user ? (
          <div>
            <h3>Development Login</h3>
            <div style={{ marginBottom: '10px' }}>
              <label>Email (your Gmail): </label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@gmail.com"
                style={{ width: '300px', padding: '5px' }}
              />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label>Display Name: </label>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                placeholder="Your Name"
                style={{ width: '300px', padding: '5px' }}
              />
            </div>
            <button 
              onClick={handleDevLogin} 
              disabled={loading || !email || !name}
              style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}
            >
              {loading ? 'Logging in...' : 'Dev Login'}
            </button>
          </div>
        ) : (
          <div>
            <p><strong>Logged in as:</strong> {user.display_name} ({user.email})</p>
            <button 
              onClick={handleDevLogout}
              style={{ padding: '10px 20px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px' }}
            >
              Dev Logout
            </button>
          </div>
        )}
      </div>

      {user && (
        <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
          <h2>Email Testing</h2>
          <div style={{ marginBottom: '10px' }}>
            <label>Send test email to: </label>
            <input 
              type="email" 
              value={testEmail} 
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="recipient@gmail.com"
              style={{ width: '300px', padding: '5px' }}
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>Subject: </label>
            <input 
              type="text" 
              value={emailSubject} 
              onChange={(e) => setEmailSubject(e.target.value)}
              style={{ width: '400px', padding: '5px' }}
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>HTML Body: </label>
            <textarea 
              value={emailBody} 
              onChange={(e) => setEmailBody(e.target.value)}
              rows={6}
              style={{ width: '100%', padding: '5px' }}
            />
          </div>
          <button 
            onClick={handleTestEmail} 
            disabled={loading || !testEmail}
            style={{ padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px' }}
          >
            {loading ? 'Sending...' : 'Send Test Email'}
          </button>
        </div>
      )}
    </div>
  );
};

export default DevTest; 