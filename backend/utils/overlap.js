// Check if two [start,end] date ranges overlap (inclusive)
export function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return !(aEnd < bStart || aStart > bEnd);
}
