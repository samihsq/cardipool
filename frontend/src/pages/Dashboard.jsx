import React, { useState, useEffect, useContext, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Select from 'react-select';
import Calendar from 'react-calendar';
import { FaCalendarAlt } from 'react-icons/fa';
import { AuthContext } from '../contexts/AuthContext';
import { tagSelectStyles } from '../styles/tagStyles';
import LoadingSpinner from '../components/LoadingSpinner';
import EditCarpoolForm from '../components/EditCarpoolForm';
import './Dashboard.css';
import 'react-calendar/dist/Calendar.css';
import '../styles/tagStyles.css';

const CARPOOL_TYPES = {
    airport: { label: 'Airport', icon: '✈️' },
    event: { label: 'Event', icon: '🎉' },
    commute: { label: 'Commute', icon: '🚗' },
    recurring: { label: 'Recurring', icon: '🔁' },
};

const Dashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [carpools, setCarpools] = useState([]);
  const [tags, setTags] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [carpoolTypeFilter, setCarpoolTypeFilter] = useState(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [carpoolDates, setCarpoolDates] = useState([]);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const profileRef = useRef(null);

  const [filters, setFilters] = useState({
    search: '',
    tags: [],
    date_from: '',
    date_to: '',
    available_only: false,
    sortBy: 'departure_date',
    sortOrder: 'ASC'
  });

  useEffect(() => {
    const fetchPendingRequests = async () => {
      try {
        const response = await fetch('/api/notifications/pending-requests', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          setPendingRequestsCount(data.pendingRequests || 0);
        }
      } catch (error) {
        console.error('Failed to fetch pending requests count:', error);
      }
    };

    fetchPendingRequests(); // Fetch on initial load
    const intervalId = setInterval(fetchPendingRequests, 30000); // Poll every 30 seconds

    return () => clearInterval(intervalId);
  }, []);

  const fetchCarpoolsForCalendar = async () => {
    try {
      const params = new URLSearchParams();
      if (carpoolTypeFilter && carpoolTypeFilter !== 'all') {
        params.append('type', carpoolTypeFilter);
      }
      // No date filters for calendar view
      if (filters.search) params.append('search', filters.search);
      if (filters.tags.length) params.append('tags', filters.tags.join(','));
      if (filters.available_only) params.append('available_only', 'true');

      const response = await fetch(`/api/carpools?${params.toString()}`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        const dates = data.map(c => c.departure_date.split('T')[0]);
        setCarpoolDates([...new Set(dates)]); // Store unique dates
      }
    } catch (err) {
      console.error("Failed to fetch carpools for calendar:", err);
    }
  };

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
      
      // Only apply type filter if we have one and it's not 'all'
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
        const data = await response.json();
        setCarpools(data);
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
    if (carpoolTypeFilter) {
      if (showCalendar) {
        fetchCarpoolsForCalendar();
      } else {
        fetchCarpools();
      }
    } else {
      setCarpools([]);
    }
  }, [filters, carpoolTypeFilter, showCalendar]);

  // Handle navigation state changes (new carpool creation and type filter)
  useEffect(() => {
    if (location.state?.carpoolType) {
      setCarpoolTypeFilter(location.state.carpoolType);
      
      // If there's also a new carpool ID, wait for the next render after setting type filter
      if (location.state.newCarpoolId && carpools.length > 0) {
        const carpoolToSelect = carpools.find(c => c.id === location.state.newCarpoolId);
        if (carpoolToSelect) {
          setSelected(carpoolToSelect);
          // Clear the navigation state after handling everything
          navigate(location.pathname, { replace: true, state: {} });
        }
      }
    }
  }, [location.state, carpools, navigate]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelectCarpool = (carpool) => {
    setSelected(carpool);
    setIsEditing(false);
  };

  const handleCarpoolTypeSelect = (key) => {
    setCarpools([]);
    setLoading(true);
    setCarpoolTypeFilter(key);
  };

  const handleFilterChange = (e) => setFilters(prev => ({ ...prev, [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const handleTagFilterChange = (selectedOptions) => setFilters(prev => ({ ...prev, tags: selectedOptions ? selectedOptions.map(o => o.value) : [] }));
  
  const handleDateSelect = (date) => {
    const formattedDate = date.toISOString().split('T')[0];
    setFilters(prev => ({ ...prev, date_from: formattedDate, date_to: formattedDate }));
    setShowCalendar(false);
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      tags: [],
      date_from: '',
      date_to: '',
      available_only: false,
      sortBy: 'departure_date',
      sortOrder: 'ASC'
    });
  };
  
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
    <div className={`dashboard wave-bg ${selected ? 'details-visible-mobile' : ''}`}>
      <header className="dash-header">
        <div className="left">
          <h1 className="cardipool-text">cardipools:</h1>
          <button onClick={() => navigate('/add', { state: { defaultType: carpoolTypeFilter } })} className="add-btn">
            + add
          </button>
        </div>
        <nav className="right">
          <Link to="/my-trips" className="my-trips-link">
            My Trips
            {pendingRequestsCount > 0 && (
              <span className="notification-indicator">{pendingRequestsCount}</span>
            )}
          </Link>
          <div className="header-icons">
            <Link to="/info" className="header-icon" title="Information">
              Info
            </Link>
            <Link to="/help" className="header-icon" title="Help">
              Help
            </Link>
          </div>
          <div className="profile" ref={profileRef}>
            <button 
              className="profile-button"
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            >
              <div className="profile-icon">
                {user?.displayName?.[0] || user?.sunetId?.[0] || '👤'}
              </div>
            </button>
            <div className={`profile-dropdown ${showProfileDropdown ? 'open' : ''}`}>
              <div className="profile-info">
                <div className="profile-name">{user?.displayName || user?.sunetId}</div>
                <div className="profile-email">{user?.email || user?.sunetId + '@stanford.edu'}</div>
              </div>
              <div className="dropdown-links">
                <Link to="/info" className="dropdown-link">Info</Link>
                <Link to="/help" className="dropdown-link">Help</Link>
              </div>
              <button onClick={logout} className="logout-btn">Log out</button>
            </div>
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
                  <div className="filter-header">
                    <h3>{CARPOOL_TYPES[carpoolTypeFilter]?.label || 'All'} Carpools</h3>
                    <button onClick={() => setShowCalendar(!showCalendar)} className="calendar-toggle-btn" title="Toggle Calendar View">
                        <FaCalendarAlt />
                    </button>
                  </div>
                  
                  {showCalendar ? (
                    <Calendar
                        onChange={handleDateSelect}
                        tileClassName={({ date, view }) => {
                            if (view === 'month') {
                                const dateString = date.toISOString().split('T')[0];
                                if (carpoolDates.includes(dateString)) {
                                    return 'has-carpool';
                                }
                            }
                        }}
                    />
                  ) : (
                    <>
                      <div className="search-container">
                        <input type="text" name="search" placeholder="Search by keyword..." value={filters.search} onChange={handleFilterChange} className="search-input" />
                        {(filters.search || filters.tags.length > 0 || filters.date_from || filters.date_to || filters.available_only) && (
                          <button type="button" onClick={clearFilters} className="clear-filters-btn" title="Clear all filters">
                            Clear
                          </button>
                        )}
                      </div>
                      <div className="date-filters">
                        <input type="date" name="date_from" value={filters.date_from} onChange={handleFilterChange} />
                        <span>to</span>
                        <input type="date" name="date_to" value={filters.date_to} onChange={handleFilterChange} />
                      </div>

                      <div 
                          className={`advanced-filters-toggle ${showAdvancedFilters ? 'open' : ''}`}
                          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                      >
                          <span>Advanced</span>
                          <span className="toggle-icon"></span>
                      </div>

                      <div className={`advanced-filters-content ${showAdvancedFilters ? 'open' : ''}`}>
                          <Select isMulti name="tags" options={tags} value={selectedTagObjects} onChange={handleTagFilterChange} styles={tagSelectStyles} placeholder="Filter by tags..." />
                          <label className="available-only-filter">
                            <input type="checkbox" name="available_only" checked={filters.available_only} onChange={handleFilterChange} />
                            Show available only
                          </label>
                          <div className="sort-filter">
                              <label htmlFor="sortBy">Sort by:</label>
                              <div className="sort-filter-controls">
                                <select name="sortBy" id="sortBy" value={filters.sortBy} onChange={handleFilterChange}>
                                    <option value="departure_date">Departure Date</option>
                                    <option value="capacity">Capacity</option>
                                    <option value="created_at">Recently Created</option>
                                </select>
                                <select name="sortOrder" value={filters.sortOrder} onChange={handleFilterChange} aria-label="Sort order">
                                    <option value="ASC">Asc</option>
                                    <option value="DESC">Desc</option>
                                </select>
                              </div>
                          </div>
                      </div>
                    </>
                  )}
              </div>
              
              <CarpoolList carpools={carpools} selected={selected} onSelect={handleSelectCarpool} loading={loading} carpoolTypeFilter={carpoolTypeFilter} />
              
              <div className="add-ride-footer">
                  <button onClick={() => navigate('/add', { state: { defaultType: carpoolTypeFilter } })} className="add-ride-btn">
                      + Add a Ride
                  </button>
              </div>
            </>
          ) : (
            <div className="type-selection">
                <h3>What kind of carpool do you need?</h3>
                <div className="type-grid">
                    {Object.entries(CARPOOL_TYPES).map(([key, { label, icon }]) => (
                        <div key={key} className="type-card" onClick={() => handleCarpoolTypeSelect(key)}>
                            <span className="type-icon">{icon}</span>
                            <span>{label}</span>
                        </div>
                    ))}
                    <div className="type-card" onClick={() => handleCarpoolTypeSelect('all')}>
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
              <CarpoolDetails carpool={selected} user={user} onEdit={() => setIsEditing(true)} onDelete={handleDelete} onUpdate={fetchCarpools} onBack={() => setSelected(null)} />
            )
          ) : (
            <div className="select-carpool"><p>Select a carpool to view details.</p></div>
          )}
        </main>
      </div>
    </div>
  );
}

const CarpoolList = ({ carpools, selected, onSelect, loading, carpoolTypeFilter }) => {
    const getDepartureDateTime = (carpool) => {
        const datePart = carpool.departure_date.split('T')[0];
        return new Date(`${datePart}T${carpool.departure_time || '00:00:00'}`);
    };

    const formatDate = d => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const formatTime = t => t ? new Date(`1970-01-01T${t}Z`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) : '';

    return (
        <div className="carpool-list-container">
            {loading && (
                <div className="spinner-overlay"><LoadingSpinner /></div>
            )}
            
            {carpools.length === 0 && !loading && (
                <div className="empty-state">
                    <p>No carpools match your filter</p>
                    <Link to="/add" state={{ defaultType: carpoolTypeFilter }} className="add-carpool-link">+ Add a new carpool</Link>
                </div>
            )}
            
            {carpools.map(carpool => {
                const isCompleted = getDepartureDateTime(carpool) < new Date();
                return (
                    <div key={carpool.id} className={`carpool-card ${selected?.id === carpool.id ? 'selected' : ''} ${isCompleted ? 'completed' : ''}`} onClick={() => onSelect(carpool)}>
                        {isCompleted && <div className="completed-overlay">Ride Complete</div>}
                        <div className="card-header">
                            <h4 className="card-title">{carpool.title}</h4>
                            <div className="card-capacity">{carpool.current_passengers}/{carpool.capacity} seats</div>
                        </div>
                        <div className="card-body">
                            <div className="card-tags">
                                {carpool.tag_details?.map(tag => (
                                    <span 
                                        key={tag.id} 
                                        className="tag" 
                                        style={{ 
                                            '--tag-color': tag.color,
                                            '--tag-color-rgb': tag.color.replace('#', '').match(/.{2}/g).map(x => parseInt(x, 16)).join(', '),
                                            color: tag.color
                                        }}
                                    >
                                        {tag.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div className="card-footer">
                            <div className="card-departure">{formatDate(carpool.departure_date)} @ {formatTime(carpool.departure_time)}</div>
                            <div className="card-creator">by {carpool.creator_name}</div>
                        </div>
                    </div>
                )
            })}
        </div>
    );
};

const CarpoolDetails = ({ carpool, user, onEdit, onDelete, onUpdate, onBack }) => {
    const [joinRequests, setJoinRequests] = useState([]);
    const [passengers, setPassengers] = useState([]);
    const [isRequesting, setIsRequesting] = useState(false);
    const [userRequestStatus, setUserRequestStatus] = useState(null);

    const formatDeparture = () => {
        if (!carpool.departure_date || !carpool.departure_time) return 'N/A';
        return new Date(carpool.departure_date).toLocaleDateString() + ' at ' + new Date(`1970-01-01T${carpool.departure_time}Z`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' });
    };

    const fetchPassengers = async () => {
        if (!carpool.id) return;
        try {
            const response = await fetch(`/api/carpools/${carpool.id}/passengers`, { credentials: 'include' });
            const data = await response.json();
            if (response.ok) setPassengers(data);
        } catch (err) {
            console.error("Failed to fetch passengers", err);
        }
    };

    useEffect(() => {
        const fetchRequestsAndStatus = async () => {
            // Fetch owner's view of all requests
            if (user?.id === carpool.created_by) {
                try {
                    const response = await fetch(`/api/carpools/${carpool.id}/requests`, { credentials: 'include' });
                    const data = await response.json();
                    if(response.ok) setJoinRequests(data);
                } catch (err) { console.error("Failed to fetch join requests", err); }
            } else {
                setJoinRequests([]);
                 // Fetch requester's view of their own status
                try {
                    const response = await fetch(`/api/carpools/${carpool.id}/my-request-status`, { credentials: 'include' });
                    const data = await response.json();
                    if (response.ok) setUserRequestStatus(data.status);
                } catch (err) { console.error("Failed to fetch user request status", err); }
            }
        };

        if (carpool.id) {
            fetchRequestsAndStatus();
            fetchPassengers();
        }
    }, [carpool.id, user?.id, carpool.created_by]);

    const handleJoinRequest = async () => {
        setIsRequesting(true);
        try {
            const response = await fetch(`/api/carpools/${carpool.id}/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ message: "I'd like to join!" })
            });
            const data = await response.json();
            if (response.ok) {
                setIsRequesting(false);
                setUserRequestStatus('pending'); // Immediately update UI
                alert('Request sent!');
            } else {
                throw new Error(data.error || 'Failed to send request');
            }
        } catch (err) {
            setIsRequesting(false);
            alert(err.message);
        }
    };
    
    const handleRequestStatusUpdate = async (requestId, status) => {
        try {
            const response = await fetch(`/api/carpools/${carpool.id}/requests/${requestId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ status })
            });
            if (response.ok) {
                setJoinRequests(prev => prev.map(r => r.id === requestId ? { ...r, status } : r));
                if (status === 'approved') {
                    fetchPassengers(); // Re-fetch passengers on approval
                }
                onUpdate(); // Re-fetch carpools to update capacity
            } else {
                throw new Error('Failed to update request status');
            }
        } catch (err) {
            alert(err.message);
        }
    };

    const handleRemovePassenger = async (passengerId) => {
        if (window.confirm('Are you sure you want to remove this passenger from the carpool?')) {
            try {
                const response = await fetch(`/api/carpools/${carpool.id}/passengers/${passengerId}`, {
                    method: 'DELETE',
                    credentials: 'include'
                });

                if (response.ok) {
                    fetchPassengers(); // Re-fetch passengers
                    onUpdate(); // Re-fetch carpools to update capacity
                } else {
                    const data = await response.json();
                    throw new Error(data.error || 'Failed to remove passenger');
                }
            } catch (err) {
                alert(err.message);
            }
        }
    };

    if (!carpool) {
        return <div className="details-placeholder">Select a carpool to see details</div>;
    }

    return (
        <>
            <div className="detail-header">
                <button onClick={onBack} className="back-btn-mobile">&larr; Back</button>
                <h2>{carpool.title}</h2>
                <div className="detail-header-actions">
                    {user?.id === carpool.created_by && (
                        <>
                            <button onClick={() => onEdit(carpool)} className="edit-btn">Edit</button>
                            <button onClick={() => onDelete(carpool.id)} className="delete-btn">Delete</button>
                        </>
                    )}
                </div>
            </div>
            
            <div className="detail-tags">
                {carpool.tag_details?.map(tag => (
                    <span 
                        key={tag.id} 
                        className="tag" 
                        style={{ 
                            '--tag-color': tag.color,
                            '--tag-color-rgb': tag.color.replace('#', '').match(/.{2}/g).map(x => parseInt(x, 16)).join(', '),
                            color: tag.color
                        }}
                    >
                        {tag.name}
                    </span>
                ))}
            </div>

            <div className="details-body">
                <div className="details-main">
                    <div className="detail-grid">
                        <div className="detail-item">
                            <span className="detail-label">📍 From</span>
                            <span className="detail-value">{carpool.pickup_details || 'N/A'}</span>
                        </div>
                        <div className="detail-item">
                            <span className="detail-label">📍 To</span>
                            <span className="detail-value">{carpool.dropoff_details || 'N/A'}</span>
                        </div>
                        <div className="detail-item">
                            <span className="detail-label">🗓️ Departure</span>
                            <span className="detail-value">{formatDeparture()}</span>
                        </div>
                        <div className="detail-item">
                            <span className="detail-label">👥 Capacity</span>
                            <span className="detail-value">{carpool.current_passengers} / {carpool.capacity} seats</span>
                        </div>
                        <div className="detail-item">
                            <span className="detail-label">📧 Contact</span>
                            <span className="detail-value">
                              {carpool.email && (
                                <a href={`mailto:${carpool.email}`}>{carpool.email}</a>
                              )}
                              {carpool.email && carpool.phone && <br />}
                              {carpool.phone && (
                                <a href={`tel:${carpool.phone}`}>{carpool.phone}</a>
                              )}
                              {!(carpool.email || carpool.phone) && 'Not provided'}
                            </span>
                        </div>
                        <div className="detail-item">
                            <span className="detail-label">👤 Created By</span>
                            <span className="detail-value">{carpool.creator_name}</span>
                        </div>
                    </div>
                    {passengers.length > 0 && (
                        <div className="passenger-list">
                            <h4>Passengers</h4>
                            <ul>
                                {passengers.map(p => (
                                    <li key={p.id}>
                                        {p.display_name}
                                        {user?.id === carpool.created_by && (
                                            <button onClick={() => handleRemovePassenger(p.id)} className="remove-passenger-btn">
                                                &times;
                                            </button>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
                <div className="details-side">
                    <div className="detail-item multiline">
                        <span className="detail-label">📝 Description</span>
                        <p className="detail-value">{carpool.description || 'No description provided.'}</p>
                    </div>
                    
                    <div className="join-section">
                        {user?.id !== carpool.created_by && (
                            <button 
                                onClick={handleJoinRequest} 
                                disabled={isRequesting || userRequestStatus} 
                                className="join-btn"
                            >
                                {isRequesting 
                                    ? 'Sending...' 
                                    : userRequestStatus === 'pending'
                                    ? 'Request Sent'
                                    : userRequestStatus === 'rejected'
                                    ? 'Request Rejected'
                                    : 'Request to Join'
                                }
                            </button>
                        )}
                        {user?.id === carpool.created_by && joinRequests.length > 0 && (
                            <div className="join-requests">
                                <h3>Join Requests</h3>
                                {joinRequests.map(req => (
                                    <div key={req.id} className="request-item">
                                        <div className="request-info">
                                            <strong>{req.display_name}</strong> ({req.sunet_id})
                                        </div>
                                        <div className="request-actions">
                                            {req.status === 'pending' ? (
                                                <>
                                                    <button onClick={() => handleRequestStatusUpdate(req.id, 'approved')} className="approve-btn">Approve</button>
                                                    <button onClick={() => handleRequestStatusUpdate(req.id, 'rejected')} className="reject-btn">Reject</button>
                                                </>
                                            ) : (
                                                <span className={`status ${req.status}`}>{req.status}</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default Dashboard;