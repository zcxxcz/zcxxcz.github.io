// G = c = M = 1. Past-directed Mino parameter s = -tau.
// u = 1/r, m = cos(theta); state = (u, m, du/ds, dm/ds).
// The polynomial form crosses radial/polar turning points without sign hacks.
// Gralla & Lupsasca (2020), https://arxiv.org/abs/1910.12881, eqs. 6–9.
export const OBSERVER = 80;
export function isco(a) {
  const z1 = 1 + Math.cbrt(1 - a * a) * (Math.cbrt(1 + a) + Math.cbrt(1 - a));
  const z2 = Math.sqrt(3 * a * a + z1 * z1);
  return 3 + z2 - Math.sign(a) * Math.sqrt((3 - z1) * (3 + z1 + 2 * z2));
}
export function cameraRay(x, y, a, inclination) {
  const r = OBSERVER, m = Math.cos(inclination), sn = Math.sin(inclination);
  const sigma = r * r + a * a * m * m, delta = r * r - 2 * r + a * a;
  const A = (r * r + a * a) ** 2 - a * a * delta * sn * sn;
  const lapse = Math.sqrt(sigma * delta / A), omega = 2 * a * r / A;
  const n = Math.hypot(x, y, r), pPhi = -Math.sqrt(A / sigma) * sn * x / n;
  const energy = lapse + omega * pPhi;
  const l = pPhi / energy, pTheta = Math.sqrt(sigma) * y / n / energy;
  const q = pTheta * pTheta + m * m * (l * l / (sn * sn) - a * a);
  const u = 1 / r, B = a * a - q - l * l, C = q + (l - a) ** 2;
  const U = 1 + B * u * u + 2 * C * u ** 3 - a * a * q * u ** 4;
  return { state: [u, m, Math.sqrt(U), sn * pTheta], l, q, energy };
}
export function derivative(z, a, l, q) {
  const [u, m, v, w] = z, B = a * a - q - l * l, C = q + (l - a) ** 2;
  return [v, w, B * u + 3 * C * u * u - 2 * a * a * q * u ** 3,
    B * m - 2 * a * a * m ** 3];
}
export function rk4(z, h, a, l, q) {
  const add = (v, k, t) => v.map((x, i) => x + k[i] * t);
  const k1 = derivative(z, a, l, q);
  const k2 = derivative(add(z, k1, h / 2), a, l, q);
  const k3 = derivative(add(z, k2, h / 2), a, l, q);
  const k4 = derivative(add(z, k3, h), a, l, q);
  return z.map((x, i) => x + h * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]) / 6);
}
export function constraintError(z, a, l, q) {
  const [u, m, v, w] = z, B = a * a - q - l * l, C = q + (l - a) ** 2;
  const U = 1 + B * u * u + 2 * C * u ** 3 - a * a * q * u ** 4;
  const V = q + B * m * m - a * a * m ** 4;
  return Math.max(Math.abs(v * v - U) / (1 + Math.abs(U)),
    Math.abs(w * w - V) / (1 + Math.abs(q) + l * l));
}
export function redshift(r, a, l, energy = 1) {
  const omega = 1 / (r ** 1.5 + a);
  const invUt = Math.sqrt(1 - 3 / r + 2 * a / r ** 1.5) / (1 + a / r ** 1.5);
  return invUt / ((1 - omega * l) * energy);
}
export function traceRay({ a = 0, l, q, state, h = 0.003, maxSteps = 4096 }) {
  let z = [...state], maxError = 0;
  const horizon = 1 / (1 + Math.sqrt(1 - a * a));
  for (let i = 0; i < maxSteps; i++) {
    z = rk4(z, h, a, l, q);
    maxError = Math.max(maxError, constraintError(z, a, l, q));
    if (z[0] >= horizon) return { kind: 'captured', steps: i + 1, z, maxError };
    if (z[0] <= 0 && z[2] < 0) return { kind: 'escaped', steps: i + 1, z, maxError };
  }
  return { kind: 'unresolved', z, maxError };
}

// Shared polynomial equations: GPU and double-precision validation use the same variables.
export const geodesicGLSL = `
vec4 flow(vec4 z, float a, float l, float q) {
  float B = a*a-q-l*l, C = q+(l-a)*(l-a);
  return vec4(z.zw, B*z.x+3.*C*z.x*z.x-2.*a*a*q*z.x*z.x*z.x,
    B*z.y-2.*a*a*z.y*z.y*z.y);
}
vec2 rates(vec4 z, float a, float l) {
  float u=z.x;
  float r = 1./max(u, 0.00001), D = max(r*r-2.*r+a*a, 0.00001);
  float P = r*r+a*a-a*l, sn2 = max(1.-z.y*z.y, 0.0000001);
  // Past-directed phi, and positive elapsed coordinate time (lookback).
  return vec2(-a*(2.*u-a*l*u*u)/max(1.-2.*u+a*a*u*u,0.000001),
    (r*r+a*a)*P/D+a*(l-a*sn2));
}
vec3 angularAcceleration(vec3 n, float a, float l, float q) {
  // Smooth unit-sphere form of separated polar motion. psi'=-lambda/(1-mu^2).
  // n''=-(eta+lambda^2+2a^2*mu^2)n + a^2*mu*e_y.
  // This integrates longitude through the poles without dividing by sin(theta).
  return -(q+l*l+2.*a*a*n.y*n.y)*n+vec3(0.,a*a*n.y,0.);
}
void stepRay(inout vec4 z, inout vec2 pt, inout vec3 n, inout vec3 v, float h, float a, float l, float q) {
  vec4 k1=flow(z,a,l,q), s2=z+0.5*h*k1;
  vec4 k2=flow(s2,a,l,q), s3=z+0.5*h*k2;
  vec4 k3=flow(s3,a,l,q), s4=z+h*k3;
  vec4 k4=flow(s4,a,l,q);
  vec3 n1=v, v1=angularAcceleration(n,a,l,q);
  vec3 n2=v+0.5*h*v1, v2=angularAcceleration(n+0.5*h*n1,a,l,q);
  vec3 n3=v+0.5*h*v2, v3=angularAcceleration(n+0.5*h*n2,a,l,q);
  vec3 n4=v+h*v3, v4=angularAcceleration(n+h*n3,a,l,q);
  pt += h/6.*(rates(z,a,l)+2.*rates(s2,a,l)+2.*rates(s3,a,l)+rates(s4,a,l));
  z += h/6.*(k1+2.*k2+2.*k3+k4);
  n += h/6.*(n1+2.*n2+2.*n3+n4);
  v += h/6.*(v1+2.*v2+2.*v3+v4);
  z.y=n.y;z.w=v.y;
}
float residual(vec4 z, float a, float l, float q) {
  float B=a*a-q-l*l, C=q+(l-a)*(l-a), u=z.x, m=z.y;
  float U=1.+B*u*u+2.*C*u*u*u-a*a*q*u*u*u*u;
  float V=q+B*m*m-a*a*m*m*m*m;
  return max(abs(z.z*z.z-U)/(1.+abs(U)), abs(z.w*z.w-V)/(1.+abs(q)+l*l));
}
`;
