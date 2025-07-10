import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Select from 'react-select';
import { tagSelectStyles } from '../styles/tagStyles';
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

    const fetchTrips = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/carpools/mine', { credentials: 'include' });
            if (response.ok) {
                const data = await response.json();
                setTrips(data);
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
                    {trips.map(trip => (
                        <div key={trip.id} className="trip-card">
                            {editingTripId === trip.id ? (
                                <EditTripForm 
                                    trip={trip} 
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
                    ))}
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

// Component for the inline edit form
const EditTripForm = ({ trip, onSave, onCancel, allTags }) => {
    const [formData, setFormData] = useState({
        title: trip.title,
        description: trip.description || '',
        contact: trip.contact,
        departure_date: trip.departure_date ? new Date(trip.departure_date).toISOString().split('T')[0] : '',
        departure_time: trip.departure_time || '',
        capacity: trip.capacity,
        tags: trip.tags || [],
        carpool_type: trip.carpool_type || 'other',
        event_name: trip.event_name || '',
        pickup_details: trip.pickup_details || '',
        dropoff_details: trip.dropoff_details || ''
    });
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleTagChange = (selectedOptions) => {
        setFormData(prev => ({ ...prev, tags: selectedOptions ? selectedOptions.map(o => o.value) : [] }));
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);
        try {
            const response = await fetch(`/api/carpools/${trip.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(formData),
            });
            if (response.ok) {
                onSave();
            } else {
                const errData = await response.json();
                setError(errData.error || 'Failed to save changes.');
            }
        } catch (err) {
            setError('An error occurred while saving.');
        } finally {
            setIsSaving(false);
        }
    };
    
    const selectedTagObjects = allTags.filter(tag => formData.tags.includes(tag.value));

    return (
        <form onSubmit={handleSubmit} className="inline-edit-form">
            <label>Title</label>
            <input type="text" name="title" value={formData.title} onChange={handleChange} required />
            
            <label>Description</label>
            <textarea name="description" value={formData.description} onChange={handleChange}></textarea>
            
            <label>Type</label>
            <select name="carpool_type" value={formData.carpool_type} onChange={handleChange} required>
                <option value="other">Other</option>
                <option value="airport">Airport</option>
                <option value="event">Event</option>
                <option value="commute">Commute</option>
            </select>

            {formData.carpool_type === 'event' && (
                <>
                    <label>Event Name</label>
                    <input type="text" name="event_name" value={formData.event_name} onChange={handleChange} placeholder="Event Name" />
                </>
            )}

            <label>Pickup Details</label>
            <textarea name="pickup_details" value={formData.pickup_details} onChange={handleChange} placeholder="e.g. Tresidder flagpole" />
            
            <label>Dropoff Details</label>
            <textarea name="dropoff_details" value={formData.dropoff_details} onChange={handleChange} placeholder="e.g. SFO Terminal 1" />

            <div className="form-row">
                <div>
                    <label>Departure Date</label>
                    <input type="date" name="departure_date" value={formData.departure_date} onChange={handleChange} required />
                </div>
                <div>
                    <label>Departure Time</label>
                    <input type="time" name="departure_time" value={formData.departure_time} onChange={handleChange} required />
                </div>
            </div>
            
            <div className="form-row">
                <div>
                    <label>Capacity</label>
                    <input type="number" name="capacity" value={formData.capacity} onChange={handleChange} required min="1" />
                </div>
                <div>
                    <label>Contact Info</label>
                    <input type="text" name="contact" value={formData.contact} onChange={handleChange} required />
                </div>
            </div>
            
            <label>Tags</label>
            <Select
                isMulti
                name="tags"
                options={allTags}
                className="basic-multi-select"
                classNamePrefix="select"
                placeholder="Select tags..."
                value={selectedTagObjects}
                onChange={handleTagChange}
                styles={tagSelectStyles}
            />
            {error && <p className="form-error">{error}</p>}
            <div className="form-actions">
                <button type="submit" className="save-button" disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save'}
                </button>
                <button type="button" className="cancel-button" onClick={onCancel}>Cancel</button>
            </div>
        </form>
    );
};

export default MyTrips;
