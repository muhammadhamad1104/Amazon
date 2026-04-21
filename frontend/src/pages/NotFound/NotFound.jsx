import { Link } from 'react-router-dom';
import { FaHome, FaSearch } from 'react-icons/fa';
import './NotFound.css';

const NotFound = () => {
  return (
    <div className="not-found-container">
      <div className="not-found-content">
        <div className="error-code">404</div>
        <h1 className="error-title">Oops! Page Not Found</h1>
        <p className="error-message">
          The page you're looking for doesn't exist or has been moved.
        </p>
        
        <div className="error-illustration">
          <div className="box box-1"></div>
          <div className="box box-2"></div>
          <div className="box box-3"></div>
        </div>

        <div className="error-actions">
          <Link to="/" className="btn-home">
            <FaHome /> Go to Homepage
          </Link>
          <Link to="/products" className="btn-products">
            <FaSearch /> Browse Products
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
