import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  {
    ignores: [".next/**", ".open-next/**", ".wrangler/**", "node_modules/**", "packages/**"]
  },
  ...nextVitals,
  ...nextTypescript
];

export default eslintConfig;
