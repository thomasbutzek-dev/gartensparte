/** Dateiname in der Adresse, damit ein neues Bild nicht aus dem Browser-Cache kommt. */
export function versionedAssetUrl(path: string, fileName: string): string {
  return `${path}?v=${encodeURIComponent(fileName)}`;
}
