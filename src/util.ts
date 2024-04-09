import { NormalizedUrl } from "@eatonfyi/urls";
import { nanohash } from "@eatonfyi/ids";

type NormalizerResult =  { success: false } | { success: true, url: NormalizedUrl, hash: string };

export function normalizeBookmarkUrl(input: string): NormalizerResult {
  if (!NormalizedUrl.canParse(input)) return { success: false };

  const url = new NormalizedUrl(input);
  const hash = nanohash(url);

  return { success: true, url, hash };
}

type IdBearingEntity = {
  identifier: string,
  type: string,
  additionalType?: string,
}

export function makeId(input: IdBearingEntity, pathSafe = false) {
  return [input.additionalType ?? input.type, input.identifier].join(pathSafe ? '-' : '/');
}