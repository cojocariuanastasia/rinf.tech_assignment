export const formatPerfumeName = (name) => {
  if (!name) return "";

  return String(name)
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w+/g, (word) =>
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    );
};
