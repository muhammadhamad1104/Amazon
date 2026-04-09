import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { FaCheckCircle, FaTruck, FaShieldAlt, FaHeadset, FaBolt, FaUsers, FaGlobe, FaHeart } from 'react-icons/fa';
import './About.css';

const About = () => {
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) return;

    const target = document.querySelector(location.hash);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [location.hash]);

  return (
    <div className="about-page">
      {/* Hero Section */}
      <div className="about-hero">
        <div className="hero-content">
          <h1 className="hero-title">About Our Store</h1>
          <p className="hero-subtitle">
            Your trusted partner for quality products and exceptional service
          </p>
        </div>
      </div>

      <div className="about-container">
        {/* Mission Section */}
        <section className="about-section mission-section">
          <div className="section-header">
            <h2>Our Mission</h2>
            <div className="section-underline"></div>
          </div>
          <p className="mission-text">
            We are your one-stop destination for all your shopping needs. Founded with a vision to
            provide quality products at affordable prices, we have grown to become a trusted name
            in online retail. Our mission is to deliver exceptional value and service to our customers
            through innovation, integrity, and dedication.
          </p>
        </section>

        {/* Features Grid */}
        <section className="features-section">
          <div className="section-header">
            <h2>Why Choose Us?</h2>
            <div className="section-underline"></div>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <FaCheckCircle className="feature-icon" />
              </div>
              <h3>Quality Assurance</h3>
              <p>All products are carefully selected and verified for quality</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <FaTruck className="feature-icon" />
              </div>
              <h3>Fast Delivery</h3>
              <p>Quick and reliable shipping to your doorstep nationwide</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <FaShieldAlt className="feature-icon" />
              </div>
              <h3>Secure Payments</h3>
              <p>Your transactions are safe and protected with encryption</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <FaHeadset className="feature-icon" />
              </div>
              <h3>24/7 Support</h3>
              <p>Our dedicated team is always here to assist you</p>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="stats-section">
          <div className="stats-grid">
            <div className="stat-card">
              <FaUsers className="stat-icon" />
              <div className="stat-number">50K+</div>
              <div className="stat-label">Happy Customers</div>
            </div>
            <div className="stat-card">
              <FaBolt className="stat-icon" />
              <div className="stat-number">100K+</div>
              <div className="stat-label">Products Sold</div>
            </div>
            <div className="stat-card">
              <FaGlobe className="stat-icon" />
              <div className="stat-number">50+</div>
              <div className="stat-label">Cities Covered</div>
            </div>
            <div className="stat-card">
              <FaHeart className="stat-icon" />
              <div className="stat-number">98%</div>
              <div className="stat-label">Satisfaction Rate</div>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="about-section values-section">
          <div className="section-header">
            <h2>Our Core Values</h2>
            <div className="section-underline"></div>
          </div>
          <div className="values-grid">
            <div className="value-item">
              <div className="value-number">01</div>
              <h3>Integrity</h3>
              <p>We believe in transparency and honesty in all our dealings</p>
            </div>
            <div className="value-item">
              <div className="value-number">02</div>
              <h3>Customer First</h3>
              <p>Your satisfaction is our top priority in everything we do</p>
            </div>
            <div className="value-item">
              <div className="value-number">03</div>
              <h3>Innovation</h3>
              <p>We continuously improve to provide you the best experience</p>
            </div>
            <div className="value-item">
              <div className="value-number">04</div>
              <h3>Excellence</h3>
              <p>We strive for excellence in every aspect of our service</p>
            </div>
          </div>
        </section>

        <section className="about-section policy-section" id="returns-policy">
          <div className="section-header">
            <h2>Returns Policy</h2>
            <div className="section-underline"></div>
          </div>
          <p className="mission-text">
            We offer a 7-day return window for eligible items in original condition. To request a return,
            contact us with your order number at support@irfwardrobe.com.
            Returns are reviewed within 24 hours.
          </p>
        </section>

        <section className="about-section policy-section" id="shipping-info">
          <div className="section-header">
            <h2>Shipping Information</h2>
            <div className="section-underline"></div>
          </div>
          <p className="mission-text">
            Orders are processed Monday to Saturday and dispatched as quickly as possible.
            Delivery time varies by city, usually within 2 to 5 business days. For urgent inquiries,
            call us at +92 316 4928847.
          </p>
        </section>

        {/* Contact CTA */}
        <section className="contact-cta">
          <h2>Have Questions?</h2>
          <p>We'd love to hear from you! Get in touch with our team.</p>
          <div className="cta-buttons">
            <a href="/contact" className="cta-btn primary">Contact Us</a>
            <a href="/products" className="cta-btn secondary">Shop Now</a>
          </div>
        </section>
      </div>
    </div>
  );
};

export default About;
