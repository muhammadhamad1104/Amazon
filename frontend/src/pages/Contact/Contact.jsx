import { useState } from 'react';
import { FaEnvelope, FaPhone, FaMapMarkerAlt, FaClock, FaPaperPlane, FaFacebook, FaTwitter, FaInstagram, FaLinkedin } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { contactAPI } from '../../api/api';
import './Contact.css';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await contactAPI.sendMessage(formData);
      toast.success('Thank you for contacting us! We will get back to you soon.');
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="contact-page">
      {/* Hero Section */}
      <div className="contact-hero">
        <div className="hero-content">
          <h1 className="hero-title">Get In Touch</h1>
          <p className="hero-subtitle">
            We're here to help and answer any questions you might have
          </p>
        </div>
      </div>

      <div className="contact-container">
        <div className="contact-content">
          {/* Contact Info Cards */}
          <div className="contact-info-section">
            <div className="info-cards">
              <div className="info-card">
                <div className="icon-wrapper">
                  <FaEnvelope className="info-icon" />
                </div>
                <h3>Email Us</h3>
                <p>irfwardrobe@gmail.com</p>
                <p className="info-subtitle">We'll respond within 24 hours</p>
              </div>
              
              <div className="info-card">
                <div className="icon-wrapper">
                  <FaPhone className="info-icon" />
                </div>
                <h3>Call Us</h3>
                <p>+92 316 4928847</p>
                <p className="info-subtitle">Mon-Sat, 9:00 AM - 6:00 PM</p>
              </div>
              
              <div className="info-card">
                <div className="icon-wrapper">
                  <FaMapMarkerAlt className="info-icon" />
                </div>
                <h3>Visit Us</h3>
                <p>Islamabad, Pakistan</p>
                <p className="info-subtitle">Come say hello!</p>
              </div>
              
              <div className="info-card">
                <div className="icon-wrapper">
                  <FaClock className="info-icon" />
                </div>
                <h3>Working Hours</h3>
                <p>Monday - Saturday</p>
                <p className="info-subtitle">9:00 AM - 6:00 PM</p>
              </div>
            </div>

            {/* Social Media */}
            <div className="social-section">
              <h3>Follow Us</h3>
              <div className="social-links">
                <a href="#" className="social-link facebook" aria-label="Facebook">
                  <FaFacebook />
                </a>
                <a href="#" className="social-link twitter" aria-label="Twitter">
                  <FaTwitter />
                </a>
                <a href="#" className="social-link instagram" aria-label="Instagram">
                  <FaInstagram />
                </a>
                <a href="#" className="social-link linkedin" aria-label="LinkedIn">
                  <FaLinkedin />
                </a>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="contact-form-section">
            <h2>Send Us a Message</h2>
            <p className="form-intro">
              Have a question or feedback? Fill out the form below and we'll get back to you as soon as possible.
            </p>
            
            <form onSubmit={handleSubmit} className="contact-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="name">Your Name *</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="John Doe"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email Address *</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="irfwardrobe@gmail.com"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="subject">Subject *</label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  placeholder="How can we help you?"
                />
              </div>

              <div className="form-group">
                <label htmlFor="message">Message *</label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={6}
                  placeholder="Tell us more about your inquiry..."
                />
              </div>

              <button 
                type="submit" 
                className="submit-btn"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>Sending...</>
                ) : (
                  <>
                    <FaPaperPlane /> Send Message
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
