import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { FaArrowUp } from 'react-icons/fa';
import './ScrollToTop.css';

const ScrollToTop = () => {
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname, location.search]);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    setIsScrolling(true);
    const scrollStep = window.pageYOffset / 50; // Divide scroll distance into 50 steps
    const scrollInterval = setInterval(() => {
      if (window.pageYOffset > 0) {
        window.scrollBy(0, -scrollStep);
      } else {
        clearInterval(scrollInterval);
        setIsScrolling(false);
      }
    }, 15); // 15ms interval for smooth scrolling
  };

  return (
    <>
      {isVisible && (
        <button
          onClick={scrollToTop}
          className={`scroll-to-top ${isScrolling ? 'scrolling' : ''}`}
          aria-label="Scroll to top"
          disabled={isScrolling}
        >
          <FaArrowUp />
        </button>
      )}
    </>
  );
};

export default ScrollToTop;
