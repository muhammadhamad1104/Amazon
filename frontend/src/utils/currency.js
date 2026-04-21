export const formatPKR = (amount, fractionDigits = 2) => {
  const numericValue = Number(amount);
  const safeValue = Number.isFinite(numericValue) ? numericValue : 0;

  return `PKR ${safeValue.toLocaleString('en-PK', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  })}`;
};
