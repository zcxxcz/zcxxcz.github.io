(function () {
  'use strict';
  const T = THREE;
  const quadVertex = `
    varying vec2 vUv;
    void main() {
      vUv = position.xy * 0.5 + 0.5;
      gl_Position = vec4(position.xy, 0., 1.);
    }`;
  const lightPass = `
    varying vec2 vUv;
    uniform sampler2D picture, zBuffer;
    uniform vec2 pixel, lens;
    uniform float nearZ, farZ;
    float distanceAt(vec2 uv) {
      float z = texture2D(zBuffer, uv).r;
      return nearZ * farZ / (farZ - z * (farZ-nearZ));
    }
    vec3 eyePosition(vec2 uv, float z) { return vec3((uv*2.-1.)*lens*z, -z); }
    vec3 bright(vec2 uv) {
      vec3 c = texture2D(picture, uv).rgb;
      float y = dot(c, vec3(.2126,.7152,.0722));
      return c * smoothstep(.76, 1.8, y);
    }
    void main() {
      float z = distanceAt(vUv), occlusion = 0.;
      vec3 p = eyePosition(vUv,z);
      vec2 dx = vec2(pixel.x,0.), dy = vec2(0.,pixel.y);
      vec3 xp = eyePosition(vUv+dx,distanceAt(vUv+dx))-p;
      vec3 xm = p-eyePosition(vUv-dx,distanceAt(vUv-dx));
      vec3 yp = eyePosition(vUv+dy,distanceAt(vUv+dy))-p;
      vec3 ym = p-eyePosition(vUv-dy,distanceAt(vUv-dy));
      vec3 normal = normalize(cross(abs(xp.z)<abs(xm.z)?xp:xm, abs(yp.z)<abs(ym.z)?yp:ym) + vec3(0.,0.,.000001));
      vec3 bloom = bright(vUv) * 2.;
      for (int i=0; i<8; ++i) {
        float angle = float(i)*2.39996323;
        vec2 dir = vec2(cos(angle),sin(angle));
        float r = .20 + .73 * (float(i)+.5) / 8.;
        vec2 uv = clamp(vUv + dir*r/(max(z,.3)*2.*lens), pixel, 1.-pixel);
        vec3 delta = eyePosition(uv,distanceAt(uv))-p;
        float d = length(delta);
        occlusion += max(dot(normal,delta) / max(.035,d) - .12, 0.) * (1.-smoothstep(.04,1.4,d));
        bloom += bright(vUv+dir*pixel*(3.+float(i)*1.5));
      }
      gl_FragColor = vec4(bloom / 10., 1.-.62*occlusion/8.*(1.-smoothstep(45.,100.,z)));
    }`;
  const finishPass = `
    varying vec2 vUv;
    uniform sampler2D picture, lighting, zBuffer;
    uniform float nearZ, farZ, grainFrame;
    uniform vec2 pixel;
    float luma(vec3 c) { return dot(c,vec3(.299,.587,.114)); }
    void main() {
      vec4 light = texture2D(lighting, vUv);
      vec3 color = texture2D(picture, vUv).rgb;
      vec3 nw = texture2D(picture,vUv-pixel).rgb, se = texture2D(picture,vUv+pixel).rgb;
      vec3 ne = texture2D(picture,vUv+vec2(pixel.x,-pixel.y)).rgb, sw = texture2D(picture,vUv+vec2(-pixel.x,pixel.y)).rgb;
      vec2 edge = vec2(luma(sw+se)-luma(nw+ne),luma(nw+sw)-luma(ne+se));
      edge = clamp(edge/(min(abs(edge.x),abs(edge.y))+.05),-3.,3.)*pixel;
      vec3 smoothed = (texture2D(picture,vUv-edge*.30).rgb+texture2D(picture,vUv+edge*.30).rgb)*.5;
      color = mix(color,smoothed,.65);
      float depth = texture2D(zBuffer,vUv).r;
      float z = nearZ*farZ / (farZ-depth*(farZ-nearZ));
      float focus = .19 * smoothstep(72.,235.,z);
      vec3 blur = (nw+se+ne+sw)*.25;
      color = mix(color,blur,focus) * light.a + light.rgb * .065;
      vec2 corner = vUv*2.-1.;
      color *= 1. - .075 * smoothstep(.26,1.67,dot(corner,corner));
      gl_FragColor = vec4(color,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      float noise = fract(52.9829189 * fract(dot(gl_FragCoord.xy + grainFrame, vec2(.06711056,.00583715))));
      gl_FragColor.rgb += (noise-.5)*.008;
    }`;

  window.Harbor.film = function (renderer, scene, camera) {
    if (!renderer.capabilities.isWebGL2 && !renderer.extensions.has('WEBGL_depth_texture')) {
      return { resize() {}, render() { renderer.render(scene, camera); } };
    }
    const hdr = renderer.capabilities.isWebGL2 && renderer.extensions.has('EXT_color_buffer_float');
    const frame = new T.WebGLRenderTarget(1,1,{ type: hdr ? T.HalfFloatType : T.UnsignedByteType });
    frame.depthTexture = new T.DepthTexture(1,1,T.UnsignedIntType);
    const light = new T.WebGLRenderTarget(1,1,{ depthBuffer: false, type: frame.texture.type });
    const projection = new T.Camera();
    const screen = new T.Scene();
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.Float32BufferAttribute([-1,-1,0, 3,-1,0, -1,3,0],3));
    const uniforms = {
      picture:{value:frame.texture}, zBuffer:{value:frame.depthTexture}, lighting:{value:null},
      pixel:{value:new T.Vector2()}, lens:{value:new T.Vector2()},
      nearZ:{value:camera.near}, farZ:{value:camera.far}, grainFrame:{value:0}
    };
    function pass(fragmentShader) {
      return new T.ShaderMaterial({ vertexShader:quadVertex, fragmentShader, uniforms, depthTest:false, depthWrite:false });
    }
    const half = pass(lightPass), final = pass(finishPass);
    const quad = new T.Mesh(geometry,half);
    quad.frustumCulled = false;
    screen.add(quad);
    const bufferSize = new T.Vector2();
    return {
      resize() {
        renderer.getDrawingBufferSize(bufferSize);
        frame.setSize(bufferSize.x,bufferSize.y);
        light.setSize(Math.max(1,Math.ceil(bufferSize.x / 2)), Math.max(1,Math.ceil(bufferSize.y / 2)));
        uniforms.pixel.value.set(1/bufferSize.x,1/bufferSize.y);
      },
      render(time) {
        renderer.setRenderTarget(frame);
        renderer.render(scene,camera);
        uniforms.lens.value.set(1/camera.projectionMatrix.elements[0],1/camera.projectionMatrix.elements[5]);
        uniforms.grainFrame.value = Math.floor(time*12)%91;
        uniforms.lighting.value = null;
        quad.material = half;
        renderer.setRenderTarget(light);
        renderer.render(screen,projection);
        quad.material = final;
        uniforms.lighting.value = light.texture;
        renderer.setRenderTarget(null);
        renderer.render(screen,projection);
      }
    };
  };
})();
