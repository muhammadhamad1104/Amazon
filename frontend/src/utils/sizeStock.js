export const DEFAULT_SIZE_OPTIONS = [
  'S',
  'M',
  'L',
  'XL',
  'XXL',
  '20',
  '22',
  '24',
  '26',
  '2 PIECE',
  '3 PIECE'
];

const LETTER_SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

const toPlainObject = (value) => {
  if (!value) return {};

  if (value instanceof Map) {
    return Object.fromEntries(value.entries());
  }

  if (typeof value === 'object' && !Array.isArray(value)) {
    return value;
  }

  return {};
};

const normalizeStockQuantity = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }
  return Math.floor(parsed);
};

const normalizePriceValue = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }
  return parsed;
};

export const normalizeSizeLabel = (value) => String(value ?? '').trim().toUpperCase();

export const normalizeSizeStock = (sizeStock = {}, fallbackStock = 0) => {
  const normalized = {};

  if (sizeStock && typeof sizeStock === 'object' && !Array.isArray(sizeStock)) {
    Object.entries(toPlainObject(sizeStock)).forEach(([rawSize, rawQuantity]) => {
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

export const normalizeSizePricingMap = (
  sizePricing = {},
  fallbackSizeStock = {},
  fallbackPrice = 0,
  fallbackOriginalPrice = 0
) => {
  const rawSizePricing = toPlainObject(sizePricing);
  const normalized = {};

  const normalizedFallbackPrice = normalizePriceValue(fallbackPrice);
  const normalizedFallbackOriginalPrice = normalizePriceValue(
    fallbackOriginalPrice || normalizedFallbackPrice
  );

  Object.entries(rawSizePricing).forEach(([rawSize, rawVariant]) => {
    const size = normalizeSizeLabel(rawSize);
    if (!size) return;

    const variant = (
      rawVariant && typeof rawVariant === 'object' && !Array.isArray(rawVariant)
    )
      ? rawVariant
      : { quantity: rawVariant };

    const quantity = normalizeStockQuantity(variant.quantity ?? variant.stock ?? variant.qty);
    if (quantity <= 0) return;

    let price = normalizePriceValue(
      variant.price ?? normalizedFallbackPrice ?? normalizedFallbackOriginalPrice
    );

    let originalPrice = normalizePriceValue(
      variant.originalPrice ?? variant.oldPrice ?? variant.compareAtPrice ?? price ?? normalizedFallbackOriginalPrice
    );

    if (price <= 0 && originalPrice > 0) {
      price = originalPrice;
    }

    if (originalPrice <= 0 && price > 0) {
      originalPrice = price;
    }

    if (price <= 0 || originalPrice <= 0) return;

    normalized[size] = {
      quantity,
      price,
      originalPrice
    };
  });

  if (Object.keys(normalized).length > 0) {
    return normalized;
  }

  const fallbackStockMap = normalizeSizeStock(fallbackSizeStock, 0);

  Object.entries(fallbackStockMap).forEach(([size, quantity]) => {
    const price = normalizePriceValue(normalizedFallbackPrice || normalizedFallbackOriginalPrice);
    const originalPrice = normalizePriceValue(normalizedFallbackOriginalPrice || price);

    if (quantity <= 0 || price <= 0 || originalPrice <= 0) return;

    normalized[size] = {
      quantity,
      price,
      originalPrice
    };
  });

  return normalized;
};

export const getProductSizePricingMap = (product) => normalizeSizePricingMap(
  product?.sizePricing,
  product?.sizeStock,
  product?.price || 0,
  product?.originalPrice || product?.price || 0
);

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

export const getProductSizeStockMap = (product) => {
  const sizePricingMap = getProductSizePricingMap(product);

  if (Object.keys(sizePricingMap).length > 0) {
    return Object.entries(sizePricingMap).reduce((accumulator, [size, variant]) => {
      accumulator[size] = normalizeStockQuantity(variant.quantity);
      return accumulator;
    }, {});
  }

  return normalizeSizeStock(product?.sizeStock, product?.stock || 0);
};

export const getProductAvailableSizes = (product) => {
  const sizePricingMap = getProductSizePricingMap(product);

  if (Object.keys(sizePricingMap).length > 0) {
    return sortSizeKeys(Object.keys(sizePricingMap));
  }

  const sizeStock = getProductSizeStockMap(product);
  return sortSizeKeys(Object.keys(sizeStock));
};

export const getDisplaySize = (size, fallback = 'L') => normalizeSizeLabel(size) || fallback;

export const getSizePricingForProduct = (product, size) => {
  const sizePricingMap = getProductSizePricingMap(product);
  const normalizedSize = normalizeSizeLabel(size);
  const availableSizes = sortSizeKeys(Object.keys(sizePricingMap));

  if (normalizedSize && sizePricingMap[normalizedSize]) {
    return {
      size: normalizedSize,
      quantity: normalizeStockQuantity(sizePricingMap[normalizedSize].quantity),
      price: normalizePriceValue(sizePricingMap[normalizedSize].price),
      originalPrice: normalizePriceValue(
        sizePricingMap[normalizedSize].originalPrice || sizePricingMap[normalizedSize].price
      )
    };
  }

  if (availableSizes.length > 0) {
    const firstSize = availableSizes[0];
    const firstVariant = sizePricingMap[firstSize];

    return {
      size: firstSize,
      quantity: normalizeStockQuantity(firstVariant.quantity),
      price: normalizePriceValue(firstVariant.price),
      originalPrice: normalizePriceValue(firstVariant.originalPrice || firstVariant.price)
    };
  }

  const fallbackPrice = normalizePriceValue(product?.price || 0);
  const fallbackOriginalPrice = normalizePriceValue(product?.originalPrice || fallbackPrice);

  return {
    size: normalizedSize || 'L',
    quantity: 0,
    price: fallbackPrice || fallbackOriginalPrice,
    originalPrice: fallbackOriginalPrice || fallbackPrice
  };
};

export const getSizeStockForProduct = (product, size) => {
  return normalizeStockQuantity(getSizePricingForProduct(product, size).quantity);
};
