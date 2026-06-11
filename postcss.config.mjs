const config = {
  plugins: {
    "@tailwindcss/postcss": {},
    "postcss-preset-env": {
      stage: 2,
      features: {
        "oklab-function": true,
        "color-function": true,
        "nesting-rules": true,
      },
      browsers: "Chrome >= 80, Safari >= 15, Firefox >= 80, Edge >= 80",
    },
  },
};

export default config;
