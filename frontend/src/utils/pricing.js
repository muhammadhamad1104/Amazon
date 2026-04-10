import { getProductAvailableSizes, getSizePricingForProduct } from './sizeStock';

export const normalizePrice = (value, fallback = 0) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return Number(fallback) > 0 ? Number(fallback) : 0;
  }
  return parsed;
};

const formatPercent = (value) => {
  const rounded = Math.round(value * 10) / 10;
  const hasFraction = Math.abs(rounded % 1) > 0;
  return hasFraction ? rounded.toFixed(1) : String(Math.trunc(rounded));
};

const getDefaultSizePriceMeta = (product) => {
  const availableSizes = getProductAvailableSizes(product);

  if (availableSizes.length === 0) {
    const currentPrice = normalizePrice(product?.price, 0);
    const originalCandidate = normalizePrice(product?.originalPrice, currentPrice);
    const originalPrice = originalCandidate > 0 ? originalCandidate : currentPrice;

    return {
      selectedSize: '',
      currentPrice,
      originalPrice,
      isFrom: false
    };
  }

  const variants = availableSizes
    .map((size) => ({ size, ...getSizePricingForProduct(product, size) }))
    .filter((variant) => normalizePrice(variant.price, 0) > 0 || normalizePrice(variant.originalPrice, 0) > 0);

  if (variants.length === 0) {
    return {
      selectedSize: availableSizes[0] || '',
      currentPrice: 0,
      originalPrice: 0,
      isFrom: false
    };
  }

  const selectedVariant = variants.reduce((current, candidate) => (
    normalizePrice(candidate.price, 0) < normalizePrice(current.price, 0)
      ? candidate
      : current
  ));

  const currentPrice = normalizePrice(selectedVariant.price, 0);
  const originalCandidate = normalizePrice(selectedVariant.originalPrice, currentPrice);
  const originalPrice = originalCandidate > 0 ? originalCandidate : currentPrice;

  return {
    selectedSize: selectedVariant.size,
    currentPrice,
    originalPrice,
    isFrom: availableSizes.length > 1
  };
};

export const getProductPriceMeta = (product, size = '') => {
  const normalizedSize = String(size || '').trim();

  const sizePricingMeta = normalizedSize
    ? getSizePricingForProduct(product, normalizedSize)
    : null;

  const defaultSizeMeta = sizePricingMeta ? null : getDefaultSizePriceMeta(product);

  const currentPrice = sizePricingMeta
    ? normalizePrice(sizePricingMeta.price, 0)
    : defaultSizeMeta.currentPrice;

  const originalPrice = sizePricingMeta
    ? normalizePrice(sizePricingMeta.originalPrice, currentPrice) || currentPrice
    : defaultSizeMeta.originalPrice;

  const selectedSize = sizePricingMeta
    ? sizePricingMeta.size
    : defaultSizeMeta.selectedSize;

  const isFrom = normalizedSize
    ? false
    : defaultSizeMeta.isFrom;

  const difference = currentPrice - originalPrice;
  const hasDifference = Math.abs(difference) > 0.0001;

  if (!hasDifference || originalPrice <= 0) {
    return {
      selectedSize,
      currentPrice,
      originalPrice,
      isFrom,
      hasDifference: false,
      direction: 'same',
      percentage: 0,
      percentageText: '0%'
    };
  }

  const percentage = (difference / originalPrice) * 100;
  const direction = difference > 0 ? 'increase' : 'decrease';
  const percentageText = `${direction === 'increase' ? '+' : '-'}${formatPercent(Math.abs(percentage))}%`;

  return {
    selectedSize,
    currentPrice,
    originalPrice,
    isFrom,
    hasDifference: true,
    direction,
    percentage,
    percentageText
  };
};
