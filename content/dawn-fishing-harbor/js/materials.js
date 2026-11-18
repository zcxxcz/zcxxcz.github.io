(function () {
  'use strict';
  const H = window.Harbor = window.Harbor || {};
  const T = THREE;

  function randomStream(seed) {
    return function () {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }

  function textureFor(kind, renderer) {
    const size = 256;
    const seed = Array.from(kind).reduce((n, c) => n * 13 + c.charCodeAt(0), 73);
    const random = randomStream(seed);
    const tile = new Float32Array(256 * 256);
    for (let i = 0; i < tile.length; i++) tile[i] = random();

    function noise(u, v, nx, ny) {
      const x = u * nx, y = v * ny;
      const ix = Math.floor(x), iy = Math.floor(y);
      const sx = x - ix, sy = y - iy;
      const tx = sx * sx * (3 - 2 * sx), ty = sy * sy * (3 - 2 * sy);
      function value(a, b) {
        return tile[((b % ny + ny) % ny) * 256 + ((a % nx + nx) % nx)];
      }
      return (value(ix, iy) * (1 - tx) + value(ix + 1, iy) * tx) * (1 - ty)
        + (value(ix, iy + 1) * (1 - tx) + value(ix + 1, iy + 1) * tx) * ty;
    }

    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const context = canvas.getContext('2d');
    const pixels = context.createImageData(size, size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = x / size, v = y / size;
        const cloud = noise(u, v, 5, 7), mid = noise(u, v, 17, 19);
        const grit = random() - 0.5;
        let value, weathering = 0;
        if (kind === 'wood') {
          // Lateral deflection in the fibres wraps the grain around two knots.
          let deflection = 0, heart = 0;
          for (const [cx,cy] of [[.29,.68],[.81,.27]]) {
            const dx = u-cx-Math.round(u-cx), dy = v-cy-Math.round(v-cy);
            const knot = Math.exp(-dx*dx*165 - dy*dy*72);
            deflection += .085*knot*(dy < 0 ? -1 : 1);
            heart += Math.exp(-dx*dx*2400-dy*dy*900);
          }
          const warp = v + deflection + 0.027 * (cloud - 0.5) + 0.011 * Math.sin(6.283 * u);
          const grain = noise(u, warp, 6, 118);
          const growth = Math.pow(0.5 + 0.5 * Math.sin(warp * 6.283 * 16 + noise(u,warp,4,11) * 4), 8);
          weathering = Math.min(1, Math.max(0,(noise(u,v,6,22)-.37)*2.1));
          value = 201 + 21 * noise(u, warp, 3, 30) + 27 * grain - 26 * growth + 16 * weathering - 57 * heart + 8 * grit;
        } else if (kind === 'metal' || kind === 'roof') {
          const flake = Math.max(0, (1 - mid) * 0.75 + (1 - cloud) * 0.25 - 0.67);
          value = 232 + 15 * cloud + 8 * mid - 110 * flake + 5 * grit;
          if (kind === 'roof') value -= 10 * Math.pow(0.5 + 0.5 * Math.cos(6.283 * u * 17), 6);
        } else if (kind === 'sand') {
          value = 220 + cloud * 20 + mid * 12 + grit * 24;
        } else {
          const pits = grit < -0.47 ? 16 : 0;
          value = 213 + cloud * 24 + mid * 18 + grit * (kind === 'stone' ? 20 : 12) - pits;
        }
        const i = (x + y * size) * 4;
        pixels.data[i] = value;
        pixels.data[i + 1] = value - 1;
        pixels.data[i + 2] = value - 2.2 + weathering * 6;
        pixels.data[i + 3] = 255;
      }
    }
    context.putImageData(pixels, 0, 0);
    const texture = new T.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = T.RepeatWrapping;
    texture.colorSpace = T.SRGBColorSpace;
    texture.userData.harborGrain = true;
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    return texture;
  }

  // Batch in the root's coordinate system, so each boat can move as one object.
  function batch(root) {
    root.updateWorldMatrix(true, true);
    const inverse = root.matrixWorld.clone().invert();
    const bins = new Map();
    const merged = [];
    const point = new T.Vector3(), normal = new T.Vector3();
    root.traverse(mesh => {
      if (!mesh.isMesh || mesh.isInstancedMesh || mesh.isSkinnedMesh || mesh === root) return;
      const geo = mesh.geometry;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      if (mats.some(m => !m || m.transparent || m.isShaderMaterial)) return;
      if (!geo.attributes.position || geo.morphAttributes.position) return;
      const matrix = new T.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld);
      const normals = new T.Matrix3().getNormalMatrix(matrix);
      const reversed = matrix.determinant() < 0;
      const { position, uv, color } = geo.attributes;
      const n = geo.attributes.normal;
      const available = geo.index ? geo.index.count : position.count;
      const ranges = Array.isArray(mesh.material) ? geo.groups : [{ start: 0, count: available, materialIndex: 0 }];
      for (const range of ranges) {
        const material = mats[range.materialIndex];
        if (!material) continue;
        const key = [material.id, mesh.castShadow, mesh.receiveShadow, mesh.renderOrder, mesh.layers.mask].join('/');
        if (!bins.has(key)) bins.set(key, {
          material, cast: mesh.castShadow, receive: mesh.receiveShadow, order: mesh.renderOrder,
          layers: mesh.layers.mask, pos: [], norm: [], uv: [], color: [], indices: []
        });
        const bin = bins.get(key);
        const offsetU = material.map?.userData.harborGrain ? matrix.elements[12]*.235 + matrix.elements[13]*.47 : 0;
        const offsetV = material.map?.userData.harborGrain ? matrix.elements[14]*.317 + matrix.elements[12]*.797 : 0;
        const remap = new Map();
        const start = Math.max(range.start, geo.drawRange.start);
        const end = Math.min(available, range.start + range.count, geo.drawRange.start + geo.drawRange.count);
        for (let i = start; i < end; i++) {
          const slot = reversed ? i + [0, 1, -1][(i - start) % 3] : i;
          const source = geo.index ? geo.index.getX(slot) : slot;
          let dest = remap.get(source);
          if (dest === undefined) {
            dest = bin.pos.length / 3;
            remap.set(source, dest);
            point.fromBufferAttribute(position, source).applyMatrix4(matrix);
            if (n) normal.fromBufferAttribute(n, source).applyNormalMatrix(normals);
            else normal.set(0, 1, 0);
            bin.pos.push(point.x, point.y, point.z);
            bin.norm.push(normal.x, normal.y, normal.z);
            bin.uv.push((uv ? uv.getX(source) : 0) + offsetU, (uv ? uv.getY(source) : 0) + offsetV);
            if (material.vertexColors) bin.color.push(color ? color.getX(source) : 1, color ? color.getY(source) : 1, color ? color.getZ(source) : 1);
          }
          bin.indices.push(dest);
        }
      }
      merged.push(mesh);
    });
    for (const mesh of merged) {
      const parent = mesh.parent;
      for (const child of [...mesh.children]) parent.attach(child);
      parent.remove(mesh);
    }
    for (const bin of bins.values()) {
      const geo = new T.BufferGeometry();
      geo.setIndex(bin.indices);
      geo.setAttribute('position', new T.Float32BufferAttribute(bin.pos, 3));
      geo.setAttribute('normal', new T.Float32BufferAttribute(bin.norm, 3));
      geo.setAttribute('uv', new T.Float32BufferAttribute(bin.uv, 2));
      if (bin.color.length) geo.setAttribute('color', new T.Float32BufferAttribute(bin.color, 3));
      geo.computeBoundingSphere();
      const mesh = new T.Mesh(geo, bin.material);
      mesh.castShadow = bin.cast;
      mesh.receiveShadow = bin.receive;
      mesh.renderOrder = bin.order;
      mesh.layers.mask = bin.layers;
      root.add(mesh);
    }
    return root;
  }

  // Sky and sea irradiance for rough metals, glass and salt-polished timber.
  // Three prefilters this small local panorama once, including the bright eastern horizon.
  H.makeEnvironment = function () {
    const w = 128, h = 64, data = new Uint16Array(w*h*4);
    const sun = new T.Vector3(.94,.109,-.32).normalize();
    const half = T.DataUtils.toHalfFloat;
    for (let j=0; j<h; j++) for (let i=0; i<w; i++) {
      const phi = ((i+.5)/w-.5)*2*Math.PI, theta = ((j+.5)/h-.5)*Math.PI;
      const x = Math.cos(phi)*Math.cos(theta), y = Math.sin(theta), z = Math.sin(phi)*Math.cos(theta);
      const up = Math.max(0,y), below = Math.max(0,-y);
      const disk = Math.max(0,x*sun.x+y*sun.y+z*sun.z);
      const warm = Math.pow(disk,14)*.56 + Math.pow(disk,480)*6;
      const k = (i+j*w)*4;
      data[k] = half(Math.max(.07,.67-.38*up-.52*below + warm));
      data[k+1] = half(Math.max(.09,.76-.16*up-.53*below + warm*.69));
      data[k+2] = half(Math.max(.12,.83+.05*up-.54*below + warm*.39));
      data[k+3] = half(1);
    }
    const map = new T.DataTexture(data,w,h,T.RGBAFormat,T.HalfFloatType);
    map.mapping = T.EquirectangularReflectionMapping;
    map.needsUpdate = true;
    return map;
  };

  H.makeResources = function (renderer) {
    const textures = new Map(), materials = new Map();
    function mat(kind, color, options = {}) {
      const key = kind + color + JSON.stringify(options);
      if (!materials.has(key)) {
        const textured = kind !== 'plain';
        if (textured && !textures.has(kind)) textures.set(kind, textureFor(kind, renderer));
        const map = textures.get(kind) || null;
        materials.set(key, new T.MeshStandardMaterial({
          color, map, bumpMap: map, bumpScale: kind === 'stone' ? 0.048 : kind === 'wood' ? 0.019 : 0.012,
          metalness: kind === 'metal' ? 0.24 : 0.015,
          envMapIntensity: kind === 'metal' || options.roughness < .4 ? .68 : .31,
          roughness: kind === 'metal' ? 0.57 : 0.84, ...options
        }));
      }
      return materials.get(key);
    }
    return { mat, batch, rng: randomStream(821391) };
  };
})();
