import { Link } from 'react-router-dom';
import { PRODUCT_CATEGORY_TREE } from '../../constants/productCategories';
import './CategorySidebar.css';

const CategorySidebar = () => {
  const categoryIcons = {
    "Women's Unstitched Collection": '👗',
    'Kids wear': '🧒',
    'Thrifted pre-loved shoes': '👟',
    Accessories: '👜',
    Beauty: '💄'
  };

  return (
    <div className="category-sidebar">
      <h3 className="sidebar-title">Categories</h3>
      <ul className="category-list">
        {Object.keys(PRODUCT_CATEGORY_TREE).map((category) => (
          <li key={category} className="category-item">
            <div className="category-heading">
              <span className="category-icon">{categoryIcons[category] || '🛍️'}</span>
              <Link
                to={`/products?category=${encodeURIComponent(category)}`}
                className="category-name-link"
              >
                {category}
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CategorySidebar;
