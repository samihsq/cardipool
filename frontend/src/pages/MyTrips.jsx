import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Select from 'react-select';
import { tagSelectStyles } from '../styles/tagStyles';
import EditCarpoolForm from '../components/EditCarpoolForm';
import './MyTrips.css';

const MyTrips = () => {
    const [trips, setTrips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editingTripId, setEditingTripId] = useState(null);
    const [expandedTripIds, setExpandedTripIds] = useState(new Set());
    const [tripDetails, setTripDetails] = useState({}); // Stores { tripId: { requests, passengers } }
    const [allTags, setAllTags] = useState([]);

    const getDepartureDateTime = (trip) => {
        const datePart = trip.departure_date.split('T')[0];
        return new Date(`${datePart}T${trip.departure_time || '00:00:00'}`);
    };

    const fetchTripDetails = async (tripId) => {
        try {
            const reqResponse = await fetch(`/api/carpools/${tripId}/requests`, { credentials: 'include' });
            const passResponse = await fetch(`/api/carpools/${tripId}/passengers`, { credentials: 'include' });

            const requests = reqResponse.ok ? await reqResponse.json() : [];
            const passengers = passResponse.ok ? await passResponse.json() : [];

            setTripDetails(prevDetails => ({
                ...prevDetails,
                [tripId]: { requests, passengers }
            }));
        } catch (err) {
            console.error(`Failed to fetch details for trip ${tripId}:`, err);
        }
    };

    useEffect(() => {
        const fetchTags = async () => {
            try {
                const response = await fetch('/api/tags');
                if (response.ok) {
                    const data = await response.json();
                    setAllTags(data.map(tag => ({ value: tag.id, label: tag.name, color: tag.color })));
                }
            } catch (err) {
                console.error("Failed to fetch tags:", err);
            }
        };
        fetchTags();
    }, []);

    const fetchTrips = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/carpools/mine', { credentials: 'include' });
            if (response.ok) {
                const data = await response.json();
                const now = new Date();

                const upcoming = data
                    .filter(trip => getDepartureDateTime(trip) >= now)
                    .sort((a, b) => getDepartureDateTime(a) - getDepartureDateTime(b));

                const completed = data
                    .filter(trip => getDepartureDateTime(trip) < now)
                    .sort((a, b) => getDepartureDateTime(b) - getDepartureDateTime(a));
                
                setTrips([...upcoming, ...completed]);

                // Default to expanding all upcoming trips
                const upcomingTripIds = new Set(upcoming.map(trip => trip.id));
                setExpandedTripIds(upcomingTripIds);

                // Pre-fetch details for upcoming trips that the user owns
                upcoming.forEach(trip => {
                    if (trip.user_role === 'owner') {
                        fetchTripDetails(trip.id);
                    }
                });
            } else {
                setError('Failed to fetch your trips.');
            }
        } catch (err) {
            setError('An error occurred while fetching your trips.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTrips();
    }, []);

    const handleToggleDetails = (trip) => {
        const newExpandedIds = new Set(expandedTripIds);
        if (newExpandedIds.has(trip.id)) {
            newExpandedIds.delete(trip.id);
        } else {
            newExpandedIds.add(trip.id);
            // If expanding an owner's trip for the first time, fetch its details
            if (trip.user_role === 'owner' && !tripDetails[trip.id]) {
                fetchTripDetails(trip.id);
            }
        }
        setExpandedTripIds(newExpandedIds);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this trip?')) {
            try {
                const response = await fetch(`/api/carpools/${id}`, {
                    method: 'DELETE',
                    credentials: 'include',
                });

                if (response.ok) {
                    setTrips(trips.filter(trip => trip.id !== id));
                } else {
                    alert('Failed to delete trip.');
                }
            } catch (err) {
                alert('An error occurred while deleting the trip.');
                console.error(err);
            }
        }
    };
    
    const handleEditClick = (trip) => {
        setEditingTripId(trip.id);
    };

    const handleCancel = () => {
        setEditingTripId(null);
    };

    const handleDataRefresh = (tripId) => {
        fetchTrips(); // Refetch the main trips list (e.g., capacity changes)
        if (tripId) {
            fetchTripDetails(tripId); // Refetch details for the specific trip
        }
    };

    if (loading) return <div className="loading">Loading your trips...</div>;
    if (error) return <div className="error">{error}</div>;

    return (
        <div className="my-trips-container">
            <header className="my-trips-header">
                <h1>My Trips</h1>
                <div className="header-actions">
                    <Link to="/dashboard" className="back-to-dash-button">← Back to Dashboard</Link>
                    <Link to="/add" className="add-trip-button">+ Add New Trip</Link>
                </div>
            </header>
            
            {trips.length === 0 ? (
                <div className="no-trips">
                    <h2>You haven't created or joined any trips yet.</h2>
                    <Link to="/add">Create one now!</Link>
                </div>
            ) : (
                <div className="trips-list">
                    {trips.map(trip => {
                        const isCompleted = getDepartureDateTime(trip) < new Date();
                        const isExpanded = expandedTripIds.has(trip.id);
                        const details = tripDetails[trip.id] || { requests: [], passengers: [] };

                        return (
                            <div key={trip.id} className={`trip-card ${isCompleted ? 'completed' : ''}`}>
                                {isCompleted && <div className="completed-overlay">Ride Complete</div>}
                                {editingTripId === trip.id ? (
                                    <EditCarpoolForm 
                                        carpool={trip} 
                                        onSave={() => { setEditingTripId(null); fetchTrips(); }}
                                        onCancel={handleCancel}
                                        allTags={allTags}
                                    />
                                ) : (
                                    <TripDetails 
                                        trip={trip} 
                                        isExpanded={isExpanded}
                                        joinRequests={details.requests}
                                        passengers={details.passengers}
                                        onToggleDetails={handleToggleDetails}
                                        onEdit={handleEditClick}
                                        onDelete={handleDelete}
                                        onDataRefresh={handleDataRefresh}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

// Component for displaying trip details
const TripDetails = ({ trip, isExpanded, joinRequests, passengers, onToggleDetails, onEdit, onDelete, onDataRefresh }) => {
    
    const handleRequestStatusUpdate = async (requestId, status) => {
        try {
            const response = await fetch(`/api/carpools/${trip.id}/requests/${requestId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ status })
            });
            if (response.ok) {
                onDataRefresh(trip.id);
            } else {
                throw new Error('Failed to update request status');
            }
        } catch (err) {
            alert(err.message);
        }
    };

    const handleRemovePassenger = async (passengerId) => {
        if (window.confirm('Are you sure you want to remove this passenger?')) {
            try {
                const response = await fetch(`/api/carpools/${trip.id}/passengers/${passengerId}`, {
                    method: 'DELETE',
                    credentials: 'include'
                });
                if (response.ok) {
                    onDataRefresh(trip.id);
                } else {
                    const data = await response.json();
                    throw new Error(data.error || 'Failed to remove passenger');
                }
            } catch (err) {
                alert(err.message);
            }
        }
    };
    
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };
    
    const formatTime = (timeString) => {
        if (!timeString) return '';
        const [hours, minutes] = timeString.split(':');
        const h = parseInt(hours, 10);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const formattedHour = h % 12 || 12;
        return `${formattedHour}:${minutes} ${ampm}`;
    };

    const pendingRequests = trip.user_role === 'owner' ? joinRequests.filter(r => r.status === 'pending') : [];

    return (
        <>
            <div className="trip-card-header" onClick={() => onToggleDetails(trip)}>
                <h3>{trip.title}</h3>
                <div className="trip-actions">
                    {trip.user_role === 'owner' ? (
                        <>
                            <button onClick={(e) => { e.stopPropagation(); onEdit(trip); }} className="edit-button">Edit</button>
                            <button onClick={(e) => { e.stopPropagation(); onDelete(trip.id); }} className="delete-button">Delete</button>
                        </>
                    ) : trip.user_role === 'approved' ? (
                        <span className="role-badge passenger">Accepted - Passenger</span>
                    ) : trip.user_role === 'pending' ? (
                        <span className="role-badge pending">Request Pending</span>
                    ) : trip.user_role === 'rejected' ? (
                        <span className="role-badge rejected">Rejected</span>
                    ) : (
                        <span className="role-badge removed">Removed</span>
                    )}
                </div>
            </div>

            <div className={`trip-details-collapsible ${isExpanded ? 'expanded' : ''}`}>
                {trip.event_name && (
                    <div className="trip-detail-item event-name">
                        <strong>Event:</strong> {trip.event_name}
                    </div>
                )}
                <p>{trip.description}</p>
                <div className="trip-details-grid">
                    <span><strong>Departure:</strong> {formatDate(trip.departure_date)} at {formatTime(trip.departure_time)}</span>
                    <span><strong>Capacity:</strong> {trip.current_passengers}/{trip.capacity}</span>
                </div>
                <div className="trip-detail-item">
                    <strong>Pickup:</strong> {trip.pickup_details || 'Not specified'}
                </div>
                <div className="trip-detail-item">
                    <strong>Dropoff:</strong> {trip.dropoff_details || 'Not specified'}
                </div>
                <div className="trip-details-tags">
                    <strong>Tags:</strong> 
                    {trip.tag_details?.length > 0 ? (
                        trip.tag_details.map(t => <span key={t.id} className="tag" style={{'--tag-color': t.color}}>{t.name}</span>)
                    ) : (
                        'None'
                    )}
                </div>

                {trip.user_role === 'owner' && (
                    <div className="owner-actions">
                        {passengers.length > 0 && (
                            <div className="passenger-list">
                                <h4>Passengers</h4>
                                <ul>
                                    {passengers.map(p => (
                                        <li key={p.id}>
                                            {p.display_name}
                                            <button onClick={() => handleRemovePassenger(p.id)} className="remove-passenger-btn">&times;</button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {joinRequests.length > 0 && (
                            <div className="join-requests">
                                <h4>Join Requests</h4>
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
                                                <span className={`status-badge ${req.status}`}>{req.status}</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div className="trip-card-footer">
                    {trip.user_role === 'owner' ? (
                        <span className="role-badge owner">Creator</span>
                    ) : (
                        <span><strong>Creator:</strong> {trip.creator_name}</span>
                    )}
                </div>
            </div>
        </>
    )
};

export default MyTrips;
