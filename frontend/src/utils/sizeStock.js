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

export const DEFAULT_VARIANT_COLOR = 'Default';

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

export const normalizeColorLabel = (value) => String(value ?? '').trim();

const normalizeColorKey = (value) => normalizeColorLabel(value).toLowerCase();

export const normalizeColorList = (value) => {
  const source = Array.isArray(value)
    ? value
    : (typeof value === 'string' ? value.split(',') : []);

  const seen = new Set();
  const normalized = [];

  source.forEach((rawColor) => {
    const color = normalizeColorLabel(rawColor);
    if (!color) return;

    const colorKey = normalizeColorKey(color);
    if (seen.has(colorKey)) return;

    seen.add(colorKey);
    normalized.push(color);
  });

  return normalized;
};

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

const normalizeVariantColors = (variant = {}, fallbackQuantity = 0) => {
  const colors = normalizeColorList(
    variant.colors ?? variant.color ?? variant.colours
  );

  if (colors.length > 0) {
    return colors;
  }

  if (normalizeStockQuantity(fallbackQuantity) > 0) {
    return [DEFAULT_VARIANT_COLOR];
  }

  return [];
};

const normalizeVariantQuantity = (variant = {}, colors = []) => {
  const rawQuantity = variant.quantity ?? variant.stock ?? variant.qty;
  const quantity = normalizeStockQuantity(rawQuantity);

  if (quantity > 0) {
    return quantity;
  }

  return colors.length;
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

    const colors = normalizeVariantColors(
      variant,
      variant.quantity ?? variant.stock ?? variant.qty
    );

    const quantity = normalizeVariantQuantity(variant, colors);
    if (quantity <= 0 && colors.length === 0) return;

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

    const normalizedColors = colors.length > 0
      ? colors
      : [DEFAULT_VARIANT_COLOR];

    const normalizedQuantity = quantity > 0
      ? quantity
      : normalizedColors.length;

    normalized[size] = {
      colors: normalizedColors,
      quantity: normalizedQuantity,
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
      colors: normalizeVariantColors({}, quantity),
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
      const colors = normalizeVariantColors(variant, variant.quantity ?? variant.stock ?? variant.qty);
      accumulator[size] = normalizeVariantQuantity(variant, colors);
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
    const selectedVariant = sizePricingMap[normalizedSize] || {};
    const selectedColors = normalizeVariantColors(
      selectedVariant,
      selectedVariant.quantity ?? selectedVariant.stock ?? selectedVariant.qty
    );

    return {
      size: normalizedSize,
      colors: selectedColors,
      quantity: normalizeVariantQuantity(selectedVariant, selectedColors),
      price: normalizePriceValue(selectedVariant.price),
      originalPrice: normalizePriceValue(
        selectedVariant.originalPrice || selectedVariant.price
      )
    };
  }

  if (availableSizes.length > 0) {
    const firstSize = availableSizes[0];
    const firstVariant = sizePricingMap[firstSize];
    const firstColors = normalizeVariantColors(
      firstVariant,
      firstVariant.quantity ?? firstVariant.stock ?? firstVariant.qty
    );

    return {
      size: firstSize,
      colors: firstColors,
      quantity: normalizeVariantQuantity(firstVariant, firstColors),
      price: normalizePriceValue(firstVariant.price),
      originalPrice: normalizePriceValue(firstVariant.originalPrice || firstVariant.price)
    };
  }

  const fallbackPrice = normalizePriceValue(product?.price || 0);
  const fallbackOriginalPrice = normalizePriceValue(product?.originalPrice || fallbackPrice);

  return {
    size: normalizedSize || 'L',
    colors: [],
    quantity: 0,
    price: fallbackPrice || fallbackOriginalPrice,
    originalPrice: fallbackOriginalPrice || fallbackPrice
  };
};

export const getSizeStockForProduct = (product, size) => {
  return normalizeStockQuantity(getSizePricingForProduct(product, size).quantity);
};

export const getSizeColorsForProduct = (product, size) => {
  const sizePricing = getSizePricingForProduct(product, size);
  return normalizeColorList(sizePricing.colors);
};

export const isColorAvailableForProduct = (product, size, color) => {
  const normalizedColor = normalizeColorLabel(color);
  if (!normalizedColor) return false;

  const availableColors = getSizeColorsForProduct(product, size);
  return availableColors.some((candidate) => normalizeColorKey(candidate) === normalizeColorKey(normalizedColor));
};
