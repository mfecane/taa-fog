import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { TextureLoader } from 'three';

export interface LoadedResources {
  models: Map<string, THREE.Group>;
  textures: Map<string, THREE.Texture>;
}

export class ResourceLoader {
  private gltfLoader: GLTFLoader;
  private textureLoader: TextureLoader;
  private resources: LoadedResources;

  public constructor() {
    this.gltfLoader = new GLTFLoader();
    this.textureLoader = new TextureLoader();
    this.resources = {
      models: new Map(),
      textures: new Map()
    };
  }

  public async loadAll(): Promise<void> {
    // Load all resources here
    // Example:
    // await this.loadModel('model1', '/assets/models/model1.gltf');
    // await this.loadTexture('texture1', '/assets/textures/texture1.jpg');

    console.log('Resources loaded');
  }

  public async loadModel(name: string, path: string): Promise<THREE.Group> {
    return new Promise((resolve, reject) => {
      this.gltfLoader.load(
        path,
        (gltf: any) => {
          const model = gltf.scene;
          this.resources.models.set(name, model);
          resolve(model);
        },
        undefined,
        (error: unknown) => {
          console.error(`Failed to load model ${name}:`, error);
          reject(error);
        }
      );
    });
  }

  public async loadTexture(name: string, path: string): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
      this.textureLoader.load(
        path,
        (texture: THREE.Texture) => {
          this.resources.textures.set(name, texture);
          resolve(texture);
        },
        undefined,
        (error: unknown) => {
          console.error(`Failed to load texture ${name}:`, error);
          reject(error);
        }
      );
    });
  }

  public getModel(name: string): THREE.Group | undefined {
    return this.resources.models.get(name);
  }

  public getTexture(name: string): THREE.Texture | undefined {
    return this.resources.textures.get(name);
  }

  public getResources(): LoadedResources {
    return this.resources;
  }
}

