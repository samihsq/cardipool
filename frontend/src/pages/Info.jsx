import { Link } from 'react-router-dom';
import './Info.css';

function Info() {
  return (
    <div className="info-page wave-bg">
      <header className="page-header">
        <Link to="/dashboard" className="back-btn">← Back to Dashboard</Link>
        <h1>Information</h1>
      </header>
      
      <div className="page-content">
        <div className="content-card">
          <h2>About cardipool</h2>
          <p>
            Welcome to cardipool, the Stanford community's hub for shared rides. Whether you're heading to the airport, a concert, or just your daily commute, cardipool makes it easy to connect with fellow students and staff to share the journey. Our goal is to make travel simpler, more affordable, and more sustainable for everyone on campus.
          </p>
          
          <h3>How It Works</h3>
          <p>
            Our platform is built on a simple principle: connecting rides with passengers. Drivers/hosts can post their travel plans, and passengers can browse available carpools to find one that fits their needs. It's a community-driven way to get where you need to go.
          </p>
          
          <h3>Getting Started</h3>
          <p>
            Getting started is easy. Log in with your Stanford credentials to access the dashboard. From there, you can either click the "+ add" button to offer a ride or browse the existing carpools. When you find a ride you're interested in, click on it to see the details and request to join.
          </p>
          
          <h3>Community Guidelines</h3>
          <p>
            To ensure a positive experience for everyone, we ask all users to be respectful, punctual, and communicative. Treat your fellow carpoolers with courtesy, leave the car as clean as you found it, and communicate clearly if your plans change.
          </p>
          
          <h3>Safety First</h3>
          <p>
            Your safety is our top priority. This platform is exclusively for the Stanford community, but we still encourage you to use your best judgment when arranging a carpool. Share your trip details with a friend, and don't hesitate to report any concerns to our support team.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Info; 