module.exports = {
  extends: [
    "stylelint-config-recommended",
    "stylelint-config-standard",
    // se instalou stylelint-config-tailwindcss, também pode usar
    // "stylelint-config-tailwindcss"
  ],
  rules: {
    // permite as at-rules do Tailwind sem erro
    "at-rule-no-unknown": [
      true,
      {
        ignoreAtRules: [
          "tailwind",
          "apply",
          "variants",
          "responsive",
          "screen",
          "layer",
          "extend",
          "components",
        ],
      },
    ],
    // outras regras que você queira customizar...
  },
};