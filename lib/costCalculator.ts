import { CostSettings } from '@/types/travel';

/**
 * Calculate fuel cost based on distance, MPG, and price per gallon
 * Formula: C = (D / MPG) × P
 * Where:
 *   D = distance in miles
 *   MPG = miles per gallon
 *   P = price per gallon
 */
export function calculateFuelCost(
  distanceInMiles: number,
  settings: CostSettings
): number {
  const gallonsNeeded = distanceInMiles / settings.mpg;
  const totalCost = gallonsNeeded * settings.pricePerGallon;
  return Number(totalCost.toFixed(2));
}

/**
 * Calculate gallons needed for trip
 */
export function calculateGallonsNeeded(
  distanceInMiles: number,
  mpg: number
): number {
  return Number((distanceInMiles / mpg).toFixed(2));
}
