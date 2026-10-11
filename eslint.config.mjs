// ESLint 9 flat config (Next 16 removed `next lint`). eslint-config-next@16
// ships native flat configs, so we spread them directly.
import next from "eslint-config-next";

const eslintConfig = [
  { ignores: ["node_modules/**", ".next/**", "prisma/seed.ts", "scripts/**"] },
  ...next,
  {
    rules: {
      // Date.now()/new Date() during render is correct in our server components
      // (rendered once per request). The new react-hooks purity rule flags it as
      // if these were client components — a false positive for RSC pages.
      "react-hooks/purity": "off",
    },
  },
];

export default eslintConfig;
