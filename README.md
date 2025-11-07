# Tattoo Renderer

A WebGL renderer built with Three.js and TypeScript for experimenting with multi-pass rendering and shader techniques.

## Features

- Single HTML page with canvas element
- TypeScript + Three.js rendering
- Modular shader system with chunk imports
- Multi-pass renderer support
- Auto-reload on TypeScript changes

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

The app will open automatically in your browser with hot module replacement enabled.

## Project Structure

```
src/
├── main.ts                 # Entry point
├── renderers/
│   └── Renderer.ts         # Main renderer class
├── shaders/
│   ├── chunks/             # Reusable shader chunks
│   ├── materials/          # Custom materials
│   └── utils/              # Shader utilities
└── loaders/
    └── ResourceLoader.ts   # 3D models and texture loading
```

## Adding Resources

Place 3D models in `public/assets/models/` and textures in `public/assets/textures/`, then load them in `ResourceLoader.ts`.

