import { createDirectus, rest, authentication } from '@directus/sdk';

export const directusBase = () =>
  createDirectus(process.env.DIRECTUS_URL!).with(rest()).with(authentication('json'));
