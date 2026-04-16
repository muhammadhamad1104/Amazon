import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdTicker.css';

const advertisements = [
  {
    id: 1,
    image: '/women-unstiched-cloth.png',
    title: "Women's Unstitched Collection",
    subtitle: 'Fresh 2 Piece and 3 Piece arrivals for every occasion',
    company: 'IRF Wardrobe Signature Edit',
    category: "Women's Unstitched Collection"
  },
  {
    id: 2,
    image: '/kids-wear.png',
    title: 'Kids Wear Collection',
    subtitle: 'Comfortable everyday styles for boys and girls',
    company: 'IRF Wardrobe Kids',
    category: 'Kids wear'
  },
  {
    id: 3,
    image: '/shoes.png',
    title: 'Thrifted Pre-Loved Shoes',
    subtitle: 'Curated quality pairs at standout prices',
    company: 'IRF Wardrobe Footwear',
    category: 'Thrifted pre-loved shoes'
  }
];

const AdTicker = () => {
  const [currentAd, setCurrentAd] = useState(0);
  const [isAdAssetsReady, setIsAdAssetsReady] = useState(false);
  const navigate = useNavigate();

  const handleShopNow = () => {
    const selectedCategory = advertisements[currentAd]?.category;
    if (!selectedCategory) {
      navigate('/products');
      return;
    }

    navigate(`/products?category=${encodeURIComponent(selectedCategory)}`);
  };

  useEffect(() => {
    let isMounted = true;

    const preloadPromises = advertisements.map((ad) => (
      new Promise((resolve) => {
        const image = new Image();
        image.src = ad.image;
        image.onload = resolve;
        image.onerror = resolve;
      })
    ));

    Promise.all(preloadPromises).then(() => {
      if (isMounted) {
        setIsAdAssetsReady(true);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isAdAssetsReady) {
      return undefined;
    }

    const timer = setInterval(() => {
      setCurrentAd((prev) => (prev + 1) % advertisements.length);
    }, 4000);

    return () => clearInterval(timer);
  }, [isAdAssetsReady]);

  if (!isAdAssetsReady) {
    return (
      <div className="ad-ticker">
        <div className="ad-content ad-loading-state">
          <p className="ad-loading-text">Loading promotions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ad-ticker">
      <div className="ad-content">
        <img
          key={advertisements[currentAd].id}
          src={advertisements[currentAd].image}
          alt={advertisements[currentAd].title}
          className="ad-image"
          loading="eager"
        />
        <div className="ad-overlay">
          <span className="ad-company">{advertisements[currentAd].company}</span>
          <h2>{advertisements[currentAd].title}</h2>
          <p>{advertisements[currentAd].subtitle}</p>
          <button type="button" className="shop-now-btn" onClick={handleShopNow}>Shop Now</button>
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
