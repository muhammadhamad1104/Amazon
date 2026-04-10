export const DEFAULT_PRODUCT_SIZE_OPTIONS = [
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

const toPlainObject = (value) => {
  if (!value) return {};

  if (value instanceof Map) {
    return Object.fromEntries(value.entries());
  }

  if (typeof value.toObject === 'function') {
    return value.toObject();
  }

  if (typeof value === 'object' && !Array.isArray(value)) {
    return value;
  }

  return {};
};

export const normalizeStockQuantity = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }
  return Math.floor(parsed);
};

export const normalizeSizeLabel = (value) => String(value ?? '').trim().toUpperCase();

export const normalizeSizeStockMap = (sizeStock = {}, fallbackStock = 0) => {
  const rawSizeStock = toPlainObject(sizeStock);
  const normalized = {};

  Object.entries(rawSizeStock).forEach(([rawSize, quantity]) => {
    const normalizedSize = normalizeSizeLabel(rawSize);
    if (!normalizedSize) return;

    const normalizedQuantity = normalizeStockQuantity(quantity);
    if (normalizedQuantity <= 0) return;

    normalized[normalizedSize] = normalizedQuantity;
  });

  const fallback = normalizeStockQuantity(fallbackStock);
  if (Object.keys(normalized).length === 0 && fallback > 0) {
    normalized.L = fallback;
  }

  return normalized;
};

export const calculateTotalStockFromSizeStock = (sizeStock = {}) => (
  Object.values(toPlainObject(sizeStock)).reduce(
    (total, quantity) => total + normalizeStockQuantity(quantity),
    0
  )
);

export const getSizeStockForProduct = (product, size) => {
  const normalizedSize = normalizeSizeLabel(size);
  if (!normalizedSize) return 0;

  const normalizedSizeStock = normalizeSizeStockMap(product?.sizeStock, 0);
  const explicitSizeStock = normalizeStockQuantity(normalizedSizeStock[normalizedSize]);

  if (explicitSizeStock > 0) {
    return explicitSizeStock;
  }

  if (Object.keys(normalizedSizeStock).length > 0) {
    return 0;
  }

  const fallbackStock = normalizeStockQuantity(product?.stock || 0);
  return normalizedSize === 'L' ? fallbackStock : 0;
};

export const getProductAvailableSizes = (product) => {
  const normalizedSizeStock = normalizeSizeStockMap(product?.sizeStock, product?.stock || 0);
  return Object.keys(normalizedSizeStock);
};
