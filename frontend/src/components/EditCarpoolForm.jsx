import React, { useState } from 'react';
import Select from 'react-select';
import { tagSelectStyles } from '../styles/tagStyles';
import './EditCarpoolForm.css';

const EditCarpoolForm = ({ carpool, onSave, onCancel, allTags }) => {
    const [editedCarpool, setEditedCarpool] = useState({ ...carpool, tags: carpool.tags || [] });

    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setEditedCarpool(prev => ({ ...prev, [name]: value }));
    };

    const handleEditTagsChange = (selectedOptions) => {
        setEditedCarpool(prev => ({ ...prev, tags: selectedOptions ? selectedOptions.map(o => o.value) : [] }));
    };

    const handleSave = (e) => {
        e.preventDefault();
        onSave(editedCarpool);
    };

    const selectedTagObjects = allTags.filter(tag => editedCarpool.tags.includes(tag.value));
    
    const departureDate = editedCarpool.departure_date ? new Date(editedCarpool.departure_date).toISOString().split('T')[0] : '';

    return (
        <form onSubmit={handleSave} className="edit-form">
            <h3>Edit Carpool</h3>

            <div className="form-grid">
                <div className="form-field full-width">
                    <label>Title</label>
                    <input type="text" name="title" value={editedCarpool.title} onChange={handleEditChange} required />
                </div>

                <div className="form-field full-width">
                    <label>Carpool Type</label>
                    <select name="carpool_type" value={editedCarpool.carpool_type || 'other'} onChange={handleEditChange} className="carpool-type-select">
                        <option value="other">Other</option>
                        <option value="airport">Airport</option>
                        <option value="event">Event</option>
                        <option value="commute">Commute</option>
                        <option value="recurring">Recurring</option>
                    </select>
                </div>
                
                <div className="form-field full-width">
                    <label>Description</label>
                    <textarea name="description" value={editedCarpool.description || ''} onChange={handleEditChange}></textarea>
                </div>

                <div className="form-field">
                    <label>Email</label>
                    <input type="email" name="email" value={editedCarpool.email || ''} onChange={handleEditChange} />
                </div>
                <div className="form-field">
                    <label>Phone</label>
                    <input type="tel" name="phone" value={editedCarpool.phone || ''} onChange={handleEditChange} />
                </div>
                <div className="form-field">
                    <label>Departure Date</label>
                    <input type="date" name="departure_date" value={departureDate} onChange={handleEditChange} required />
                </div>
                <div className="form-field">
                    <label>Departure Time</label>
                    <input type="time" name="departure_time" value={editedCarpool.departure_time || ''} onChange={handleEditChange} required />
                </div>
                <div className="form-field">
                    <label>Capacity</label>
                    <input type="number" name="capacity" value={editedCarpool.capacity} onChange={handleEditChange} min="1" required />
                </div>
                <div className="form-field full-width">
                    <label>Pickup Details</label>
                    <textarea name="pickup_details" value={editedCarpool.pickup_details || ''} onChange={handleEditChange} />
                </div>
                <div className="form-field full-width">
                    <label>Dropoff Details</label>
                    <textarea name="dropoff_details" value={editedCarpool.dropoff_details || ''} onChange={handleEditChange} />
                </div>

                <div className="form-field full-width">
                    <label>Tags</label>
                    <Select isMulti name="tags" options={allTags} value={selectedTagObjects} onChange={handleEditTagsChange} styles={tagSelectStyles} className="select-container" />
                </div>
            </div>


            <div className="form-actions">
                <button type="button" onClick={onCancel} className="cancel-btn">Cancel</button>
                <button type="submit" className="save-btn">Save</button>
            </div>
        </form>
    );
};

export default EditCarpoolForm; 