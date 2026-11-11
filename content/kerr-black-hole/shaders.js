import { geodesicGLSL } from './physics.js';
export const vertex = `#version 300 es
void main(){ vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(p*2.-1.,0.,1.); }
`;
export const trace = `#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform vec2 uPolar, uOrbit;
uniform float uSpin, uZoom, uInner, uStep;
uniform int uBudget;
uniform bool uDisk;
layout(location=0) out vec4 hit;
layout(location=1) out vec4 meta;
${geodesicGLSL}
void main(){
  float a=uSpin, r=80., m=uPolar.y, sn=uPolar.x;
  vec2 xy=(2.*gl_FragCoord.xy-uResolution)/uResolution.y*12.5/uZoom;
  vec3 n=normalize(vec3(xy,r));
  float S=r*r+a*a*m*m, D=r*r-2.*r+a*a;
  float A=(r*r+a*a)*(r*r+a*a)-a*a*D*sn*sn;
  float lapse=sqrt(S*D/A), pPhi=-sqrt(A/S)*sn*n.x;
  float energy=lapse+2.*a*r/A*pPhi, l=pPhi/energy, pTheta=sqrt(S)*n.y/energy;
  float q=pTheta*pTheta+m*m*(l*l/(sn*sn)-a*a);
  float B=a*a-q-l*l, C=q+(l-a)*(l-a), u=1./r;
  vec4 z=vec4(u,m,sqrt(max(0.,1.+B*u*u+2.*C*u*u*u-a*a*q*u*u*u*u)),sn*pTheta);
  float ca=uOrbit.x,sa=uOrbit.y;
  vec3 angular=vec3(sn*ca,m,sn*sa);
  vec3 velocity=vec3(-m*pTheta*ca+l/sn*sa,z.w,-m*pTheta*sa-l/sn*ca);
  vec2 pt=vec2(0.);
  float horizon=1.+sqrt(1.-a*a), kind=0., error=0.;
  hit=vec4(0.);
  for(int i=0;i<2560;i++){
    if(i>=uBudget) break;
    vec4 old=z; vec2 oldPT=pt;vec3 oldN=angular,oldV=velocity;
    float h=min(uStep,0.3/(abs(rates(z,a,l).x)+1.));
    // Bound frequency and radial advance; no Euclidean deflection approximation.
    h=min(h,0.14/sqrt(1.+abs(B)+6.*abs(C*z.x)));
    if(z.z>0.)h=min(h,0.25*z.x/max(z.z,.0001));
    stepRay(z,pt,angular,velocity,h,a,l,q);
    if(any(isnan(z)) || any(isinf(z))) break;
    error=max(error,max(residual(z,a,l,q),abs(dot(angular,angular)-1.)));
    if(uDisk && old.y*z.y<0.){
      // Bisect the RK4 segment, rather than linearly interpolating r at the disk.
      float lo=0.,hi=h; vec4 crossing=old;vec2 cp=oldPT;vec3 cn=oldN,cv=oldV;
      for(int j=0;j<7;j++){
        float mid=0.5*(lo+hi);crossing=old;cp=oldPT;cn=oldN;cv=oldV;
        stepRay(crossing,cp,cn,cv,mid,a,l,q);
        if(old.y*crossing.y>0.)lo=mid;else hi=mid;
      }
      float rr=1./crossing.x;
      if(rr>=uInner && rr<=20.){
        float omega=1./(pow(rr,1.5)+a);
        float invUt=sqrt(max(0.,1.-3./rr+2.*a/pow(rr,1.5)))/(1.+a/pow(rr,1.5));
        float g=invUt/((1.-omega*l)*energy);
        hit=vec4(rr,atan(cn.z,cn.x)+cp.x,cp.y,g);kind=1.;break;
      }
    }
    if(z.x>=1./(horizon+0.0005)){kind=2.;break;}
    if(z.x<=0. && z.z<0.){
      // u=0 is null infinity. Polynomial u and mu remain regular here.
      float lo=0.,hi=h;
      for(int j=0;j<10;j++){
        float mid=.5*(lo+hi);vec4 end=old;vec2 ep=oldPT;vec3 en=oldN,ev=oldV;
        stepRay(end,ep,en,ev,mid,a,l,q);
        if(end.x>0.)lo=mid;else hi=mid;
      }
      z=old;pt=oldPT;angular=oldN;velocity=oldV;
      stepRay(z,pt,angular,velocity,.5*(lo+hi),a,l,q);
      kind=3.;break;
    }
  }
  meta=vec4(clamp(z.y,-1.,1.),atan(angular.z,angular.x)+pt.x,kind,error);
}
`;

export const render = `#version 300 es
precision highp float;
uniform sampler2D uHits, uMeta;
uniform vec2 uResolution, uRayResolution;
uniform float uTime, uSpin, uInner, uExposure;
uniform int uMode;
uniform bool uDoppler, uGravity, uStars;
out vec4 color;
const float PI=3.141592653589793;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);}
float turbulence(vec2 p){return .55*noise(p)+.27*noise(p*2.07)+.13*noise(p*4.13)+.05*noise(p*8.31);}
vec3 thermal(float t){
  // Planck radiance at representative visible wavelengths, linear RGB display mapping.
  vec3 wave=vec3(0.700,0.546,0.435);
  return 0.02/(pow(wave,vec3(5.))*(exp(14387.77/(wave*max(t,600.)))-1.));
}
vec3 sky(vec2 angular){
  float mu=angular.x,phi=angular.y;
  vec3 dir=vec3(sqrt(max(0.,1.-mu*mu))*cos(phi),mu,sqrt(max(0.,1.-mu*mu))*sin(phi));
  if(uMode==2){
    vec2 grid=vec2(phi/(2.*PI)*18.,acos(clamp(mu,-1.,1.))/PI*10.);
    vec2 w=clamp(fwidth(grid),vec2(0.012),vec2(0.12));
    vec2 lines=1.-smoothstep(w,2.*w,abs(fract(grid+.5)-.5));
    return mix(vec3(.003,.006,.009),vec3(.045,.16,.19),max(lines.x,lines.y)*.7);
  }
  if(!uStars)return vec3(0.);
  // Procedural celestial sphere, sampled only at the geodesic's escaped direction.
  vec2 uv=vec2(atan(dir.z,dir.x)/(2.*PI)+.5,acos(clamp(dir.y,-1.,1.))/PI);
  vec2 p=uv*vec2(780.,390.),cell=floor(p),f=fract(p)-.5;
  float seed=hash(cell),star=step(.988,seed)*exp(-dot(f,f)*170.);
  vec3 tint=mix(vec3(.6,.72,1.),vec3(1.,.79,.54),hash(cell+13.));
  float band=pow(max(0.,1.-abs(dot(dir,normalize(vec3(.25,.86,.4))))),16.);
  return tint*star*(.18+hash(cell+4.)*.6)+vec3(.021,.025,.039)*band*(.3+.7*noise(uv*28.));
}
vec3 pixel(ivec2 p){
  p=clamp(p,ivec2(0),ivec2(uRayResolution)-1);
  vec4 hit=texelFetch(uHits,p,0),meta=texelFetch(uMeta,p,0);
  if(uMode==3){
    if(meta.z<.5)return vec3(.8,.06,.5);
    float e=clamp((log(max(meta.w,1e-9))/log(10.)+7.)/5.,0.,1.);
    return mix(vec3(.04,.26,.25),vec3(1.,.2,.08),e);
  }
  if(meta.z>2.5)return sky(meta.xy);
  if(meta.z<.5)return vec3(.018,.008,.025); // exhausted budget is visible, never a fake sky
  if(meta.z>1.5)return vec3(0.);
  float r=hit.x,phi=hit.y,g=hit.w,omega=1./(pow(r,1.5)+uSpin);
  float lapse=sqrt(max(.0001,(r*r-2.*r+uSpin*uSpin)/(r*r+uSpin*uSpin+2.*uSpin*uSpin/r)));
  // ZAMO lapse isolates gravitational shift; remainder contains motion/frame dragging.
  float obsLapse=sqrt(1.-2./80.);
  float grav=lapse/obsLapse;
  if(!uGravity)g/=grav;
  if(!uDoppler)g= uGravity ? grav : 1.;
  if(uMode==1){
    vec3 red=vec3(.96,.24,.13),neutral=vec3(.86,.83,.69),blue=vec3(.22,.60,1.);
    return g<1. ? mix(neutral,red,clamp((1.-g)*1.7,0.,1.)) : mix(neutral,blue,clamp((g-1.)*1.8,0.,1.));
  }
  float phase=phi-omega*(uTime*9.-hit.z);
  vec2 diskPoint=vec2(cos(phase),sin(phase))*r;
  float textureValue=turbulence(diskPoint*1.1+vec2(r*.7,r*1.9));
  float filaments=.84+.16*sin(r*10.+textureValue*9.+2.*sin(phase*5.+r));
  float edge=max(0.,1.-sqrt(uInner/r));
  float emissivity=pow(uInner/r,3.)*edge;
  float temperature=15000.*pow(max(emissivity,0.),.25);
  vec3 spectrum=thermal(temperature*g);
  // I_nu/nu^3 invariant: B_nu(g*T) = g^3 B_(nu/g)(T).
  // Bolometric brightness thus scales as g^4; no separate, double-counted boost.
  float brightness=55.*(.52+.9*textureValue)*filaments;
  float taper=1.-smoothstep(17.,20.,r);
  return spectrum*brightness*taper;
}
void main(){
  vec3 c=pixel(ivec2(gl_FragCoord.xy));
  if(uMode==0 || uMode==2){c=vec3(1.)-exp(-c*uExposure);}
  c=pow(max(c,vec3(0.)),vec3(1./2.2));
  color=vec4(c,1.);
}
`;
export const display = `#version 300 es
precision highp float;
uniform sampler2D uImage;
uniform vec2 uResolution;
out vec4 color;
void main(){color=texture(uImage,gl_FragCoord.xy/uResolution);}
`;
