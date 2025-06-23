import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './Dashboard.css';

function Dashboard() {
  const [carpools, setCarpools] = useState([]);
  const [selected, setSelected] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    fetch('/api/carpools')
      .then(res => res.json())
      .then(setCarpools);
  }, []);

  const toggleMenu = () => setMenuOpen(prev => !prev);
  const handleLogout = () => {
    // TODO: integrate auth logout
    window.location.href = '/';
  };

  return (
    <div className="dashboard wave-bg">
      <header className="dash-header">
        <div className="left">
          <h1 className="cardipool-text">Cardipools</h1>
          <Link to="/add" className="add-btn">+ add</Link>
        </div>
        <nav className="right">
          <a href="#info">Info</a>
          <a href="#help">Help</a>
          <div className="profile" onClick={toggleMenu}>
            <span role="img" aria-label="profile">👤</span>
            {menuOpen && (
              <div className="profile-menu">
                <div className="name">(name)</div>
                <Link to="#trips">Your trips</Link>
                <button onClick={handleLogout}>Log out</button>
              </div>
            )}
          </div>
        </nav>
      </header>
      <div className="content">
        <aside className="list">
          {carpools.map(c => (
            <div
              key={c.id}
              className={`item ${selected && selected.id === c.id ? 'active' : ''}`}
              onClick={() => setSelected(c)}
            >
              <h3>{c.title}</h3>
              <small>{c.tags?.join(', ')}</small>
            </div>
          ))}
        </aside>
        <main className="details">
          {selected ? (
            <>
              <h2>{selected.title}</h2>
              <p>{selected.description}</p>
              <p>
                <strong>Contact:</strong> {selected.contact}
              </p>
            </>
          ) : (
            <p>Select a carpool to view details.</p>
          )}
        </main>
      </div>
    </div>
  );
}

export default Dashboard; 