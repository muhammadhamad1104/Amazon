import { useState, useEffect } from 'react';
import './AdTicker.css';

const AdTicker = () => {
  const [currentAd, setCurrentAd] = useState(0);

  const advertisements = [
    {
      id: 1,
      image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600',
      title: 'Hot Deals - Up to 60% OFF',
      subtitle: 'The Best Deals For You',
      company: 'Electronics Sale'
    },
    {
      id: 2,
      image: 'https://images.unsplash.com/photo-1607082349566-187342175e2f?w=600',
      title: 'Fashion Week Sale',
      subtitle: 'Latest Trends at Best Prices',
      company: 'Fashion Deals'
    },
    {
      id: 3,
      image: 'https://images.unsplash.com/photo-1525904097878-94fb15835963?w=600',
      title: 'Home Appliances',
      subtitle: 'Upgrade Your Home',
      company: 'Home & Kitchen'
    },
    {
      id: 4,
      image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600',
      title: 'Gadgets Galore',
      subtitle: 'Tech at Unbeatable Prices',
      company: 'Tech Zone'
    },
    {
      id: 5,
      image: 'https://images.unsplash.com/photo-1556742212-5b321f3c261b?w=600',
      title: 'Sports Equipment',
      subtitle: 'Get Fit, Save Big',
      company: 'Sports Store'
    },
    {
      id: 6,
      image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600',
      title: 'Books & Learning',
      subtitle: 'Knowledge at Your Fingertips',
      company: 'Book Store'
    },
    {
      id: 7,
      image: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600',
      title: 'Photography Gear',
      subtitle: 'Capture Every Moment',
      company: 'Camera Shop'
    },
    {
      id: 8,
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600',
      title: 'Audio & Headphones',
      subtitle: 'Premium Sound Quality',
      company: 'Audio Store'
    },
    {
      id: 9,
      image: 'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=600',
      title: 'Footwear Collection',
      subtitle: 'Step in Style',
      company: 'Shoe Store'
    },
    {
      id: 10,
      image: 'https://images.unsplash.com/photo-1611078489935-0cb964de46d6?w=600',
      title: 'Beauty & Personal Care',
      subtitle: 'Look Your Best',
      company: 'Beauty Store'
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentAd((prev) => (prev + 1) % advertisements.length);
    }, 4000);

    return () => clearInterval(timer);
  }, [advertisements.length]);

  return (
    <div className="ad-ticker">
      <div className="ad-content">
        <img
          src={advertisements[currentAd].image}
          alt={advertisements[currentAd].title}
          className="ad-image"
        />
        <div className="ad-overlay">
          <h2>{advertisements[currentAd].title}</h2>
          <p>{advertisements[currentAd].subtitle}</p>
          <button className="shop-now-btn">Shop Now</button>
        </div>
      </div>

      <div className="ad-dots">
        {advertisements.map((_, index) => (
          <button
            key={index}
            className={`dot ${index === currentAd ? 'active' : ''}`}
            onClick={() => setCurrentAd(index)}
            aria-label={`View ad ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default AdTicker;
