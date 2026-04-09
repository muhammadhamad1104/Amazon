import { useState, useEffect } from 'react';
import { FaChevronUp, FaChevronDown, FaCookieBite } from 'react-icons/fa';
import './CookieConsent.css';

const CookieConsent = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasConsented, setHasConsented] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      setTimeout(() => setIsVisible(true), 1000);
    } else {
      setHasConsented(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookieConsent', 'true');
    setIsAnimating(true);
    setTimeout(() => {
      setIsVisible(false);
      setHasConsented(true);
      setIsAnimating(false);
    }, 400);
  };

  const handleDecline = () => {
    localStorage.setItem('cookieConsent', 'false');
    setIsAnimating(true);
    setTimeout(() => {
      setIsVisible(false);
      setHasConsented(true);
      setIsAnimating(false);
    }, 400);
  };

  const toggleExpanded = () => {
    if (!isAnimating) {
      setIsExpanded(!isExpanded);
    }
  };

  if (hasConsented && !isVisible) return null;

  return (
    <>
      {/* Always visible toggle button at footer bottom */}
      {!isVisible && !hasConsented && (
        <button 
          className="cookie-toggle-footer" 
          onClick={() => setIsVisible(true)}
          aria-label="Show cookie consent"
        >
          <FaChevronUp />
        </button>
      )}

      <div className={`cookie-consent ${isVisible ? 'visible' : ''} ${isExpanded ? 'expanded' : ''} ${isAnimating ? 'animating' : ''}`}>
        <button 
          className="cookie-toggle" 
          onClick={toggleExpanded}
          aria-label={isExpanded ? "Show less" : "Show more"}
        >
          {isExpanded ? <FaChevronDown /> : <FaChevronUp />}
        </button>

        <div className="cookie-content">
          <div className="cookie-header">
            <FaCookieBite className="cookie-icon" />
            <h3>We Use Cookies</h3>
          </div>

          <p className="cookie-text">
            We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic. 
            By clicking "Accept All", you consent to our use of cookies.
          </p>

          {isExpanded && (
            <div className="cookie-details">
              <h4>Cookie Policy Details</h4>
              <ul>
                <li><strong>Essential Cookies:</strong> Required for basic site functionality</li>
                <li><strong>Analytics Cookies:</strong> Help us understand how you use our site</li>
                <li><strong>Marketing Cookies:</strong> Used to deliver relevant advertisements</li>
              </ul>
              <a href="/privacy-policy" className="cookie-link">Read our Privacy Policy</a>
            </div>
          )}

          <div className="cookie-actions">
            <button className="btn-decline" onClick={handleDecline}>
              Decline
            </button>
            <button className="btn-accept" onClick={handleAccept}>
              Accept All
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default CookieConsent;
