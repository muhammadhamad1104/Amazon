export const DEFAULT_PRODUCT_SIZE_OPTIONS = [
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

export const normalizePriceValue = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }
  return parsed;
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
    const normalizedSize = normalizeSizeLabel(rawSize);
    if (!normalizedSize) return;

    const variant = (
      rawVariant && typeof rawVariant === 'object' && !Array.isArray(rawVariant)
    )
      ? rawVariant
      : { quantity: rawVariant };

    const quantity = normalizeStockQuantity(
      variant.quantity ?? variant.stock ?? variant.qty
    );

    if (quantity <= 0) return;

    let price = normalizePriceValue(
      variant.price ?? normalizedFallbackPrice ?? normalizedFallbackOriginalPrice
    );

    let originalPrice = normalizePriceValue(
      variant.originalPrice ??
      variant.oldPrice ??
      variant.compareAtPrice ??
      price ??
      normalizedFallbackOriginalPrice
    );

    if (price <= 0 && originalPrice > 0) {
      price = originalPrice;
    }

    if (originalPrice <= 0 && price > 0) {
      originalPrice = price;
    }

    if (price <= 0 || originalPrice <= 0) return;

    normalized[normalizedSize] = {
      quantity,
      price,
      originalPrice
    };
  });

  if (Object.keys(normalized).length > 0) {
    return normalized;
  }

  const fallbackSizeStockMap = normalizeSizeStockMap(fallbackSizeStock, 0);

  Object.entries(fallbackSizeStockMap).forEach(([size, quantity]) => {
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

export const deriveSizeStockFromSizePricing = (sizePricing = {}) => {
  const rawSizePricing = toPlainObject(sizePricing);

  return Object.entries(rawSizePricing).reduce((accumulator, [rawSize, rawVariant]) => {
    const normalizedSize = normalizeSizeLabel(rawSize);
    if (!normalizedSize) return accumulator;

    const variant = (
      rawVariant && typeof rawVariant === 'object' && !Array.isArray(rawVariant)
    )
      ? rawVariant
      : { quantity: rawVariant };

    const quantity = normalizeStockQuantity(
      variant.quantity ?? variant.stock ?? variant.qty
    );

    if (quantity <= 0) return accumulator;

    accumulator[normalizedSize] = quantity;
    return accumulator;
  }, {});
};

export const calculateTotalStockFromSizePricing = (sizePricing = {}) => (
  Object.values(deriveSizeStockFromSizePricing(sizePricing)).reduce((total, quantity) => total + quantity, 0)
);

export const selectDisplayPricingFromSizePricing = (
  sizePricing = {},
  fallbackPrice = 0,
  fallbackOriginalPrice = 0
) => {
  const normalizedSizePricing = normalizeSizePricingMap(
    sizePricing,
    {},
    fallbackPrice,
    fallbackOriginalPrice
  );

  const variants = Object.values(normalizedSizePricing);
  if (variants.length > 0) {
    const selectedVariant = variants.reduce((current, candidate) => (
      candidate.price < current.price ? candidate : current
    ));

    return {
      price: normalizePriceValue(selectedVariant.price),
      originalPrice: normalizePriceValue(selectedVariant.originalPrice || selectedVariant.price)
    };
  }

  const price = normalizePriceValue(fallbackPrice || fallbackOriginalPrice);
  const originalPrice = normalizePriceValue(fallbackOriginalPrice || price);

  return {
    price,
    originalPrice: originalPrice || price
  };
};

export const calculateTotalStockFromSizeStock = (sizeStock = {}) => (
  Object.values(toPlainObject(sizeStock)).reduce(
    (total, quantity) => total + normalizeStockQuantity(quantity),
    0
  )
);

export const getSizePricingForProduct = (product, size) => {
  const normalizedSizePricing = normalizeSizePricingMap(
    product?.sizePricing,
    product?.sizeStock,
    product?.price || 0,
    product?.originalPrice || product?.price || 0
  );

  const sizeOptions = Object.keys(normalizedSizePricing);
  const normalizedSize = normalizeSizeLabel(size);

  if (normalizedSize && normalizedSizePricing[normalizedSize]) {
    return {
      size: normalizedSize,
      ...normalizedSizePricing[normalizedSize]
    };
  }

  const fallbackSize = sizeOptions[0] || normalizedSize || 'L';
  const fallbackVariant = normalizedSizePricing[fallbackSize] || {
    quantity: 0,
    price: normalizePriceValue(product?.price || 0),
    originalPrice: normalizePriceValue(product?.originalPrice || product?.price || 0)
  };

  return {
    size: fallbackSize,
    quantity: normalizeStockQuantity(fallbackVariant.quantity),
    price: normalizePriceValue(fallbackVariant.price),
    originalPrice: normalizePriceValue(fallbackVariant.originalPrice || fallbackVariant.price)
  };
};

export const getSizeStockForProduct = (product, size) => {
  return normalizeStockQuantity(getSizePricingForProduct(product, size).quantity);
};

export const getProductAvailableSizes = (product) => {
  const normalizedSizePricing = normalizeSizePricingMap(
    product?.sizePricing,
    product?.sizeStock,
    product?.price || 0,
    product?.originalPrice || product?.price || 0
  );
  return Object.keys(normalizedSizePricing);
};
