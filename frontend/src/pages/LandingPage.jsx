import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
// import { motion } from 'framer-motion';
// import { GiPlasticDuck } from 'react-icons/gi';
import './LandingPage.css';
import cardipoolLogo from '../assets/cardipool.png';

/*
const EcoAnimation = () => {
  const DURATION = 12;
  const EASE = "easeInOut";

  const commonTransition = {
    duration: DURATION,
    repeat: Infinity,
    ease: EASE,
  };

  return (
    <div className="eco-animation-wrapper">
      <div className="title-container">
        <h1 className="eco-title">cardipool</h1>
        <div className="info-text">
          carpool with your Stanford friends
        </div>
        <div className="collab-text">
          in collaboration with SGWU
        </div>
      </div>

      {/* The Duck's full animation loop * /}
      <motion.span
        className="eco-duck"
        animate={{
          x: [-450, -450, -310, -200, 0, 200, 310, 450, 450],
          y: [0, 0, 0, -60, -90, -60, 0, 0, 0],
          opacity: [0, 0, 1, 1, 1, 1, 1, 0, 0],
          rotate: [0, 0, 0, -15, 0, 15, 0, 0, 0],
        }}
        transition={{ ...commonTransition, times: [0, 0.15, 0.25, 0.35, 0.5, 0.65, 0.75, 0.85, 1] }}
      >
        <GiPlasticDuck />
      </motion.span>
      
      {/* Top Tree's full animation loop * /}
      <motion.span
        className="eco-tree"
        animate={{
          x: [-280, -280, -280, -150, -30, 150, 280, -280, -280],
          y: [-200, -35, -35, -90, -120, -90, -35, -200, -200],
          opacity: [0, 1, 1, 1, 1, 1, 1, 0, 0],
        }}
        transition={{ ...commonTransition, times: [0, 0.15, 0.25, 0.35, 0.5, 0.65, 0.75, 0.85, 1] }}
      >
        🌲
      </motion.span>
      
      {/* Bottom Tree's full animation loop * /}
      <motion.span
        className="eco-tree"
        animate={{
          x: [-280, -280, -280, -100, 30, 180, 280, -280, -280],
          y: [200, 35, 35, -30, -60, -30, 35, 200, 200],
          opacity: [0, 1, 1, 1, 1, 1, 1, 0, 0],
        }}
        transition={{ ...commonTransition, times: [0, 0.15, 0.25, 0.35, 0.5, 0.65, 0.75, 0.85, 1] }}
      >
        🌲
      </motion.span>
    </div>
  );
};
*/


function LandingPage() {
  const { login, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = () => {
    login();
  };

  return (
    <div className="landing wave-bg">
      {/* <EcoAnimation /> */}
      <div className="title-container">
        <div className="main-title">
          <img src={cardipoolLogo} alt="Cardipool Logo" className="logo" />
          <h1 className="eco-title">cardipool</h1>
        </div>
        <div className="info-text">
          carpool with your Stanford friends
        </div>
        <div className="collab-text">
          in collaboration with SGWU
        </div>
      </div>
      <button onClick={handleLogin} className="login-btn" disabled={loading}>
        {loading ? 'Logging in...' : 'Log in with Stanford'}
      </button>
    </div>
  );
}

export default LandingPage; 