(function () {
  'use strict';
  const H = window.Harbor;

  H.navigate = function (camera, canvas) {
    const held = new Set();
    const walking = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
    const eyeHeight = 1.75 + 1.6;
    const clamp = THREE.MathUtils.clamp;
    let yaw = (innerWidth / innerHeight < 0.95 ? 21 : 39) * Math.PI / 180;
    let pitch = 0.037, targetYaw = yaw, targetPitch = pitch;
    let targetFov = camera.fov;
    let activePointer = null, prevX = 0, prevY = 0;
    let lastAction = performance.now(), drift = 0;
    const velocity = new THREE.Vector2();
    camera.position.set(0, eyeHeight, 0);
    camera.rotation.order = 'YXZ';
    function act() {
      lastAction = performance.now();
      drift = 0;
    }
    canvas.addEventListener('pointerdown', e => {
      if (activePointer !== null || (e.pointerType === 'mouse' && e.button !== 0)) return;
      act();
      activePointer = e.pointerId;
      prevX = e.clientX;
      prevY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
      canvas.focus({ preventScroll: true });
    });
    canvas.addEventListener('pointermove', e => {
      if (e.pointerId !== activePointer) return;
      const scale = THREE.MathUtils.degToRad(camera.fov) * 1.04 / Math.max(220, canvas.clientHeight);
      targetYaw -= (e.clientX - prevX) * scale;
      targetPitch = clamp(targetPitch + (e.clientY - prevY) * scale, -1.12, 1.19);
      prevX = e.clientX;
      prevY = e.clientY;
      act();
    });
    function release(e) {
      if (e.pointerId === activePointer) { activePointer = null; act(); }
    }
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('lostpointercapture', release);
    canvas.addEventListener('pointercancel', release);
    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      const units = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? canvas.clientHeight : 1;
      targetFov = clamp(targetFov * Math.exp(clamp(e.deltaY * units * 0.0011, -0.8, 0.8)), 33, 77);
      act();
    }, { passive: false });
    window.addEventListener('keydown', e => {
      if (e.metaKey || e.ctrlKey || e.altKey || !walking.has(e.code)) return;
      e.preventDefault();
      held.add(e.code);
      act();
    });
    window.addEventListener('keyup', e => {
      if (held.delete(e.code)) { e.preventDefault(); act(); }
    });
    window.addEventListener('blur', () => {
      held.clear(); activePointer = null; velocity.set(0, 0); act();
    });
    document.addEventListener('visibilitychange', act);

    function walkable(x, z) {
      return (x >= -20.35 && x <= 5.65 && Math.abs(z) <= 1.52)
        || (x >= -23.2 && x <= -19 && Math.abs(z) <= 5.4);
    }
    function tick(time, dt) {
      const ease = 1 - Math.exp(-dt * 18);
      if (activePointer === null && !held.size && performance.now() - lastAction > 6500) {
        drift += (1 - drift) * (1 - Math.exp(-dt * 1.1));
        targetYaw += 0.036 * drift * dt;
      }
      yaw += (targetYaw - yaw) * ease;
      pitch += (targetPitch - pitch) * ease;
      camera.rotation.set(pitch, -yaw, 0, 'YXZ');
      if (Math.abs(targetFov - camera.fov) > 0.015) {
        camera.fov += (targetFov - camera.fov) * ease;
        camera.updateProjectionMatrix();
      }
      const down = (...keys) => keys.some(k => held.has(k)) ? 1 : 0;
      const front = down('KeyW', 'ArrowUp') - down('KeyS', 'ArrowDown');
      const side = down('KeyD', 'ArrowRight') - down('KeyA', 'ArrowLeft');
      const speed = 2.15 / Math.max(1, Math.hypot(front, side));
      velocity.x += ((Math.sin(yaw) * front + Math.cos(yaw) * side) * speed - velocity.x) * ease;
      velocity.y += ((-Math.cos(yaw) * front + Math.sin(yaw) * side) * speed - velocity.y) * ease;
      const p = camera.position;
      const x = p.x + velocity.x * dt, z = p.z + velocity.y * dt;
      if (walkable(x, p.z)) p.x = x;
      if (walkable(p.x, z)) p.z = z;
      camera.updateMatrixWorld();
    }
    tick(0, 0);
    return tick;
  };
})();
