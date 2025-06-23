import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

function LandingPage() {
  const navigate = useNavigate();
  const handleLogin = () => navigate('/dashboard');

  return (
    <div className="landing">
      <div className="logo">cardipool</div>
      <button onClick={handleLogin}>Log in with SSO</button>
    </div>
  );
}

export default LandingPage; 