const DEFINITELY_BROKEN = new Set([404, 410]);

export function shouldArchiveScholarshipLink(status: number | null) {
  return status !== null && DEFINITELY_BROKEN.has(status);
}
