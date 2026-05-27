/**
 * Extract initials from a string (e.g., "John Doe" → "JD")
 * Takes up to 2 first characters from each word and converts to uppercase
 */
export function getInitials(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
