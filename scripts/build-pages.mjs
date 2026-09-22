import { cp, rm } from "node:fs/promises";

await rm("docs/dist", { recursive: true, force: true });
await cp("dist", "docs/dist", { recursive: true });
await cp("examples/shared-tooltip-gsap/motion.js", "docs/shared-gsap-motion.js");
