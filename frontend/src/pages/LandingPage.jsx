import { useNavigate } from 'react-router-dom';
import './LandingPage.css';
import cardipoolLogo from '../assets/cardipool.png';

function LandingPage() {
  const navigate = useNavigate();
  const handleLogin = () => navigate('/dashboard');

  return (
    <div className="landing">
      <div className="logo">
        <img src={cardipoolLogo} alt="cardipool logo" />
        cardipool
      </div>
      <button onClick={handleLogin}>Log in with SSO</button>
    </div>
  );
}

export default LandingPage; 