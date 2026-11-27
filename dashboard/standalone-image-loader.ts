import type { ImageLoaderProps } from 'next/image'

// Local Payload serves uploads itself. It does not expose Figma image transforms.
export default function standaloneImageLoader({ src }: ImageLoaderProps) {
  return src
}
