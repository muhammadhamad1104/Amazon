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
        {Object.entries(PRODUCT_CATEGORY_TREE).map(([category, subcategories]) => (
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
            {subcategories.length > 0 && (
              <ul className="subcategory-list">
                {subcategories.map((subcategory) => (
                  <li key={subcategory}>
                    <Link
                      to={`/products?category=${encodeURIComponent(category)}&subcategory=${encodeURIComponent(subcategory)}`}
                      className="subcategory-link"
                    >
                      {subcategory}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CategorySidebar;
