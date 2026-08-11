import{$ as P,D as C,F as O,G as T,H as B,I as H,J as M,K as k,M as _,Z as D,_ as I,b as F,c as L,ja as U,r as x,sa as N,u as W,w as G}from"./nova-chunk-BIZ2I2U5.js";var E=new Set,w=null,c=0,A=0,V={elapsed:0};function j(e){c=requestAnimationFrame(j);let o=Math.min((e-A)/1e3,1/30);A=e,V.elapsed+=o;for(let n of E)!n.running||n.paused||!n.visible||n.render(o,V.elapsed)}function S(){c||(A=performance.now(),c=requestAnimationFrame(j))}function y(){![...E].some(o=>o.running&&!o.paused&&o.visible)&&c&&(cancelAnimationFrame(c),c=0)}document.addEventListener("visibilitychange",()=>{document.hidden?c&&(cancelAnimationFrame(c),c=0):S()});function Q(e,o={}){let{alpha:n=!0,antialias:d=!0,maxPixelRatio:r=1.75,exclusive:p=!1,onResize:v,onRender:f,clearColor:s=null}=o,a=new N({canvas:e,alpha:n,antialias:d,powerPreference:"high-performance",stencil:!1,depth:!0});a.setPixelRatio(Math.min(window.devicePixelRatio||1,r)),a.outputColorSpace=x,a.toneMapping=L,a.toneMappingExposure=1.05,s!==null?a.setClearColor(s,1):a.setClearAlpha(0);let h=new _,m=new k(38,1,.1,100);m.position.set(0,0,6);let t={renderer:a,scene:h,camera:m,canvas:e,running:!1,paused:!1,visible:!0,disposed:!1,render(i,l){f==null||f(i,l,t),a.render(h,m)},resize(){let i=e.parentElement||e,l=i.clientWidth||window.innerWidth,u=i.clientHeight||window.innerHeight;!l||!u||(a.setPixelRatio(Math.min(window.devicePixelRatio||1,r)),a.setSize(l,u,!1),m.aspect=l/u,m.updateProjectionMatrix(),v==null||v(l,u,t))},start(){if(!t.disposed){if(t.running=!0,p){w=t;for(let i of E)i!==t&&i.pause()}S()}},stop(){if(t.running=!1,w===t){w=null;for(let i of E)i.resume()}y()},pause(){t.paused=!0,y()},resume(){t.disposed||w&&w!==t||(t.paused=!1,t.running&&S())},dispose(){var i;t.disposed||(t.disposed=!0,t.stop(),E.delete(t),g==null||g.disconnect(),window.removeEventListener("resize",t.resize),e.removeEventListener("webglcontextlost",z),h.traverse(l=>{l.geometry&&l.geometry.dispose();let u=l.material;if(!u)return;let q=Array.isArray(u)?u:[u];for(let R of q){for(let Y of Object.keys(R)){let b=R[Y];b&&b.isTexture&&b.dispose()}R.dispose()}}),h.clear(),a.dispose(),(i=a.forceContextLoss)==null||i.call(a),y())}},g=typeof IntersectionObserver<"u"?new IntersectionObserver(([i])=>{t.visible=i.isIntersecting,t.visible?S():y()},{rootMargin:"120px"}):null;g==null||g.observe(e);function z(i){i.preventDefault(),console.warn("[nova] WebGL context lost \u2014 falling back to the static plate"),t.stop(),e.dispatchEvent(new CustomEvent("nova:webgl:lost",{bubbles:!0}))}return e.addEventListener("webglcontextlost",z),window.addEventListener("resize",t.resize),E.add(t),t.resize(),t}var J=`
  uniform float uTime;
  uniform vec2  uPointer;
  uniform float uAmplitude;
  uniform float uCurve;

  varying vec2  vUv;
  varying vec3  vNormal;
  varying float vWave;

  // Cheap value noise \u2014 enough character for cloth, far cheaper than simplex.
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  void main() {
    vUv = uv;
    vec3 pos = position;

    // Hang the cloth on an invisible form: bend the plane around Y.
    float bend = (uv.x - 0.5);
    pos.z -= bend * bend * uCurve;

    // Fabric motion. Two travelling waves plus noise, damped at the top edge
    // so the garment appears suspended rather than floating free.
    float hang = smoothstep(0.0, 0.55, uv.y);
    float wave =
        sin(uv.x * 6.2 + uTime * 0.72) * 0.045
      + sin(uv.y * 4.4 - uTime * 0.53) * 0.032
      + (noise(uv * 3.4 + uTime * 0.13) - 0.5) * 0.09;

    // Cursor pushes the surface away like air moving across it.
    float pointerPush = (1.0 - distance(uv, uPointer * 0.5 + 0.5)) * 0.16;

    float displacement = (wave + pointerPush) * uAmplitude * hang;
    pos.z += displacement;

    vWave = displacement;

    // Recompute a usable normal from the wave gradient for the lighting term.
    float eps = 0.012;
    float dx = sin((uv.x + eps) * 6.2 + uTime * 0.72) * 0.045 - sin(uv.x * 6.2 + uTime * 0.72) * 0.045;
    float dy = sin((uv.y + eps) * 4.4 - uTime * 0.53) * 0.032 - sin(uv.y * 4.4 - uTime * 0.53) * 0.032;
    vNormal = normalize(vec3(-dx / eps, -dy / eps, 1.0));

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`,K=`
  uniform sampler2D uMap;
  uniform vec3  uLight;
  uniform float uOpacity;
  uniform float uSheen;
  uniform vec3  uTint;

  varying vec2  vUv;
  varying vec3  vNormal;
  varying float vWave;

  void main() {
    vec4 texel = texture2D(uMap, vUv);

    // Drop the plate's transparent surround so the garment floats.
    if (texel.a < 0.02) discard;

    vec3 normal = normalize(vNormal);
    float diffuse = clamp(dot(normal, normalize(uLight)), 0.0, 1.0);

    // Soft studio wrap: never let the shadow side go fully black.
    float light = mix(0.82, 1.16, diffuse);

    // Sheen along the wave crests reads as fabric catching the light.
    float sheen = smoothstep(0.01, 0.07, vWave) * uSheen;

    vec3 colour = texel.rgb * uTint * light + sheen;

    gl_FragColor = vec4(colour, texel.a * uOpacity);
  }
`;function Z(e,o={}){let{width:n=3.1,height:d=3.9,segments:r=72,amplitude:p=1,curve:v=1.15,sheen:f=.05,tint:s=new C(1,1,1)}=o;e.colorSpace=x,e.anisotropy=4,e.needsUpdate=!0;let a=new P(n,d,r,Math.round(r*1.2)),h=new M({vertexShader:J,fragmentShader:K,transparent:!0,side:F,uniforms:{uMap:{value:e},uTime:{value:0},uPointer:{value:new W(0,0)},uAmplitude:{value:p},uCurve:{value:v},uLight:{value:new G(-.45,.7,.9)},uOpacity:{value:1},uSheen:{value:f},uTint:{value:s}}}),m=new H(a,h);return m.name="garment",m}function ee(e=260,o=6){let n=new Float32Array(e*3),d=new Float32Array(e),r=new Float32Array(e);for(let s=0;s<e;s++)n[s*3]=(Math.random()-.5)*o,n[s*3+1]=(Math.random()-.5)*o*1.15,n[s*3+2]=(Math.random()-.5)*o*.5,d[s]=Math.random()*.6+.25,r[s]=Math.random()*Math.PI*2;let p=new B;p.setAttribute("position",new T(n,3)),p.setAttribute("aScale",new T(d,1)),p.setAttribute("aSeed",new T(r,1));let v=new M({transparent:!0,depthWrite:!1,uniforms:{uTime:{value:0},uSize:{value:26},uColor:{value:new C("#0d0d0f")},uOpacity:{value:.24}},vertexShader:`
      attribute float aScale;
      attribute float aSeed;
      uniform float uTime;
      uniform float uSize;
      varying float vFade;

      void main() {
        vec3 pos = position;
        pos.y += sin(uTime * 0.22 + aSeed) * 0.34;
        pos.x += cos(uTime * 0.17 + aSeed * 1.7) * 0.26;

        vec4 mv = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uSize * aScale * (1.0 / -mv.z);

        // Fade motes that drift toward the camera so nothing pops.
        vFade = smoothstep(0.0, 3.0, -mv.z) * (1.0 - smoothstep(9.0, 14.0, -mv.z));
      }
    `,fragmentShader:`
      uniform vec3 uColor;
      uniform float uOpacity;
      varying float vFade;

      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        float alpha = smoothstep(0.5, 0.1, d) * uOpacity * vFade;
        gl_FragColor = vec4(uColor, alpha);
      }
    `}),f=new D(p,v);return f.name="motes",f}function te(){let e=document.createElement("canvas");e.width=e.height=256;let o=e.getContext("2d"),n=o.createRadialGradient(128,128,0,128,128,128);n.addColorStop(0,"rgba(13,13,15,0.34)"),n.addColorStop(.55,"rgba(13,13,15,0.12)"),n.addColorStop(1,"rgba(13,13,15,0)"),o.fillStyle=n,o.fillRect(0,0,256,256);let d=new I(e),r=new H(new P(4.4,1.5),new O({map:d,transparent:!0,depthWrite:!1}));return r.rotation.x=-Math.PI/2.1,r.position.y=-2.1,r.name="shadow",r}function oe(e){return new Promise((o,n)=>{new U().load(e,o,void 0,()=>n(new Error(`Could not load texture: ${e}`)))})}export{Q as a,Z as b,ee as c,te as d,oe as e};
