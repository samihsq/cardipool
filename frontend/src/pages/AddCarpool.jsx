import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import './AddCarpool.css';

function AddCarpool() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '',
    tags: '',
    contact: '',
    description: ''
  });

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const payload = { ...form, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean) };
    const res = await fetch('/api/carpools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      navigate('/dashboard');
    } else {
      alert('Error creating carpool');
    }
  };

  return (
    <div className="add wave-bg">
      <button onClick={() => navigate('/dashboard')}>{'< back'}</button>
      <h2>Add Carpool</h2>
      <form onSubmit={handleSubmit} className="add-form">
        <label>
          Title*:
          <input name="title" value={form.title} onChange={handleChange} required />
        </label>
        <label>
          Tags (comma-separated):
          <input name="tags" value={form.tags} onChange={handleChange} />
        </label>
        <label>
          Contact*:
          <input name="contact" value={form.contact} onChange={handleChange} required />
        </label>
        <label>
          Description:
          <textarea name="description" value={form.description} onChange={handleChange} />
        </label>
        <button type="submit">Submit</button>
      </form>
    </div>
  );
}

export default AddCarpool; 