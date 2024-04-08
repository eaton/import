import { NormalizedUrl } from "@eatonfyi/urls";
import { nanohash } from "@eatonfyi/ids";

type NormalizerResult =  { success: false } | { success: true, url: NormalizedUrl, hash: string };

export function normalizeBookmarkUrl(input: string): NormalizerResult {
  if (!NormalizedUrl.canParse(input)) return { success: false };

  const url = new NormalizedUrl(input);
  const hash = nanohash(url);

  return { success: true, url, hash };
}