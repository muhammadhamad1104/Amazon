import { Link } from 'react-router-dom';
import './CategorySidebar.css';

const CategorySidebar = () => {
  const categories = [
    { name: 'Electronics', icon: '💻', path: '/products?category=Electronics' },
    { name: 'Clothing', icon: '👕', path: '/products?category=Clothing' },
    { name: 'Books', icon: '📚', path: '/products?category=Books' },
    { name: 'Home & Kitchen', icon: '🏠', path: '/products?category=Home & Kitchen' },
    { name: 'Sports', icon: '⚽', path: '/products?category=Sports' },
    { name: 'Toys', icon: '🧸', path: '/products?category=Toys' },
    { name: 'Beauty', icon: '💄', path: '/products?category=Beauty' },
    { name: 'Automotive', icon: '🚗', path: '/products?category=Automotive' },
    { name: 'Health', icon: '🏥', path: '/products?category=Health' },
    { name: 'Other', icon: '🛍️', path: '/products?category=Other' }
  ];

  return (
    <div className="category-sidebar">
      <h3 className="sidebar-title">Categories</h3>
      <ul className="category-list">
        {categories.map((category, index) => (
          <li key={index} className="category-item">
            <Link to={category.path} className="category-link">
              <span className="category-icon">{category.icon}</span>
              <span className="category-name">{category.name}</span>
              <span className="category-arrow">›</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CategorySidebar;
