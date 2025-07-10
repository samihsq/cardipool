import { Link } from 'react-router-dom';
import './Help.css';

function Help() {
  return (
    <div className="help-page wave-bg">
      <header className="page-header">
        <Link to="/dashboard" className="back-btn">← Back to Dashboard</Link>
        <h1>Help & Support</h1>
      </header>
      
      <div className="page-content">
        <div className="content-card">
          <h2>Frequently Asked Questions</h2>
          
          <div className="faq-item">
            <h3>How do I create a carpool?</h3>
            <p>
              To create a carpool, click the "+ add" button on the dashboard. You'll be asked to provide details like your destination, departure time, and how many seats you have available. Adding a detailed description and tags will help others find your ride.
            </p>
          </div>
          
          <div className="faq-item">
            <h3>How do I join an existing carpool?</h3>
            <p>
              From the dashboard, you can browse all available carpools. Click on any carpool to see more details. If it's a good fit, click the "Request to Join" button. The driver will be notified and can approve your request.
            </p>
          </div>
          
          <div className="faq-item">
            <h3>What should I do if I need to cancel?</h3>
            <p>
              If your plans change, please act quickly. If you're a driver, you can delete your carpool from its detail page. If you're a passenger, you can cancel your request from the "My Trips" section. In either case, it's a good idea to communicate with the other members of the carpool as a courtesy.
            </p>
          </div>
          
          <h3>Contact Us</h3>
          <p>
            Still have questions? Reach out our support team (Samih :D) at <a href="mailto:samih@stanford.edu">samih@stanford.edu</a>, and we'll be happy to help.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Help; 