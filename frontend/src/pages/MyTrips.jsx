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
    const [allTags, setAllTags] = useState([]);

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

    const getDepartureDateTime = (trip) => {
        const datePart = trip.departure_date.split('T')[0];
        return new Date(`${datePart}T${trip.departure_time || '00:00:00'}`);
    };

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
                                        onEdit={handleEditClick}
                                        onDelete={handleDelete}
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
const TripDetails = ({ trip, onEdit, onDelete }) => {
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

    return (
        <>
            <div className="trip-card-header">
                <h3>{trip.title}</h3>
                {trip.is_owner ? (
                    <div className="trip-actions">
                        <button onClick={() => onEdit(trip)} className="edit-button">Edit</button>
                        <button onClick={() => onDelete(trip.id)} className="delete-button">Delete</button>
                    </div>
                ) : (
                    <span className="role-badge passenger">Passenger</span>
                )}
            </div>
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
            <div className="trip-card-footer">
                {trip.is_owner ? (
                    <span className="role-badge owner">Creator</span>
                ) : (
                    <span><strong>Creator:</strong> {trip.creator_name}</span>
                )}
            </div>
        </>
    )
};

export default MyTrips;
