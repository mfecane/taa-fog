import './styles.css';
import { Renderer } from './Renderer';
import { ResourceLoader } from './loaders/ResourceLoader';

class App {
  private canvas: HTMLCanvasElement;
  private renderer: Renderer;
  private resourceLoader: ResourceLoader;

  public constructor() {
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;
    if (!this.canvas) {
      throw new Error('Canvas element not found');
    }

    this.resourceLoader = new ResourceLoader();
    this.renderer = new Renderer(this.canvas, this.resourceLoader);

    this.init();
  }

  private async init(): Promise<void> {
    try {
      // Load resources
      await this.resourceLoader.loadAll();

      // Initialize renderer
      await this.renderer.init();

      // Start render loop
      this.renderer.start();
    } catch (error) {
      console.error('Failed to initialize app:', error);
    }
  }
}

// Start the app
new App();

