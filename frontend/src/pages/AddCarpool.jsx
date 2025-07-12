import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Select from 'react-select';
import { useAuth } from '../contexts/AuthContext';
import { tagSelectStyles } from '../styles/tagStyles';
import '../styles/tagStyles.css';
import './AddCarpool.css';

function AddCarpool() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [allTags, setAllTags] = useState([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    email: '',
    phone: '',
    departure_date: '',
    departure_time: '',
    capacity: 4,
    tags: [],
    carpool_type: 'airport',
    event_name: '',
    pickup_details: '',
    dropoff_details: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTags();
  }, []);

  useEffect(() => {
    if (location.state?.defaultType && allTags.length > 0) {
      const defaultType = location.state.defaultType;
      const defaultTag = allTags.find(t => t.label.toLowerCase() === defaultType.toLowerCase());
      
      setForm(prev => ({
        ...prev,
        carpool_type: defaultType,
        tags: defaultTag ? [defaultTag.value] : [],
      }));
    }
  }, [location.state, allTags]);

  const fetchTags = async () => {
    try {
      const response = await fetch('/api/tags');
      if (response.ok) {
        const data = await response.json();
        // Format for react-select
        const formattedTags = data.map(tag => ({ value: tag.id, label: tag.name, color: tag.color }));
        setAllTags(formattedTags);
      }
    } catch (err) {
      console.error('Error fetching tags:', err);
      setError('Could not load tags');
    }
  };

  const handleChange = e => {
    const { name, value, type } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'number' ? parseInt(value) : value }));
  };

  const handleTagChange = (selectedOptions) => {
    const selectedIds = selectedOptions ? selectedOptions.map(option => option.value) : [];
    setForm(prev => ({ ...prev, tags: selectedIds }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/carpools', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(form)
      });

      if (response.ok) {
        const newCarpool = await response.json();
        navigate('/dashboard', {
          state: {
            newCarpoolId: newCarpool.id,
            carpoolType: newCarpool.carpool_type,
          }
        });
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Error creating carpool');
      }
    } catch (err) {
      console.error('Error creating carpool:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectedTagObjects = allTags.filter(tag => form.tags.includes(tag.value));

  return (
    <div className="add wave-bg">
      <header className="add-header">
        <button onClick={() => navigate('/dashboard')} className="back-btn">
          {'< back'}
        </button>
        <h2>Add Carpool</h2>
        {user && (
          <p className="user-info">
            Posting as {user.displayName || user.sunetId}
          </p>
        )}
      </header>

      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => setError(null)} className="dismiss-btn">Dismiss</button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="add-form">
        <label>
            Carpool Type*:
            <select name="carpool_type" value={form.carpool_type} onChange={handleChange} required disabled={loading} className="carpool-type-select">
                <option value="other">Other</option>
                <option value="airport">Airport</option>
                <option value="event">Event</option>
                <option value="commute">Commute</option>
                <option value="recurring">Recurring</option>
            </select>
        </label>
        
        <label>
          Title*:
          <input name="title" value={form.title} onChange={handleChange} required disabled={loading} placeholder="e.g., Trip to SFO" />
        </label>
        
        <label>
          Description:
          <textarea name="description" value={form.description} onChange={handleChange} disabled={loading} placeholder="Additional details..." rows={4} />
        </label>

        {form.carpool_type === 'event' && (
            <label>
                Event Name*:
                <input name="event_name" value={form.event_name} onChange={handleChange} required={form.carpool_type === 'event'} disabled={loading} placeholder="e.g., Golden Gate Bridge Run" />
            </label>
        )}

        <label>
          Pickup Details:
          <input name="pickup_details" value={form.pickup_details} onChange={handleChange} disabled={loading} placeholder="e.g., Tresidder Memorial Union" />
        </label>

        <label>
          Dropoff Details:
          <input name="dropoff_details" value={form.dropoff_details} onChange={handleChange} disabled={loading} placeholder="e.g., SFO International Terminal" />
        </label>

        <div className="form-row">
          <label>
            Departure Date*:
            <input name="departure_date" type="date" value={form.departure_date} onChange={handleChange} required disabled={loading} />
          </label>
          <label>
            Departure Time*:
            <input name="departure_time" type="time" value={form.departure_time} onChange={handleChange} required disabled={loading} />
          </label>
        </div>

        <div className="form-row">
          <label>
            Capacity (incl. driver)*:
            <input name="capacity" type="number" min="2" max="10" value={form.capacity} onChange={handleChange} required disabled={loading} />
          </label>
        </div>
        
        <div className="form-row">
          <label>
            Email:
            <input type="email" name="email" value={form.email} onChange={handleChange} disabled={loading} placeholder="your-email@stanford.edu" />
          </label>
          <label>
            Phone:
            <input type="tel" name="phone" value={form.phone} onChange={handleChange} disabled={loading} placeholder="(123) 456-7890" />
          </label>
        </div>

        <label>
          Tags:
          <Select
            isMulti
            name="tags"
            options={allTags}
            className="basic-multi-select"
            classNamePrefix="select"
            onChange={handleTagChange}
            value={selectedTagObjects}
            placeholder="Search and select tags..."
            styles={tagSelectStyles} // Apply the styles
            isDisabled={loading}
          />
        </label>
        
        <button type="submit" disabled={loading} className="submit-btn">
          {loading ? 'Creating...' : 'Create Carpool'}
        </button>
      </form>
    </div>
  );
}

export default AddCarpool; 