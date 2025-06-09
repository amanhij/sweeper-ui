// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
    "./src/ui/**/*.{tsx,ts,js,jsx}"
  ],
  theme: {
    extend: {
      backgroundImage: {
        "jupiter-futuristic": "url('/jupiter-bg.png')",
      },
      colors: {
        'neutral-border': '#2A2A2A',
        'subtext-color': '#666666',
      },
      fontFamily: {
        'body': ['Inter', 'sans-serif'],
        'body-bold': ['Inter', 'sans-serif'],
        'caption': ['Inter', 'sans-serif'],
        'caption-bold': ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
