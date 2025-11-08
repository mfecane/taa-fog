# TAA Fog

A WebGL renderer built with Three.js and TypeScript featuring Temporal Anti-Aliasing (TAA) and advanced fog rendering with multi-pass rendering techniques.

## Features

- **Temporal Anti-Aliasing (TAA)** - Smooth anti-aliasing using temporal reprojection
- **Stochastic Depth & Transparency** - Advanced transparency rendering with stochastic sampling
- **Fog Rendering** - Volumetric fog with temporal blending for smooth animations
- **Multi-Pass Rendering Pipeline** - Optimized rendering pipeline with downsampling support
- **Custom Shader Materials** - Modular shader system with GLSL chunk imports
- **TypeScript + Three.js** - Type-safe WebGL rendering
- **Hot Module Replacement** - Auto-reload on code changes during development

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

The app will open automatically in your browser at `http://localhost:3000` with hot module replacement enabled.

3. Build for production:
```bash
npm run build
```

4. Preview production build:
```bash
npm run preview
```

## Project Structure

```
src/
├── main.ts                    # Application entry point
├── Renderer.ts                # Main renderer class
├── Pipeline.ts                # Multi-pass rendering pipeline
├── Scene.ts                   # Scene setup and management
├── materials/                 # Custom Three.js materials
│   ├── ComposeMaterial.ts     # Final composition pass
│   ├── FogMaterial.ts         # Fog rendering
│   ├── FogBlendMaterial.ts    # Fog temporal blending
│   ├── StochasticDepthMaterial.ts
│   ├── StochasticTransparencyMaterial.ts
│   ├── TAABlendMaterial.ts   # TAA blending
│   ├── TAABlendSimpleMaterial.ts
│   └── TAAVelocityMaterial.ts # TAA velocity buffer
├── shaders/                   # GLSL shader files
│   ├── chunks/                # Reusable shader chunks
│   │   ├── common.glsl
│   │   └── lighting.glsl
│   ├── fog.*.glsl             # Fog shaders
│   ├── taa*.glsl              # TAA shaders
│   └── stochastic*.glsl      # Stochastic transparency shaders
├── loaders/
│   └── ResourceLoader.ts      # 3D models and texture loading
└── utils/
    └── shaderBuilder.ts       # Shader compilation utilities
```

## Adding Resources

Place 3D models in `public/assets/models/` and textures in `public/assets/textures/`, then load them in `ResourceLoader.ts`.

## Deployment

This project is configured for automatic deployment to GitHub Pages.

### Repository

```
git@github.com:mfecane/taa-fog.git
```

### Deployment Scripts

The following npm scripts are available for deployment:

- `npm run deploy:build` - Build the project for production
- `npm run deploy:check` - Build and verify the build is ready for deployment
- `npm run deploy:preview` - Build and preview the production build locally

### Automated Deployment

The project uses GitHub Actions to automatically build and deploy to GitHub Pages.

**GitHub Actions Workflows:**

1. **Deploy Workflow** (`.github/workflows/deploy.yml`):
   - Automatically deploys on push to `master` or `main` branches
   - Can be manually triggered via GitHub Actions UI
   - Builds, verifies, and deploys to GitHub Pages
   - Supports both `master` and `main` branch names

2. **Build Check Workflow** (`.github/workflows/build.yml`):
   - Runs on pull requests and non-main branches
   - Verifies the project builds successfully
   - Type checks and validates build output

**Setup Steps:**

1. Push your code to GitHub:
```bash
git remote add origin git@github.com:mfecane/taa-fog.git
git push -u origin master
```

2. Enable GitHub Pages:
   - Go to your repository on GitHub
   - Navigate to **Settings** → **Pages**
   - Under **Source**, select **GitHub Actions**
   - Save the settings

3. The workflow will automatically:
   - Build the project on every push to `master` or `main`
   - Verify the build output
   - Deploy to GitHub Pages
   - Your site will be available at: `https://mfecane.github.io/taa-fog/`

**Manual Deployment Trigger:**

You can also manually trigger a deployment:
- Go to **Actions** tab in GitHub
- Select **Deploy to GitHub Pages** workflow
- Click **Run workflow** button

### Manual Deployment

If you prefer to deploy manually:

```bash
npm run deploy:check  # Build and verify
# Then push the dist folder to a gh-pages branch or use GitHub CLI
```

## Technologies

- **Three.js** - 3D graphics library
- **TypeScript** - Type-safe JavaScript
- **Vite** - Build tool and dev server
- **GLSL** - Shader programming language

## License

MIT
