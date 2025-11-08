import * as THREE from 'three';
import { ShaderBuilder } from '../utils/shaderBuilder';
import commonChunk from '../shaders/chunks/common.glsl?raw';
import lightingChunk from '../shaders/chunks/lighting.glsl?raw';

export class CustomMaterial extends THREE.ShaderMaterial {
  public constructor() {
    const shader = new ShaderBuilder()
      .addFragmentChunk(commonChunk)
      .addFragmentChunk(lightingChunk)
      .setVertexMain(`
        #include <begin_vertex>
        #include <project_vertex>
      `)
      .setFragmentMain(`
        vec3 normal = getNormal();
        gl_FragColor = vec4(normal * 0.5 + 0.5, 1.0);
      `)
      .build();

    super({
      vertexShader: shader.vertexShader,
      fragmentShader: shader.fragmentShader,
      uniforms: {
        // Add custom uniforms here
      }
    });
  }
}

