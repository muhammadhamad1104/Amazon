import { formatPKR } from '../../utils/currency';
import { getProductPriceMeta } from '../../utils/pricing';
import './PriceDisplay.css';

const PriceDisplay = ({
  product,
  size = '',
  variant = 'default',
  className = '',
  showFromLabel = false
}) => {
  const {
    currentPrice,
    originalPrice,
    hasDifference,
    direction,
    percentageText,
    isFrom
  } = getProductPriceMeta(product, size);

  const classes = ['price-display', `price-display-${variant}`, className].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      {showFromLabel && isFrom && (
        <span className="price-from">From</span>
      )}
      {hasDifference && (
        <span className="price-original">{formatPKR(originalPrice)}</span>
      )}
      <span className="price-current">{formatPKR(currentPrice)}</span>
      {hasDifference && (
        <span className={`price-change ${direction}`}>{percentageText}</span>
      )}
    </div>
  );
};

export default PriceDisplay;
