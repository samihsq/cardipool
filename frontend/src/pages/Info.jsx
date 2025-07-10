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
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor 
            incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud 
            exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
          </p>
          
          <h3>How It Works</h3>
          <p>
            Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu 
            fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in 
            culpa qui officia deserunt mollit anim id est laborum.
          </p>
          
          <h3>Getting Started</h3>
          <p>
            Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque 
            laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi 
            architecto beatae vitae dicta sunt explicabo.
          </p>
          
          <h3>Community Guidelines</h3>
          <p>
            Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia 
            consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro 
            quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit.
          </p>
          
          <h3>Safety First</h3>
          <p>
            Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit 
            laboriosam, nisi ut aliquid ex ea commodi consequatur. Quis autem vel eum iure 
            reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Info; 