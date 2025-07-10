import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import './LandingPage.css';
import cardipoolLogo from '../assets/cardipool.png';

function LandingPage() {
  const { login, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If user is already authenticated, redirect to dashboard
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = () => {
    login();
  };

  if (loading) {
    return (
      <div className="landing wave-bg">
        <div className="logo">
          <img src={cardipoolLogo} alt="cardipool logo" />
          cardipool
        </div>
        <div className="collab-text">in collaboration with SGWU</div>
        <div className="loading-text">Checking authentication...</div>
      </div>
    );
  }

  return (
    <div className="landing wave-bg">
      <div className="logo">
        <img src={cardipoolLogo} alt="cardipool logo" />
        cardipool
      </div>
      <div className="collab-text">in collaboration with SGWU</div>
      <div className="info-text">
        carpool with your Stanford friends
      </div>
      <button onClick={handleLogin} className="login-btn">
        Log in with Stanford
      </button>
      
    </div>
  );
}

export default LandingPage; 