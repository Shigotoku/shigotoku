export const newsCategoryStyles: Record<string, string> = {
  Product: 'bg-blue-50 text-blue-700',
  Company: 'bg-gray-100 text-gray-700',
  Media: 'bg-violet-50 text-violet-700',
};

export function formatNewsDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}.${m}.${d}`;
}
