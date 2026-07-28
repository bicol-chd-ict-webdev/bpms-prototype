export type PaginationToken = number | 'ellipsis-left' | 'ellipsis-right';

/**
 * Limits a pager to three numbered pages while retaining access to the first,
 * current, and last page through previous/next links and ellipsis indicators.
 */
export function getPaginationTokens(totalPages: number, currentPage: number): PaginationToken[] {
  const pageCount = Math.max(1, totalPages);
  const activePage = Math.min(Math.max(1, currentPage), pageCount);

  if (pageCount <= 3) return Array.from({ length: pageCount }, (_, index) => index + 1);
  if (activePage <= 2) return [1, 2, 3, 'ellipsis-right'];
  if (activePage >= pageCount - 1) return ['ellipsis-left', pageCount - 2, pageCount - 1, pageCount];

  return [1, 'ellipsis-left', activePage, 'ellipsis-right', pageCount];
}
