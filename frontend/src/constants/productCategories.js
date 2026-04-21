export const PRODUCT_CATEGORY_TREE = {
  "Women's Unstitched Collection": ['3pc', '2pc'],
  'Kids wear': ['Boys', 'Girls'],
  'Thrifted pre-loved shoes': ["Men's", "Women's"],
  Accessories: ['Watches', 'Handbags', 'Jewelry', 'Hair item'],
  Beauty: []
};

export const PRODUCT_CATEGORY_OPTIONS = Object.keys(PRODUCT_CATEGORY_TREE);

export const getSubcategoryOptions = (category) => PRODUCT_CATEGORY_TREE[category] || [];

export const formatCategoryLabel = (category, subcategory) => {
  if (!subcategory) return category;
  return `${category} - ${subcategory}`;
};
