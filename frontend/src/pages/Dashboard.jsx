import React, { useState, useEffect, useContext, useRef } from 'react';
import { Link } from 'react-router-dom';
import Select from 'react-select';
import { AuthContext } from '../contexts/AuthContext';
import { tagSelectStyles } from '../styles/tagStyles';
import './Dashboard.css';

const CARPOOL_TYPES = {
    airport: { label: 'Airport', icon: '✈️' },
    event: { label: 'Event', icon: '🎉' },
    commute: { label: 'Commute', icon: '🚗' },
    recurring: { label: 'Recurring', icon: '🔁' },
};

const Dashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const [carpools, setCarpools] = useState([]);
  const [tags, setTags] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const profileRef = useRef(null);
  const [carpoolTypeFilter, setCarpoolTypeFilter] = useState(null);

  const [filters, setFilters] = useState({
    search: '',
    tags: [],
    date_from: '',
    date_to: '',
    available_only: false,
    sortBy: 'departure_date',
    sortOrder: 'ASC'
  });

  const fetchTags = async () => {
    try {
      const response = await fetch('/api/tags');
      if (response.ok) {
        const data = await response.json();
        setTags(data.map(tag => ({ value: tag.id, label: tag.name, color: tag.color })));
      }
    } catch (err) {
      console.error("Failed to fetch tags:", err);
    }
  };

  const fetchCarpools = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (carpoolTypeFilter && carpoolTypeFilter !== 'all') {
        params.append('type', carpoolTypeFilter);
      }
      if (filters.search) params.append('search', filters.search);
      if (filters.tags.length) params.append('tags', filters.tags.join(','));
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);
      if (filters.available_only) params.append('available_only', 'true');
      params.append('sortBy', filters.sortBy);
      params.append('sortOrder', filters.sortOrder);
      
      const response = await fetch(`/api/carpools?${params.toString()}`, { credentials: 'include' });
      if (response.ok) {
        setCarpools(await response.json());
      } else {
        setError('Failed to fetch carpools');
      }
    } catch (err) {
      setError('Failed to fetch carpools');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTags(); }, []);
  useEffect(() => {
    fetchCarpools();
  }, [filters, carpoolTypeFilter]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const handleSelectCarpool = (carpool) => {
    setSelected(carpool);
    setIsEditing(false);
  };

  const handleFilterChange = (e) => setFilters(prev => ({ ...prev, [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const handleTagFilterChange = (selectedOptions) => setFilters(prev => ({ ...prev, tags: selectedOptions ? selectedOptions.map(o => o.value) : [] }));
  
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this trip?')) {
        try {
            const response = await fetch(`/api/carpools/${id}`, { method: 'DELETE', credentials: 'include' });
            if (response.ok) {
                fetchCarpools();
                setSelected(null);
            } else {
                alert('Failed to delete trip.');
            }
        } catch (err) {
            alert('An error occurred while deleting the trip.');
        }
    }
  };
  
  const handleSave = async (updatedData) => {
    try {
        const response = await fetch(`/api/carpools/${selected.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(updatedData),
        });
        if (response.ok) {
            const newSelected = await response.json();
            await fetchCarpools();
            setSelected(newSelected);
            setIsEditing(false);
        } else {
            const errData = await response.json();
            throw new Error(errData.error || 'Failed to save changes.');
        }
    } catch(err) {
        alert(err.message);
    }
  };

  const selectedTagObjects = tags.filter(tag => filters.tags.includes(tag.value));

  return (
    <div className="dashboard wave-bg">
      <header className="dash-header">
        <div className="left">
          <h1 className="cardipool-text">cardipools:</h1>
          <Link to="/add" className="add-btn">+ add</Link>
        </div>
        <nav className="right">
          <Link to="/info">Info</Link>
          <Link to="/help">Help</Link>
          <Link to="/my-trips">My Trips</Link>
          <div className="profile" onClick={() => setMenuOpen(p => !p)} ref={profileRef}>
            <span role="img" aria-label="profile">👤</span>
            <span className="profile-name">{user?.firstName || user?.sunetId}</span>
            {menuOpen && (
              <div className="profile-menu">
                <div className="name">{user?.displayName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.sunetId}</div>
                <div className="sunet-id">{user?.sunetId}</div>
                {user?.email && <div className="email">{user?.email}</div>}
                <button onClick={logout} className="logout-btn">Log out</button>
              </div>
            )}
          </div>
        </nav>
      </header>
      
      <div className="content">
        <aside className="list">
          {carpoolTypeFilter ? (
            <>
              <div className="filters">
                  <button onClick={() => { setCarpoolTypeFilter(null); setSelected(null); }} className="back-to-types-btn">
                      &larr; Back to Types
                  </button>
                  <h3>{CARPOOL_TYPES[carpoolTypeFilter]?.label || 'All'} Carpools</h3>
                  <input type="text" name="search" placeholder="Search by keyword..." value={filters.search} onChange={handleFilterChange} className="search-input" />
                  <div className="date-filters">
                    <input type="date" name="date_from" value={filters.date_from} onChange={handleFilterChange} />
                    <span>to</span>
                    <input type="date" name="date_to" value={filters.date_to} onChange={handleFilterChange} />
                  </div>
                  <Select isMulti name="tags" options={tags} value={selectedTagObjects} onChange={handleTagFilterChange} styles={tagSelectStyles} placeholder="Filter by tags..." />
                  <label className="available-only-filter">
                    <input type="checkbox" name="available_only" checked={filters.available_only} onChange={handleFilterChange} />
                    Show available only
                  </label>
                  <div className="sort-filter">
                      <select name="sortBy" value={filters.sortBy} onChange={handleFilterChange}>
                          <option value="departure_date">Departure Date</option>
                          <option value="created_at">Recently Created</option>
                          <option value="capacity">Capacity</option>
                      </select>
                      <select name="sortOrder" value={filters.sortOrder} onChange={handleFilterChange}>
                          <option value="ASC">Asc</option>
                          <option value="DESC">Desc</option>
                      </select>
                  </div>
              </div>
              <CarpoolList carpools={carpools} selected={selected} onSelect={handleSelectCarpool} loading={loading} />
            </>
          ) : (
            <div className="type-selection">
                <h3>What kind of carpool do you need?</h3>
                <div className="type-grid">
                    {Object.entries(CARPOOL_TYPES).map(([key, { label, icon }]) => (
                        <div key={key} className="type-card" onClick={() => setCarpoolTypeFilter(key)}>
                            <span className="type-icon">{icon}</span>
                            <span>{label}</span>
                        </div>
                    ))}
                    <div className="type-card" onClick={() => setCarpoolTypeFilter('all')}>
                        <span className="type-icon">🌍</span>
                        <span>All Carpools</span>
                    </div>
                </div>
            </div>
          )}
        </aside>
        <main className="details">
          {!carpoolTypeFilter ? (
            <div className="select-carpool"><p>Select a category to see available rides.</p></div>
          ) : selected ? (
            isEditing ? (
              <EditCarpoolForm carpool={selected} onSave={handleSave} onCancel={() => setIsEditing(false)} allTags={tags} />
            ) : (
              <CarpoolDetails carpool={selected} user={user} onEdit={() => setIsEditing(true)} onDelete={handleDelete} onUpdate={fetchCarpools} />
            )
          ) : (
            <div className="select-carpool"><p>Select a carpool to view details.</p></div>
          )}
        </main>
      </div>
    </div>
  );
}

const CarpoolList = ({ carpools, selected, onSelect, loading }) => {
    const formatDate = d => d ? new Date(d).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) : 'N/A';
    const formatTime = t => t ? new Date(`1970-01-01T${t}`).toLocaleTimeString(undefined, {hour: 'numeric', minute: '2-digit'}) : '';

    if (loading) return <div className="spinner-overlay"><div className="spinner"></div></div>;
    if (carpools.length === 0) return (
        <div className="empty-state">
            <p>No carpools match your filters</p>
            <Link to="/add" className="add-carpool-link">Create a new carpool</Link>
        </div>
    );
    return (
        <div className="carpool-list-container">
            {carpools.map(c => (
                <div key={c.id} className={`item ${selected?.id === c.id ? 'active' : ''}`} onClick={() => onSelect(c)}>
                    <h3>{c.title}</h3>
                    <div className="item-details">
                        <span>📅 {formatDate(c.departure_date)} at {formatTime(c.departure_time)}</span>
                        <span>{c.current_passengers}/{c.capacity} seats</span>
                    </div>
                    <div className="item-tags">
                        {c.tag_details?.map(t => <span key={t.id} className="tag" style={{'--tag-color': t.color}}>{t.name}</span>)}
                    </div>
                </div>
            ))}
        </div>
    );
};

const CarpoolDetails = ({ carpool, user, onEdit, onDelete, onUpdate }) => {
    const [joinRequestStatus, setJoinRequestStatus] = useState({ loading: false, error: null, success: null });
    const [carpoolRequests, setCarpoolRequests] = useState([]);

    const formatDate = d => d ? new Date(d).toLocaleDateString(undefined, {year: 'numeric', month: 'long', day: 'numeric'}) : 'N/A';
    const formatTime = t => t ? new Date(`1970-01-01T${t}`).toLocaleTimeString(undefined, {hour: 'numeric', minute: '2-digit'}) : '';
    
    useEffect(() => {
        const fetchRequests = async () => {
            if (user?.id === carpool.created_by) {
                try {
                    const response = await fetch(`/api/carpools/${carpool.id}/requests`, { credentials: 'include' });
                    const data = await response.json();
                    if(response.ok) setCarpoolRequests(data);
                } catch (err) { console.error("Failed to fetch join requests", err); }
            } else {
                setCarpoolRequests([]);
            }
        };
        fetchRequests();
    }, [carpool, user]);

    const handleJoinRequest = async () => {
        setJoinRequestStatus({ loading: true, error: null, success: null });
        try {
            const response = await fetch(`/api/carpools/${carpool.id}/join`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: 'I would like to join!' })
            });
            const data = await response.json();
            if (response.ok) {
                setJoinRequestStatus({ loading: false, error: null, success: 'Request sent successfully!' });
            } else {
                throw new Error(data.error || 'Failed to send request');
            }
        } catch (err) {
            setJoinRequestStatus({ loading: false, error: err.message, success: null });
        }
    };

    const handleRequestStatusUpdate = async (requestId, status) => {
        try {
            const response = await fetch(`/api/carpools/requests/${requestId}`, {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            if (response.ok) {
                setCarpoolRequests(prev => prev.map(r => r.id === requestId ? { ...r, status } : r));
                onUpdate();
            } else {
                const data = await response.json();
                alert(`Failed to update request: ${data.error}`);
            }
        } catch (err) {
            alert('An error occurred while updating the request.');
        }
    };

    return (
      <>
        <div className="details-header">
          <h2>{carpool.title}</h2>
          {user?.id === carpool.created_by && (
            <div className="carpool-actions">
              <button onClick={onEdit} className="edit-btn">Edit</button>
              <button onClick={() => onDelete(carpool.id)} className="delete-btn">Delete</button>
            </div>
          )}
        </div>
        {carpool.event_name && (
            <div className="detail-item event-name">
                <strong>Event:</strong> {carpool.event_name}
            </div>
        )}
        <div className="details-grid">
            <div><strong>Date:</strong> {formatDate(carpool.departure_date)}</div>
            <div><strong>Time:</strong> {formatTime(carpool.departure_time)}</div>
            <div><strong>Capacity:</strong> {carpool.current_passengers} / {carpool.capacity}</div>
            <div><strong>Creator:</strong> {carpool.creator_name} ({carpool.creator_sunet_id})</div>
        </div>
        <div className="detail-item">
            <strong>Pickup:</strong> {carpool.pickup_details || 'Not specified'}
        </div>
        <div className="detail-item">
            <strong>Dropoff:</strong> {carpool.dropoff_details || 'Not specified'}
        </div>
        <div className="details-tags">
          <strong>Tags:</strong> 
          {carpool.tag_details?.map(t => <span key={t.id} className="tag" style={{'--tag-color': t.color}}>{t.name}</span>)}
        </div>
        <p className="details-description">{carpool.description}</p>
        <p><strong>Contact:</strong> {carpool.contact}</p>

        {user?.id !== carpool.created_by && (
            <button onClick={handleJoinRequest} disabled={joinRequestStatus.loading} className="join-btn">
                {joinRequestStatus.loading ? 'Sending...' : 'Request to Join'}
            </button>
        )}
        {joinRequestStatus.error && <p className="status-error">{joinRequestStatus.error}</p>}
        {joinRequestStatus.success && <p className="status-success">{joinRequestStatus.success}</p>}
        
        {user?.id === carpool.created_by && carpoolRequests.length > 0 && (
            <div className="join-requests">
                <h3>Join Requests</h3>
                {carpoolRequests.map(req => (
                    <div key={req.id} className="request-item">
                        <div className="request-info">
                            <strong>{req.display_name}</strong> ({req.sunet_id})<br/>
                            <small>{req.email}</small>
                        </div>
                        <div className="request-actions">
                            {req.status === 'pending' ? (
                                <>
                                    <button onClick={() => handleRequestStatusUpdate(req.id, 'approved')} className="approve-btn">Approve</button>
                                    <button onClick={() => handleRequestStatusUpdate(req.id, 'rejected')} className="reject-btn">Reject</button>
                                </>
                            ) : (
                                <span className={`status-badge ${req.status}`}>{req.status}</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        )}
      </>
    );
};

const EditCarpoolForm = ({ carpool, onSave, onCancel, allTags }) => {
    const [editData, setEditData] = useState({
        title: carpool.title,
        description: carpool.description || '',
        contact: carpool.contact,
        departure_date: carpool.departure_date ? new Date(carpool.departure_date).toISOString().split('T')[0] : '',
        departure_time: carpool.departure_time || '',
        capacity: carpool.capacity,
        tags: carpool.tags || [],
        carpool_type: carpool.carpool_type || 'other',
        event_name: carpool.event_name || '',
        pickup_details: carpool.pickup_details || '',
        dropoff_details: carpool.dropoff_details || ''
    });
    const [isSaving, setIsSaving] = useState(false);

    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setEditData(prev => ({ ...prev, [name]: value }));
    };

    const handleEditTagsChange = (selectedOptions) => {
        setEditData(prev => ({ ...prev, tags: selectedOptions ? selectedOptions.map(option => option.value) : [] }));
    };

    const handleSave = (e) => {
        e.preventDefault();
        setIsSaving(true);
        onSave(editData).finally(() => setIsSaving(false));
    };

    if (isSaving) {
        return <div className="carpool-card"><LoadingSpinner /></div>;
    }

    const availableTagsForSelect = allTags.map(t => ({ value: t.id, label: t.name }));
    const selectedTagsForSelect = availableTagsForSelect.filter(t => editData.tags.includes(t.value));

    return (
        <form className="details-edit-form" onSubmit={handleSave}>
            <h3>Edit Carpool</h3>

            <label>Title</label>
            <input type="text" name="title" value={editData.title} onChange={handleEditChange} placeholder="Title" required />
            
            <label>Description</label>
            <textarea name="description" value={editData.description} onChange={handleEditChange} placeholder="Description" />
            
            <div className="form-grid">
                <div>
                    <label>From</label>
                    <input type="text" name="from_location" value={editData.from_location} onChange={handleEditChange} placeholder="From" required />
                </div>
                <div>
                    <label>To</label>
                    <input type="text" name="to_location" value={editData.to_location} onChange={handleEditChange} placeholder="To" required />
                </div>
            </div>
            
            <div className="form-grid">
                <div>
                    <label>Date</label>
                    <input type="date" name="departure_date" value={editData.departure_date} onChange={handleEditChange} required />
                </div>
                <div>
                    <label>Time</label>
                    <input type="time" name="departure_time" value={editData.departure_time} onChange={handleEditChange} required />
                </div>
            </div>
            
            <label>Type</label>
            <select name="carpool_type" value={editData.carpool_type} onChange={handleEditChange} required>
                <option value="other">Other</option>
                <option value="airport">Airport</option>
                <option value="event">Event</option>
                <option value="commute">Commute</option>
            </select>

            {editData.carpool_type === 'event' && (
                <>
                    <label>Event Name</label>
                    <input type="text" name="event_name" value={editData.event_name} onChange={handleEditChange} placeholder="Event Name" />
                </>
            )}

            <label>Pickup Details</label>
            <textarea name="pickup_details" value={editData.pickup_details} onChange={handleEditChange} placeholder="e.g. Tresidder flagpole" />
            
            <label>Dropoff Details</label>
            <textarea name="dropoff_details" value={editData.dropoff_details} onChange={handleEditChange} placeholder="e.g. SFO Terminal 1" />

            <div className="form-grid">
                <div>
                    <label>Capacity</label>
                    <input type="number" name="capacity" value={editData.capacity} onChange={handleEditChange} placeholder="Capacity" required min="1" />
                </div>
                <div>
                    <label>Contact Info</label>
                    <input type="text" name="contact" value={editData.contact} onChange={handleEditChange} placeholder="Contact Info" required />
                </div>
            </div>

            <label>Tags</label>
            <Select isMulti name="tags" options={availableTagsForSelect} className="basic-multi-select" classNamePrefix="select"
                placeholder="Select tags..." onChange={handleEditTagsChange} value={selectedTagsForSelect}
            />

            <div className="form-actions">
                <button type="submit" className="save-btn" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save'}</button>
                <button type="button" onClick={onCancel} className="cancel-btn">Cancel</button>
            </div>
        </form>
    );
};

export default Dashboard;