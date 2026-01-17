/**
 * Type declarations for lucide-react direct icon imports.
 * These bypass the barrel file (index.js) for better tree-shaking and reduced bundle size.
 *
 * @see https://lucide.dev/guide/packages/lucide-react
 */

declare module 'lucide-react/dist/esm/icons/*' {
  import { LucideIcon } from 'lucide-react';
  const icon: LucideIcon;
  export default icon;
}
