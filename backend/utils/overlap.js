export function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return (aStart < bEnd) && (aEnd > bStart);
}