import React, { useState, useEffect } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import './SubscriptionDetails.css';

const API_BASE_URL = 'http://localhost:8000/subspot/';

function SubscriptionDetails() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { subscription } = location.state || {};

  const [userInfo, setUserInfo] = useState(null);
  const [formData, setFormData] = useState({
    viewing_hours_bucket: '',
    avg_viewing_duration_bucket: '',
    content_downloads_bucket: '',
    support_tickets_bucket: '',
    user_rating_bucket: '',
    parental_control: '',
  });
  const [predictionResult, setPredictionResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}auth/user/`, { credentials: 'include' })
      .then((res) => {
        if (res.status === 401) {
          navigate('/');
          return;
        }
        return res.json();
      })
      .then((data) => {
        if (data) {
          setUserInfo({ username: data.username, email: data.email });
        }
      })
      .catch((err) => console.error('Error fetching user info:', err));
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!userInfo) {
      setError('User information not loaded. Please try again.');
      return;
    }
    if (Object.values(formData).includes('')) {
      setError('Please select all options before submitting.');
      return;
    }
    setError(null);
    setLoading(true);
    const requestData = {
      service_name: subscription.name,
      username: userInfo.username,
      ...formData,
    };
    try {
      const response = await fetch(`${API_BASE_URL}prediction/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(requestData),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Something went wrong');
      setPredictionResult(data.prediction);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!subscription) {
    return <p>Loading subscription details...</p>;
  }

  return (
    <div className="subscription-details-container">
      <div className="subscription-details">
        <h2>Subscription Details</h2>
        <p><strong>Name:</strong> {subscription.name}</p>
        <p><strong>Cost:</strong> Rs. {subscription.cost}</p>
        <h3>Choose Buckets</h3>
        {[
          { label: 'Viewing Hours', name: 'viewing_hours_bucket', options: ['Low', 'Medium', 'High', 'Very High'] },
          { label: 'Average Viewing Duration', name: 'avg_viewing_duration_bucket', options: ['Short', 'Moderate', 'Long', 'Very Long'] },
          { label: 'Content Downloads Per Month', name: 'content_downloads_bucket', options: ['Rare', 'Intermediate', 'Frequent', 'Very Frequent'] },
          { label: 'Support Tickets Per Month', name: 'support_tickets_bucket', options: ['Low', 'Moderate', 'High', 'Very High'] },
          { label: 'Rating', name: 'user_rating_bucket', options: ['Poor', 'Average', 'Good', 'Excellent'] },
          { label: 'Parental Control', name: 'parental_control', options: ['Yes', 'No'] },
        ].map(({ label, name, options }) => (
          <div key={name}>
            <label>{label}:</label>
            <select name={name} onChange={handleChange} value={formData[name]}>
              <option value="">Select</option>
              {options.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        ))}
        <button onClick={handleSubmit} disabled={loading}>
          {loading ? 'Predicting...' : 'Submit'}
        </button>
        {error && <p className="error">{error}</p>}
        {predictionResult && (
          <div className="prediction-box">
            <h3>Prediction Result</h3>
            <p>{predictionResult}</p>
          </div>
        )}
      </div>
      {/* Additional background gradient elements */}
      <div className="bottom-left-ellipse"></div>
      <div className="bottom-right-ellipse"></div>
      <div className="bottom-center-ellipse"></div>
      <div className="bottom-right-red-ellipse"></div>
    </div>
  );
}

export default SubscriptionDetails;
