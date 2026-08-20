/**
 * Parses a weight string like "50g", "1kg", "500 ml" into a numeric value in a base unit (grams/ml).
 * @param {string|object} w The weight string or object
 * @returns {number} The numeric weight value
 */
export const parseWeightValue = (w) => {
  if (!w) return 1000; // Default to 1kg if missing
  
  let str = "";
  if (typeof w === "string") {
    str = w.toLowerCase().replace(/\s+/g, "");
  } else if (typeof w === "object") {
    if (w.weight !== undefined && w.unit) {
      str = `${w.weight}${w.unit.toLowerCase()}`;
    } else if (w.weight !== undefined) {
      return parseFloat(w.weight);
    } else {
      str = (w.unit || "").toLowerCase();
    }
  }

  const match = str.match(/^(\d+(?:\.\d+)?)\s*([a-z]+)$/);
  if (!match) {
    if (str === "kg" || str === "l" || str === "litre") return 1000;
    if (str === "g" || str === "ml" || str === "gm") return 1;
    return 1000;
  }

  const val = parseFloat(match[1]);
  const unit = match[2];

  if (unit === "kg" || unit === "l" || unit === "litre") return val * 1000;
  if (unit === "g" || unit === "ml" || unit === "gm") return val;
  
  return val; // e.g., "1 pc" -> 1
};

/**
 * Calculates the price for a selected weight based on a base price (assumed for 1kg/1L).
 * @param {number} basePrice Price for the base unit (usually 1000g)
 * @param {string|object} selectedWeight The weight being purchased (e.g. "50g")
 * @param {string|object} baseWeight The unit the price is for (default "1kg")
 * @returns {number} The proportional price
 */
export const calculateProportionalPrice = (basePrice, selectedWeight, baseWeight = "1kg") => {
  const selectedVal = parseWeightValue(selectedWeight);
  const baseVal = parseWeightValue(baseWeight);
  
  if (baseVal === 0) return basePrice;
  
  // Calculate price: (basePrice / baseVal) * selectedVal
  const proportional = (basePrice / baseVal) * selectedVal;
  
  // Return rounded to 2 decimal places
  return Math.round(proportional * 100) / 100;
};
