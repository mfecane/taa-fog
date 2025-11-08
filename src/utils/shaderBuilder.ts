// Utility for building shaders from chunks

export class ShaderBuilder {
  private vertexChunks: string[] = [];
  private fragmentChunks: string[] = [];
  private vertexMain: string = '';
  private fragmentMain: string = '';

  public addVertexChunk(chunk: string): this {
    this.vertexChunks.push(chunk);
    return this;
  }

  public addFragmentChunk(chunk: string): this {
    this.fragmentChunks.push(chunk);
    return this;
  }

  public setVertexMain(code: string): this {
    this.vertexMain = code;
    return this;
  }

  public setFragmentMain(code: string): this {
    this.fragmentMain = code;
    return this;
  }

  public build(): { vertexShader: string; fragmentShader: string } {
    const vertexShader = `
      // Three.js default vertex shader chunks
      #include <common>
      #include <uv_pars_vertex>
      #include <uv2_pars_vertex>
      #include <envmap_pars_vertex>
      #include <color_pars_vertex>
      #include <fog_pars_vertex>
      #include <morphtarget_pars_vertex>
      #include <skinning_pars_vertex>
      #include <logdepthbuf_pars_vertex>
      #include <clipping_planes_pars_vertex>

      // Custom chunks
      ${this.vertexChunks.join('\n')}

      void main() {
        ${this.vertexMain}
      }
    `;

    const fragmentShader = `
      // Three.js default fragment shader chunks
      #include <common>
      #include <uv_pars_fragment>
      #include <uv2_pars_fragment>
      #include <envmap_pars_fragment>
      #include <color_pars_fragment>
      #include <fog_pars_fragment>
      #include <logdepthbuf_pars_fragment>
      #include <clipping_planes_pars_fragment>

      // Custom chunks
      ${this.fragmentChunks.join('\n')}

      void main() {
        ${this.fragmentMain}
      }
    `;

    return { vertexShader, fragmentShader };
  }
}

