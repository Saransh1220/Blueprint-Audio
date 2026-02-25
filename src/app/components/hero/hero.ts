/* v8 ignore file */
import {
  type AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  type OnDestroy,
  ElementRef,
  inject,
  viewChild,
  NgZone,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { gsap } from 'gsap';
import * as THREE from 'three';

@Component({
  selector: 'app-hero',
  imports: [RouterLink],
  templateUrl: './hero.html',
  styleUrl: './hero.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: block' },
})
export class HeroComponent implements AfterViewInit, OnDestroy {
  private el = inject(ElementRef);
  private zone = inject(NgZone);

  heroCanvas = viewChild.required<ElementRef<HTMLCanvasElement>>('heroCanvas');

  private mouseX = 0;
  private mouseY = 0;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private currentRippleIntensity = 0;
  private raycaster = new THREE.Raycaster();
  private targetX = 0;
  private targetY = 0;
  private firstMove = true;
  private mouseVec = new THREE.Vector2();
  private planeNormalVec = new THREE.Vector3(0, 0, 1);
  private planePosVec = new THREE.Vector3();
  private mathPlane = new THREE.Plane();
  private intersectVec = new THREE.Vector3();

  onMouseMove(event: MouseEvent): void {
    const rect = (this.el.nativeElement as HTMLElement).getBoundingClientRect();
    this.mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    if (this.firstMove) {
      this.lastMouseX = this.mouseX;
      this.lastMouseY = this.mouseY;
      this.firstMove = false;
    }
  }

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private animationId = 0;

  private recordGroup!: THREE.Group;
  private recordMesh!: THREE.Mesh;
  private abstractShape!: any;
  private resizeObserver!: ResizeObserver;
  private brandCol = new THREE.Color('#ef4444');

  ngAfterViewInit(): void {
    const reveals = this.el.nativeElement.querySelectorAll('.gs-reveal');
    gsap.to(reveals, {
      opacity: 1,
      y: 0,
      duration: 1.2,
      stagger: 0.1,
      ease: 'power2.out',
      delay: 0.1,
    });

    this.zone.runOutsideAngular(() => {
      requestAnimationFrame(() => this.initThree());
    });
  }

  private initThree(): void {
    const canvas = this.heroCanvas().nativeElement;
    const section = (this.el.nativeElement as HTMLElement).querySelector('.hero') as HTMLElement;
    const w = section.offsetWidth;
    const h = section.offsetHeight;

    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h);
    // Use an elegant linear tone mapping for deep blacks and sharp highlights
    this.renderer.toneMapping = THREE.LinearToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, w / h, 0.1, 100);
    this.camera.position.set(0, 0, 12);

    const style = getComputedStyle(document.body);
    const brandHex = style.getPropertyValue('--brand-color').trim() || '#ef4444';
    this.brandCol = new THREE.Color(brandHex);

    this.buildPlatinumRecord(this.brandCol);

    // ─── Museum/Gallery Lighting ─────────────────────────────
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.05)); // Extremely dark shadows

    // Bright, sharp spot light simulating a gallery light from above-front
    const spotLight = new THREE.SpotLight(0xffffff, 8.0, 30, Math.PI / 6, 0.3, 1);
    spotLight.position.set(3, 5, 8);
    spotLight.target = this.recordGroup;
    this.scene.add(spotLight);
    this.scene.add(spotLight.target);

    // Deep side raking light to catch the clearcoat and grooves
    const rakeLight = new THREE.PointLight(0xffffff, 3.0, 15);
    rakeLight.position.set(-3, 3, 2);
    this.scene.add(rakeLight);

    // Brand-colored reflection from below
    const brandFill = new THREE.PointLight(this.brandCol, 2.0, 10);
    brandFill.position.set(4, -4, 2);
    this.scene.add(brandFill);

    // ─── Interactive Elegant Minimal Grid ─────────────
    // A sophisticated flat grid that looks polished and reacts smoothly
    const segmentsX = 90;
    const segmentsY = 50;
    const planeGeo = new THREE.PlaneGeometry(45, 25, segmentsX, segmentsY);

    // Store original positions and create attributes for animation
    const positions = planeGeo.attributes['position'];
    const originalPos = new Float32Array(positions.count * 3);
    const colors = new Float32Array(positions.count * 3);
    const sizes = new Float32Array(positions.count);

    const center = new THREE.Vector2(0, 0);

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);

      originalPos[i * 3] = x;
      originalPos[i * 3 + 1] = y;
      originalPos[i * 3 + 2] = z;

      // Introduce a very subtle, elegant depth of field by varying point sizes slightly based on a noise-like pattern
      sizes[i] = 1.0 + Math.sin(x * 2.0) * 0.3 + Math.cos(y * 2.0) * 0.3;

      // Create a subtle radial color gradient
      // Outer edges are dim gray, center is a slightly brighter silver/gray for a focused spotlight effect
      const distToCenter = Math.sqrt(x * x + y * y);
      const normalizedDist = Math.min(1.0, distToCenter / 20.0);

      // Interpolate between a faint gray and a slightly brighter white/silver
      // Base color: #333333, Highlight: #888888
      const r = 0.2 + (1.0 - normalizedDist) * 0.3;
      const g = 0.2 + (1.0 - normalizedDist) * 0.3;
      const b = 0.2 + (1.0 - normalizedDist) * 0.3;

      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    }

    planeGeo.setAttribute('originalPos', new THREE.BufferAttribute(originalPos, 3));
    planeGeo.setAttribute('baseColor', new THREE.BufferAttribute(colors, 3));
    planeGeo.setAttribute('color', new THREE.BufferAttribute(colors.slice(), 3));
    planeGeo.setAttribute('sizeMultiplier', new THREE.BufferAttribute(sizes, 1));

    // Custom Shader Material allows us to easily manipulate individual point sizes and colors seamlessly
    const customShaderMaterial = new THREE.ShaderMaterial({
      uniforms: {
        brandColor: { value: this.brandCol },
      },
      vertexShader: `
        attribute vec3 originalPos;
        attribute vec3 baseColor;
        attribute float sizeMultiplier;
        
        varying vec3 vColor;
        
        void main() {
          vColor = color;
          // Scale point size based on camera distance to maintain consistency
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = (12.0 * sizeMultiplier) * (1.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        
        void main() {
          // Create perfectly round, smooth anti-aliased dots instead of square pixels
          vec2 coord = gl_PointCoord - vec2(0.5);
          float sqRadius = dot(coord, coord);
          if (sqRadius > 0.25) discard;
          
          // Soft edge feathering
          float alpha = smoothstep(0.25, 0.2, sqRadius) * 0.5;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    });

    this.abstractShape = new THREE.Points(planeGeo, customShaderMaterial);
    this.abstractShape.position.set(0, 0, -6);
    // Almost perfectly flat, just a tiny tilt for perspective depth
    this.abstractShape.rotation.x = -0.05;
    this.scene.add(this.abstractShape);

    // ─── Resize ──────────────────────────────────────────────
    this.resizeObserver = new ResizeObserver(() => {
      const rw = section.offsetWidth;
      const rh = section.offsetHeight;
      if (rw === 0 || rh === 0) return;
      this.renderer.setSize(rw, rh);
      this.camera.aspect = rw / rh;
      this.camera.updateProjectionMatrix();
    });
    this.resizeObserver.observe(section);

    this.animate();
  }

  private spinningGroup!: THREE.Group;

  private buildPlatinumRecord(brandCol: THREE.Color): void {
    this.recordGroup = new THREE.Group();
    this.spinningGroup = new THREE.Group();
    this.recordGroup.add(this.spinningGroup);

    // 1. The Vinyl Platter with Track Breaks, Dead Wax, and Outer Edge
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, 1024, 1024);
      ctx.translate(512, 512);

      // Playable tracks (radius 200 to 480 approx mapped from world radius)
      ctx.strokeStyle = '#333333';
      for (let r = 180; r < 480; r += 2.0) {
        if ((r > 260 && r < 268) || (r > 350 && r < 358) || (r > 430 && r < 438)) {
          continue; // Track gaps
        }
        ctx.lineWidth = 1.0 + Math.random() * 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.globalAlpha = 0.5 + Math.random() * 0.5;
        ctx.stroke();
      }

      // Inner 'Dead Wax' run-out groove (radius 165 to 180)
      ctx.lineWidth = 1.8;
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      // Draw a spiral for the runout
      for (let theta = 0; theta < Math.PI * 8; theta += 0.1) {
        // Spiral from r=180 down to r=160
        const r = 180 - (theta / (Math.PI * 8)) * 20;
        const x = r * Math.cos(theta);
        const y = r * Math.sin(theta);
        if (theta === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Simulate etched matrix numbers in dead wax
      ctx.font = '12px "Courier New"';
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.save();
      ctx.rotate(Math.PI / 3);
      ctx.fillText('BPA-001-A', 165, 0);
      ctx.restore();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();

    // The actual platter geometry
    const recordGeo = new THREE.CylinderGeometry(2.5, 2.5, 0.04, 64);
    const recordMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#010101'),
      metalness: 0.1,
      roughness: 0.6,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
      bumpMap: texture,
      bumpScale: 0.035,
    });
    this.recordMesh = new THREE.Mesh(recordGeo, recordMat);
    this.recordMesh.rotation.x = Math.PI / 2;
    this.spinningGroup.add(this.recordMesh);

    // Outer Bead/Lip Geometry
    const lipGeo = new THREE.TorusGeometry(2.48, 0.02, 16, 64);
    const lipMat = new THREE.MeshPhysicalMaterial({
      color: '#010101',
      metalness: 0.1,
      roughness: 0.4,
      clearcoat: 1.0,
    });
    const lipMesh = new THREE.Mesh(lipGeo, lipMat);
    lipMesh.rotation.x = Math.PI / 2;
    // Align with record top surface
    lipMesh.position.y = 0.02;
    this.recordMesh.add(lipMesh);

    // 2. The Center Label (Detailed with Canvas Text)
    const labelGroup = new THREE.Group();

    // Create a texture for the label to simulate print
    const labelCanvas = document.createElement('canvas');
    labelCanvas.width = 512;
    labelCanvas.height = 512;
    const lCtx = labelCanvas.getContext('2d');
    if (lCtx) {
      lCtx.fillStyle = '#' + brandCol.getHexString();
      lCtx.fillRect(0, 0, 512, 512);
      lCtx.translate(256, 256);

      // Inner ring
      lCtx.strokeStyle = '#111';
      lCtx.lineWidth = 4;
      lCtx.beginPath();
      lCtx.arc(0, 0, 240, 0, Math.PI * 2);
      lCtx.stroke();

      // Outer ring
      lCtx.strokeStyle = '#fff';
      lCtx.lineWidth = 2;
      lCtx.beginPath();
      lCtx.arc(0, 0, 225, 0, Math.PI * 2);
      lCtx.stroke();

      // Brand text curved
      lCtx.fillStyle = '#fff';
      lCtx.font = 'bold 28px sans-serif';
      lCtx.textAlign = 'center';
      lCtx.textBaseline = 'middle';

      const text = 'BLUEPRINT AUDIO • STEREO • ORIGINAL COMPOSITIONS •';
      for (let i = 0; i < text.length; i++) {
        lCtx.save();
        lCtx.rotate((i * 7.2 * Math.PI) / 180 - Math.PI / 2 - 0.5);
        lCtx.fillText(text[i], 0, -195);
        lCtx.restore();
      }

      // Center logo / text
      lCtx.fillStyle = '#0a0a0a';
      lCtx.font = '900 64px sans-serif';
      lCtx.fillText('BPA', 0, -30);
      lCtx.font = '600 24px sans-serif';
      lCtx.fillText('33 ⅓ RPM', 0, 40);

      // Side letter
      lCtx.font = 'bold 36px sans-serif';
      lCtx.fillText('A', -120, 0);
      lCtx.fillText('1', 120, 0);
    }
    const labelTexture = new THREE.CanvasTexture(labelCanvas);
    labelTexture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();

    const labelGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.045, 64);
    const labelMat = new THREE.MeshPhysicalMaterial({
      map: labelTexture,
      metalness: 0.1,
      roughness: 0.7,
      clearcoat: 0.1,
    });
    const labelMesh = new THREE.Mesh(labelGeo, labelMat);
    labelMesh.rotation.x = Math.PI / 2;
    // slightly above vinyl surface
    labelMesh.position.z = 0.005;
    labelGroup.add(labelMesh);

    // Attach label to spinning group
    this.spinningGroup.add(labelGroup);

    // 3. Center Spindle
    const spindleGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.2, 32);
    const spindleMat = new THREE.MeshPhysicalMaterial({
      color: '#ffffff',
      metalness: 1.0,
      roughness: 0.1,
      clearcoat: 1.0,
    });
    const spindleMesh = new THREE.Mesh(spindleGeo, spindleMat);
    spindleMesh.rotation.x = Math.PI / 2;
    // Spindle stays still, doesn't spin
    this.recordGroup.add(spindleMesh);

    // 4. Tone Arm (Hovering over the record)
    const toneArmGroup = new THREE.Group();

    // Arm Pivot Base
    const pivotGeo = new THREE.CylinderGeometry(0.3, 0.35, 0.15, 32);
    const pivotMat = new THREE.MeshPhysicalMaterial({
      color: '#111',
      metalness: 0.9,
      roughness: 0.5,
    });
    const pivotMesh = new THREE.Mesh(pivotGeo, pivotMat);
    pivotMesh.rotation.x = Math.PI / 2;
    pivotMesh.position.set(2.8, 2.2, 0.1);
    toneArmGroup.add(pivotMesh);

    // Antiskate / gimbal ring detailing
    const gimbalGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.25, 32);
    const gimbalMat = new THREE.MeshPhysicalMaterial({
      color: '#1a1a1a',
      metalness: 0.9,
      roughness: 0.4,
    });
    const gimbalMesh = new THREE.Mesh(gimbalGeo, gimbalMat);
    gimbalMesh.rotation.x = Math.PI / 2;
    gimbalMesh.position.set(2.8, 2.2, 0.25);
    toneArmGroup.add(gimbalMesh);

    // Counterweight (extending out the back of the pivot)
    const cwGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.4, 32);
    const cwMat = new THREE.MeshPhysicalMaterial({
      color: '#cccccc',
      metalness: 0.9,
      roughness: 0.2,
    });
    const cwMesh = new THREE.Mesh(cwGeo, cwMat);
    // Position behind the pivot relative to headshell
    cwMesh.position.set(2.8 + 0.35, 2.2 + 0.45, 0.25);
    // align cylinder
    cwMesh.rotation.y = Math.PI / 2;
    cwMesh.rotation.z = Math.atan2(-1.6, -1.2);
    toneArmGroup.add(cwMesh);

    // The Arm Rod (curved)
    class ToneArmCurve extends THREE.Curve<THREE.Vector3> {
      constructor() {
        super();
      }
      override getPoint(t: number, optionalTarget = new THREE.Vector3()) {
        const start = new THREE.Vector3(2.8, 2.2, 0.25);
        const control = new THREE.Vector3(3.2, 0.8, 0.2);
        const end = new THREE.Vector3(1.6, 0.6, 0.08);

        const tx =
          Math.pow(1 - t, 2) * start.x + 2 * (1 - t) * t * control.x + Math.pow(t, 2) * end.x;
        const ty =
          Math.pow(1 - t, 2) * start.y + 2 * (1 - t) * t * control.y + Math.pow(t, 2) * end.y;
        const tz =
          Math.pow(1 - t, 2) * start.z + 2 * (1 - t) * t * control.z + Math.pow(t, 2) * end.z;

        return optionalTarget.set(tx, ty, tz);
      }
    }
    const path = new ToneArmCurve();
    const armGeo = new THREE.TubeGeometry(path, 64, 0.04, 16, false); // smooth curved tube
    const armMat = new THREE.MeshPhysicalMaterial({
      color: '#e2e2e2',
      metalness: 0.9,
      roughness: 0.2,
      clearcoat: 1.0,
    });
    const armMesh = new THREE.Mesh(armGeo, armMat);
    toneArmGroup.add(armMesh);

    // The Headshell / Stylus cartridge
    const headshellGeo = new THREE.BoxGeometry(0.12, 0.35, 0.08);
    const headshellMat = new THREE.MeshPhysicalMaterial({
      color: '#111',
      metalness: 0.6,
      roughness: 0.8,
    });
    const headshellMesh = new THREE.Mesh(headshellGeo, headshellMat);
    // Align tightly to the end of the calculated curve
    headshellMesh.position.set(1.6, 0.6, 0.08);
    const dx = 1.6 - 3.2;
    const dy = 0.6 - 0.8;
    headshellMesh.rotation.z = Math.atan2(dy, dx) + Math.PI / 2 + 0.15;

    // Tiny silver needle
    const needleGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.1);
    const needleMat = new THREE.MeshBasicMaterial({ color: '#fff' });
    const needleMesh = new THREE.Mesh(needleGeo, needleMat);
    needleMesh.position.set(0, -0.15, -0.05);
    needleMesh.rotation.x = Math.PI / 4;
    headshellMesh.add(needleMesh);

    toneArmGroup.add(headshellMesh);

    this.recordGroup.add(toneArmGroup);

    // Tilt the whole assembly elegantly for a dramatic viewing angle
    this.recordGroup.position.set(2.2, 0, 0);
    this.recordGroup.rotation.set(-0.6, -0.4, 0.2);
    this.scene.add(this.recordGroup);
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);

    // Continuous elegant spinning
    if (this.recordGroup && this.spinningGroup) {
      // The spinning group continually spins on its local Z axis
      this.spinningGroup.rotation.z -= 0.006;

      // Floating & Mouse Parallax for the whole assembly
      this.recordGroup.rotation.x = -0.6 - this.mouseY * 0.08;
      this.recordGroup.rotation.y = -0.4 + this.mouseX * 0.08;
      this.recordGroup.position.y = Math.sin(Date.now() * 0.001) * 0.08;
    }

    // Interactive ripple background
    if (this.abstractShape) {
      const time = Date.now() * 0.002;
      const positions = this.abstractShape.geometry.attributes['position'];

      if (!this.firstMove) {
        const dxMouse = this.mouseX - this.lastMouseX;
        const dyMouse = this.mouseY - this.lastMouseY;
        const mouseSpeed = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);

        const speedFactor = mouseSpeed * 30; // React to mouse speed
        this.currentRippleIntensity = Math.min(this.currentRippleIntensity + speedFactor, 1.5);

        this.lastMouseX = this.mouseX;
        this.lastMouseY = this.mouseY;

        this.mouseVec.set(this.mouseX, this.mouseY);
        this.raycaster.setFromCamera(this.mouseVec, this.camera);

        this.planeNormalVec.set(0, 0, 1).applyEuler(this.abstractShape.rotation).normalize();
        this.planePosVec.copy(this.abstractShape.position);
        this.mathPlane.setFromNormalAndCoplanarPoint(this.planeNormalVec, this.planePosVec);

        if (this.raycaster.ray.intersectPlane(this.mathPlane, this.intersectVec)) {
          this.abstractShape.worldToLocal(this.intersectVec);
          this.targetX = this.intersectVec.x;
          this.targetY = this.intersectVec.y;
        }
      }

      // Elegant, refined interaction loop
      const originalPos = this.abstractShape.geometry.attributes['originalPos'];
      const colors = this.abstractShape.geometry.attributes['color'];
      const baseColors = this.abstractShape.geometry.attributes['baseColor'];

      for (let i = 0; i < positions.count; i++) {
        const ox = originalPos.getX(i);
        const oy = originalPos.getY(i);
        const oz = originalPos.getZ(i);

        const dx = ox - this.targetX;
        const dy = oy - this.targetY;
        const distSq = dx * dx + dy * dy;

        let cx = ox;
        let cy = oy;
        let cz = oz;

        let cr = baseColors.getX(i);
        let cg = baseColors.getY(i);
        let cb = baseColors.getZ(i);

        // A very slow, virtually imperceptible ambient drifting motion
        // Just enough so the grid isn't totally dead when the mouse is still
        cz += Math.sin(ox * 0.5 + time * 0.8) * Math.cos(oy * 0.5 + time * 0.8) * 0.2;

        // Mouse interaction: Smooth Repulsion and Brand Color Illumination
        if (this.currentRippleIntensity > 0.01 && distSq < 12.0) {
          const dist = Math.sqrt(distSq);
          // Smooth bell-curve falloff for the repulsion field
          const influence = Math.exp(-(dist * dist) / 5.0) * this.currentRippleIntensity;

          // Push points away smoothly in 2D space
          if (dist > 0.1) {
            cx += (dx / dist) * influence * 1.5;
            cy += (dy / dist) * influence * 1.5;
          }

          // Create a subtle "shockwave" ripple on the Z axis
          // the points get pushed down slightly as the cursor passes over them
          cz -= influence * 2.0;

          // Illuminate the points under the cursor with the brand color
          // Mix original gray color with brand color based on cursor proximity
          cr = THREE.MathUtils.lerp(cr, this.brandCol.r, influence);
          cg = THREE.MathUtils.lerp(cg, this.brandCol.g, influence);
          cb = THREE.MathUtils.lerp(cb, this.brandCol.b, influence);
        }

        positions.setXYZ(i, cx, cy, cz);
        colors.setXYZ(i, cr, cg, cb);
      }
      positions.needsUpdate = true;
      colors.needsUpdate = true;
    }

    this.currentRippleIntensity *= 0.95; // Decay over time
    this.renderer.render(this.scene, this.camera);
  };

  ngOnDestroy(): void {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    if (this.resizeObserver) this.resizeObserver.disconnect();
    if (this.renderer) this.renderer.dispose();

    if (this.abstractShape) {
      this.abstractShape.geometry.dispose();
      if (Array.isArray(this.abstractShape.material)) {
        this.abstractShape.material.forEach((m: any) => m.dispose());
      } else {
        this.abstractShape.material.dispose();
      }
    }

    if (this.recordGroup) {
      this.recordGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    }
  }
}
