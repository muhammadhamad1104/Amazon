export const DEFAULT_SIZE_OPTIONS = [
  'S',
  'M',
  'L',
  'XL',
  'XXL',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  '11',
  '12'
];

const LETTER_SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

const normalizeStockQuantity = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }
  return Math.floor(parsed);
};

export const normalizeSizeLabel = (value) => String(value ?? '').trim().toUpperCase();

export const normalizeSizeStock = (sizeStock = {}, fallbackStock = 0) => {
  const normalized = {};

  if (sizeStock && typeof sizeStock === 'object' && !Array.isArray(sizeStock)) {
    Object.entries(sizeStock).forEach(([rawSize, rawQuantity]) => {
      const size = normalizeSizeLabel(rawSize);
      const quantity = normalizeStockQuantity(rawQuantity);

      if (!size || quantity <= 0) return;
      normalized[size] = quantity;
    });
  }

  const fallback = normalizeStockQuantity(fallbackStock);
  if (Object.keys(normalized).length === 0 && fallback > 0) {
    normalized.L = fallback;
  }

  return normalized;
};

const compareSizeKeys = (left, right) => {
  const leftSize = normalizeSizeLabel(left);
  const rightSize = normalizeSizeLabel(right);

  const leftLetterIndex = LETTER_SIZE_ORDER.indexOf(leftSize);
  const rightLetterIndex = LETTER_SIZE_ORDER.indexOf(rightSize);

  if (leftLetterIndex > -1 && rightLetterIndex > -1) {
    return leftLetterIndex - rightLetterIndex;
  }

  if (leftLetterIndex > -1) {
    return -1;
  }

  if (rightLetterIndex > -1) {
    return 1;
  }

  const leftNumber = Number(leftSize);
  const rightNumber = Number(rightSize);

  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
    return leftNumber - rightNumber;
  }

  if (Number.isFinite(leftNumber)) {
    return -1;
  }

  if (Number.isFinite(rightNumber)) {
    return 1;
  }

  return leftSize.localeCompare(rightSize);
};

export const sortSizeKeys = (sizes = []) => {
  const uniqueSizes = [...new Set(sizes.map((size) => normalizeSizeLabel(size)).filter(Boolean))];
  return uniqueSizes.sort(compareSizeKeys);
};

export const getProductSizeStockMap = (product) => normalizeSizeStock(product?.sizeStock, product?.stock || 0);

export const getProductAvailableSizes = (product) => {
  const sizeStock = getProductSizeStockMap(product);
  return sortSizeKeys(Object.keys(sizeStock));
};

export const getDisplaySize = (size, fallback = 'L') => normalizeSizeLabel(size) || fallback;

export const getSizeStockForProduct = (product, size) => {
  const sizeStock = getProductSizeStockMap(product);
  const normalizedSize = normalizeSizeLabel(size);

  if (!normalizedSize) {
    const firstAvailableSize = getProductAvailableSizes(product)[0];
    return firstAvailableSize ? sizeStock[firstAvailableSize] || 0 : 0;
  }

  return sizeStock[normalizedSize] || 0;
};
