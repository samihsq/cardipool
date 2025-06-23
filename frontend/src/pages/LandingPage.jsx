import { useNavigate } from 'react-router-dom';
import './LandingPage.css';
import cardipoolLogo from '../assets/cardipool.png';

function LandingPage() {
  const navigate = useNavigate();
  const handleLogin = () => navigate('/dashboard');

  return (
    <div className="landing wave-bg">
      <div className="logo">
        <img src={cardipoolLogo} alt="cardipool logo" />
        cardipool
      </div>
      <div className="collab-text">in collaboration with SGWU</div>
      <button onClick={handleLogin} className="login-btn">Log in to view</button>
    </div>
  );
}

export default LandingPage; 