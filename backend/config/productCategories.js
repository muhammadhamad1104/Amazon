export const CATEGORY_TREE = {
  "Women's Unstitched Collection": ['3pc', '2pc'],
  'Kids wear': ['Boys', 'Girls'],
  'Thrifted pre-loved shoes': ["Men's", "Women's"],
  Accessories: ['Watches', 'Handbags', 'Jewelry', 'Hair item'],
  Beauty: []
};

export const CATEGORY_NAMES = Object.keys(CATEGORY_TREE);

export const getSubcategories = (category) => CATEGORY_TREE[category] || [];

export const categoryNeedsSubcategory = (category) => getSubcategories(category).length > 0;

export const isValidCategory = (category) => CATEGORY_NAMES.includes(category);

export const isValidSubcategory = (category, subcategory) => {
  if (!isValidCategory(category)) return false;

  const options = getSubcategories(category);
  if (options.length === 0) {
    return !subcategory;
  }

  return options.includes(subcategory);
};
