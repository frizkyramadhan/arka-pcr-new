// ** Returns initials from string (max 2 words when name has 3+ words)
export const getInitials = string => {
  const words = string.trim().split(/\s+/).filter(Boolean)
  const source = words.length >= 3 ? words.slice(0, 2) : words

  return source.reduce((response, word) => response + word.slice(0, 1), '')
}
