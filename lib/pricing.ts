function positiveInteger(value: number, name: string) {
  if (!Number.isSafeInteger(value) || value <= 0)
    throw new RangeError(`${name} must be a positive safe integer`)
}

// Whole toman only; round a fractional toman to the nearest integer, halves up.
function roundedRatio(numerator: number, denominator: number) {
  if (!Number.isSafeInteger(numerator)) throw new RangeError('Price exceeds safe integer precision')
  return Math.round(numerator / denominator)
}

/** Both pure-coffee prices must refer to the same weight and grade. */
export function calculateBlendPrice({ arabicaPrice, robustaPrice, arabicaPercent }: {
  arabicaPrice: number
  robustaPrice: number
  arabicaPercent: number
}) {
  positiveInteger(arabicaPrice, 'arabicaPrice')
  positiveInteger(robustaPrice, 'robustaPrice')
  if (!Number.isInteger(arabicaPercent) || arabicaPercent < 0 || arabicaPercent > 100)
    throw new RangeError('arabicaPercent must be an integer between 0 and 100')
  return roundedRatio(arabicaPrice * arabicaPercent + robustaPrice * (100 - arabicaPercent), 100)
}

export function calculateWeightPrice(basePrice: number, baseWeightGrams: number, weightGrams: number) {
  positiveInteger(basePrice, 'basePrice')
  positiveInteger(baseWeightGrams, 'baseWeightGrams')
  positiveInteger(weightGrams, 'weightGrams')
  return roundedRatio(basePrice * weightGrams, baseWeightGrams)
}

/** Double the calculated 5 kg price, then take 3% off exactly once. */
export function calculateTenKilogramPrice(fiveKilogramPrice: number) {
  positiveInteger(fiveKilogramPrice, 'fiveKilogramPrice')
  return roundedRatio(fiveKilogramPrice * 2 * 97, 100)
}
