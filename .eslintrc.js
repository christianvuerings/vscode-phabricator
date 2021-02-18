module.exports = {
  env: {
    es6: true,
    node: true
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "tsconfig.json",
    sourceType: "module"
  },
  plugins: ["@typescript-eslint"],
  ignorePatterns: ['.eslintrc.js'],
  rules: {
    "@typescript-eslint/member-delimiter-style": [
      "error",
      {
        multiline: {
          delimiter: "semi",
          requireLast: true
        },
        singleline: {
          delimiter: "semi",
          requireLast: false
        }
      }
    ],
    "@typescript-eslint/semi": ["error", "always"],
    curly: "error",
    eqeqeq: ["error", "always"],
    "no-redeclare": "error",
    "no-throw-literal": "error",
    "no-unused-expressions": "error"
  }
};
