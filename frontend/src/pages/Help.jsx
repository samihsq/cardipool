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
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor 
              incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud 
              exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
            </p>
          </div>
          
          <div className="faq-item">
            <h3>How do I join an existing carpool?</h3>
            <p>
              Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu 
              fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in 
              culpa qui officia deserunt mollit anim id est laborum.
            </p>
          </div>
          
          <div className="faq-item">
            <h3>What should I do if I need to cancel?</h3>
            <p>
              Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque 
              laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi 
              architecto beatae vitae dicta sunt explicabo.
            </p>
          </div>
          
          <div className="faq-item">
            <h3>How do I contact other users?</h3>
            <p>
              Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia 
              consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro 
              quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit.
            </p>
          </div>
          
          <h2>Troubleshooting</h2>
          
          <div className="faq-item">
            <h3>I can't log in with my Stanford credentials</h3>
            <p>
              Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit 
              laboriosam, nisi ut aliquid ex ea commodi consequatur. Quis autem vel eum iure 
              reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur.
            </p>
          </div>
          
          <div className="faq-item">
            <h3>The page is loading slowly</h3>
            <p>
              At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium 
              voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint 
              occaecati cupiditate non provident, similique sunt in culpa.
            </p>
          </div>
          
          <h2>Contact Support</h2>
          <p>
            If you need additional help, please contact our support team at support@cardipool.app 
            or visit our office hours. Lorem ipsum dolor sit amet, consectetur adipiscing elit, 
            sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Help; 