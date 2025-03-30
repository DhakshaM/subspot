import React, { useState } from 'react';
import './LandingPage.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPhone, faEnvelope, faTimes } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';

function LandingPage() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSignupModalOpen, setIsSignupModalOpen] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const navigate = useNavigate();
  const API_BASE_URL = 'http://localhost:8000/subspot/';

  const openLoginModal = () => setIsLoginModalOpen(true);
  const closeLoginModal = () => {
    setIsLoginModalOpen(false);
    setErrorMessage('');
    setLoginUsername('');
    setLoginPassword('');
  };

  const openSignupModal = () => setIsSignupModalOpen(true);
  const closeSignupModal = () => {
    setIsSignupModalOpen(false);
    setErrorMessage('');
    setSignupName('');
    setSignupEmail('');
    setSignupUsername('');
    setSignupPassword('');
  };

  const handleLogin = (e) => {
    e.preventDefault();
    fetch(`${API_BASE_URL}auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        username: loginUsername,
        password: loginPassword,
      }),
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.message === 'login successful') {
          closeLoginModal();
          navigate('/dashboard');
        } else {
          setErrorMessage(data.message || 'Login failed');
        }
      })
      .catch((err) => {
        console.error('Login error:', err);
        setErrorMessage('An error occurred during login');
      });
  };

  const handleSignup = (e) => {
    e.preventDefault();
    fetch(`${API_BASE_URL}auth/signup/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        name: signupName,
        username: signupUsername,
        password: signupPassword,
        email: signupEmail,
      }),
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.message === 'signup successful') {
          closeSignupModal();
          navigate('/dashboard');
        } else {
          setErrorMessage(data.message || 'Signup failed');
        }
      })
      .catch((err) => {
        console.error('Signup error:', err);
        setErrorMessage('An error occurred during signup');
      });
  };

  return (
    <div className="App">
      <header className="App-header">
        <div className="Navbar">
          <div className="Logo">SubSpot</div>
          <div className="NavLinks">
            <a href="#services">Services</a>
            <a href="#contact">Contact</a>
            <a href="#" onClick={openLoginModal}>Log In</a>
          </div>
        </div>

        <div className="Content">
          <h1>YOUR SMART</h1>
          <h1>SUBSCRIPTION MANAGER</h1>
          <button className="GetStartedButton" onClick={openSignupModal}>Get Started</button>
          <p className="LoginLink">
            Already a member? <span onClick={openLoginModal}>Log In</span>
          </p>
        </div>

        <div className="bottom-left-ellipse"></div>
        <div className="bottom-right-ellipse"></div>
      </header>

      <section id="services" className="OurServicesSection">
        <h2>Our Services</h2>
        <div className="ServicesContainer">
          <div className="ServiceCard">
            <h3>Subscription Tracking</h3>
            <p>
              Stay on top of your subscriptions effortlessly with our
              tracking system, ensuring you never miss a renewal date or
              unexpected charge. Easily categorize and manage all your
              subscriptions in one convenient dashboard.
            </p>
          </div>
          <div className="ServiceCard">
            <h3>Friends Connection</h3>
            <p>
            Connect with friends and manage shared subscriptions effortlessly. 
            Keep track of who’s subscribed to what and enjoy your favorite services together without any hassle.
            </p>
          </div>
          <div className="ServiceCard">
            <h3>Subscription Marketplace</h3>
            <p>
              Discover a seamless and secure platform where users can list
              their subscriptions for sale, and buyers can purchase them
              confidently with our escrow system, guaranteeing a smooth
              transaction for both parties.
            </p>
          </div>
        </div>
      </section>

      <section id="contact" className="ContactSection">
        <div className="ContactInfo">
          <div>
            <FontAwesomeIcon icon={faPhone} /> +91 9696234647
          </div>
          <div>
            <FontAwesomeIcon icon={faEnvelope} /> support@subspot.com
          </div>
        </div>
      </section>

      {isLoginModalOpen && (
        <div className="LoginModalOverlay">
          <div className="LoginModal">
            <button className="CloseButton" onClick={closeLoginModal}>
              <FontAwesomeIcon icon={faTimes} />
            </button>
            <h2>Log In</h2>
            {errorMessage && <p className="ErrorMessage">{errorMessage}</p>}
            <form onSubmit={handleLogin}>
              <div className="InputGroup">
                <label>Username:</label>
                <input
                  type="text"
                  placeholder="Enter username"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  required
                />
              </div>
              <div className="InputGroup">
                <label>Password:</label>
                <input
                  type="password"
                  placeholder="Enter password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="LoginButton">Log In</button>
            </form>
          </div>
        </div>
      )}

      {isSignupModalOpen && (
        <div className="LoginModalOverlay">
          <div className="LoginModal" data-modal-type="signup">
            <button className="CloseButton" onClick={closeSignupModal}>
              <FontAwesomeIcon icon={faTimes} />
            </button>
            <h2>Sign Up</h2>
            {errorMessage && <p className="ErrorMessage">{errorMessage}</p>}
            <form onSubmit={handleSignup}>
              <div className="InputGroup">
                <label>Name:</label>
                <input
                  type="text"
                  placeholder="Enter name"
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  required
                />
              </div>
              <div className="InputGroup">
                <label>Email:</label>
                <input
                  type="email"
                  placeholder="Enter email"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  required
                />
              </div>
              <div className="InputGroup">
                <label>Username:</label>
                <input
                  type="text"
                  placeholder="Enter username"
                  value={signupUsername}
                  onChange={(e) => setSignupUsername(e.target.value)}
                  required
                />
              </div>
              <div className="InputGroup">
                <label>Password:</label>
                <input
                  type="password"
                  placeholder="Enter password"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="LoginButton">Sign Up</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default LandingPage;