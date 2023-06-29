import { baseAPI } from "./request";

export default async function getImageUrl(url: string) {
  return await baseAPI.get<Buffer>(
    url,
    {},
    {
      responseType: 'arraybuffer',
    },
  );
}
