import { CATEGORY_LABELS } from '../config/categories';

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildSummary(description: string | undefined, categories: string[]): string {
  const cleaned = description ? stripHtml(description) : '';
  if (cleaned.length > 0) {
    return cleaned.length > 280 ? `${cleaned.slice(0, 277)}...` : cleaned;
  }

  const primary = categories[0];
  const label = primary ? (CATEGORY_LABELS[primary] ?? primary) : 'utility';
  return `${label} token tracked for real-world utility and market fundamentals.`;
}
