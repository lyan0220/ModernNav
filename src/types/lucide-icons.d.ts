// Individual lucide icon files ship without their own .d.ts (types live in
// the barrel only). Our deep imports (src/utils/icons.ts) therefore need
// this wildcard declaration; every icon is a LucideIcon component with a
// default export.
declare module "lucide-react/dist/esm/icons/*" {
  import type { LucideIcon } from "lucide-react";
  const icon: LucideIcon;
  export default icon;
}
