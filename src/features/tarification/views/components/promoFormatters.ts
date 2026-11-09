export const formatPromoDiscount = (
  fixedAmount?: number | null,
  rateAmount?: number | null
): string => {
  const fixed = Number(fixedAmount || 0);
  const rate = Number(rateAmount || 0);

  if (fixed > 0 && rate > 0) {
    return `-${fixed.toLocaleString("fr-FR")} FCFA + ${rate}%`;
  }
  if (rate > 0) {
    return `-${rate}%`;
  }
  if (fixed > 0) {
    return `-${fixed.toLocaleString("fr-FR")} FCFA`;
  }
  return "0 FCFA";
};

export const formatFeeGridLabel = (grid: {
  min_bound: number;
  max_bound: number;
  fixed_fee?: number | null;
  rate_fee?: number | null;
  badge?: string | null;
}): string => {
  const min = Number(grid.min_bound).toLocaleString("fr-FR");
  const max = Number(grid.max_bound).toLocaleString("fr-FR");
  const fixed = Number(grid.fixed_fee || 0);
  const rate = Number(grid.rate_fee || 0);

  let feePart = "";
  if (fixed > 0 && rate > 0) {
    feePart = `(${fixed.toLocaleString("fr-FR")} FCFA + ${rate}%)`;
  } else if (fixed > 0) {
    feePart = `(${fixed.toLocaleString("fr-FR")} FCFA)`;
  } else if (rate > 0) {
    feePart = `(${rate}%)`;
  } else {
    feePart = "(Gratuit)";
  }

  const badgePart = grid.badge ? ` [${grid.badge}]` : "";
  return `${min} à ${max} FCFA ${feePart}${badgePart}`;
};
