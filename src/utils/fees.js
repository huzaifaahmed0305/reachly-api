const PLATFORM_FEE_PERCENT = Number(process.env.PLATFORM_FEE_PERCENT) || 10;

export const calculateFees = (grossAmountPKR) => {
  const platformFee = Math.round(grossAmountPKR * (PLATFORM_FEE_PERCENT / 100));
  const creatorPayout = grossAmountPKR - platformFee;
  return { grossAmountPKR, platformFee, creatorPayout, feePercent: PLATFORM_FEE_PERCENT };
};
