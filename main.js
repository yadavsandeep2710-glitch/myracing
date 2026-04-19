// DriveMaster v7 - Grand Tour (Photorealistic Engine)
// Advanced GLSL Shader Integration for Real Road & Hills

const startApp = () => {
    // --- Utilities & Constants ---
    const Noise = (() => {
        const grad3 = [[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]];
        const p = [151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180];
        const perm = new Array(512);
        for(let i=0; i<512; i++) perm[i] = p[i & 255];
        return {
            noise2D: (x, y) => {
                const s = (x + y) * 0.366025403, i = Math.floor(x + s), j = Math.floor(y + s);
                const t = (i + j) * 0.211324865, x0 = x - (i - t), y0 = y - (j - t);
                let i1, j1; if(x0 > y0) { i1=1; j1=0; } else { i1=0; j1=1; }
                const x1 = x0-i1+0.211324865, y1 = y0-j1+0.211324865;
                const x2 = x0-1+2*0.211324865, y2 = y0-1+2*0.211324865;
                const ii = i & 255, jj = j & 255;
                let t0 = 0.5-x0*x0-y0*y0, n0=0; if(t0>0){t0*=t0; n0=t0*t0*(grad3[perm[ii+perm[jj]]%12][0]*x0+grad3[perm[ii+perm[jj]]%12][1]*y0);}
                let t1 = 0.5-x1*x1-y1*y1, n1=0; if(t1>0){t1*=t1; n1=t1*t1*(grad3[perm[ii+i1+perm[jj+j1]]%12][0]*x1+grad3[perm[ii+i1+perm[jj+j1]]%12][1]*y1);}
                let t2 = 0.5-x2*x2-y2*y2, n2=0; if(t2>0){t2*=t2; n2=t2*t2*(grad3[perm[ii+1+perm[jj+1]]%12][0]*x2+grad3[perm[ii+1+perm[jj+1]]%12][1]*y2);}
                return 40 * (n0 + n1 + n2);
            }
        };
    })();

    // --- State ---
    const state = {
        engineOn: false,
        speed: 0, rpm: 0, posX: 0, posZ: 0, steering: 0,
        isGas: false, isBrake: false, isLeft: false, isRight: false,
        lastTime: performance.now()
    };

    const config = {
        roadWidth: 20, terrainSize: 500, terrainRes: 80,
        maxSpeed: 100, accel: 35
    };

    // --- DOM Elements ---
    const canvas = document.getElementById('road-canvas');
    const container = document.querySelector('.windshield-frame');
    const assistant = document.getElementById('lesson-desc');
    if (!THREE) return;

    // --- Scene & Renderer ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xb0d8ff);
    scene.fog = new THREE.FogExp2(0xb0d8ff, 0.0015);

    const camera = new THREE.PerspectiveCamera(70, container.clientWidth / container.clientHeight, 0.1, 3000);
    camera.position.set(0, 5, 0);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;

    // --- Photoreal Shaders ---
    const terrainShader = {
        uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib['lights'], { uTime: { value: 0 } }]),
        vertexShader: `
            varying vec3 vNormal;
            varying vec3 vWorldPos;
            varying float vHeight;
            void main() {
                vNormal = normal;
                vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
                vHeight = position.z;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            varying vec3 vNormal;
            varying vec3 vWorldPos;
            varying float vHeight;
            void main() {
                vec3 grassColor = vec3(0.2, 0.45, 0.1);
                vec3 rockColor = vec3(0.35, 0.3, 0.25);
                vec3 roadColor = vec3(0.12, 0.12, 0.12);
                
                float slope = 1.0 - vNormal.z;
                float distort = fract(sin(dot(vWorldPos.xz ,vec2(12.9898,78.233))) * 43758.5453) * 0.1;
                
                vec3 finalColor = mix(grassColor, rockColor, clamp(slope * 4.0, 0.0, 1.0));
                
                // Road integration
                float dist = abs(vWorldPos.x);
                if (dist < 10.0) {
                    float fade = smoothstep(8.5, 10.0, dist);
                    finalColor = mix(roadColor + distort, finalColor, fade);
                }
                
                gl_FragColor = vec4(finalColor * (0.8 + distort), 1.0);
            }
        `
    };

    // --- World Elements ---
    const terrainGroup = new THREE.Group();
    scene.add(terrainGroup);

    const createTerrainMesh = (offsetZ) => {
        const geo = new THREE.PlaneGeometry(config.terrainSize, config.terrainSize, config.terrainRes, config.terrainRes);
        const mat = new THREE.ShaderMaterial({
            uniforms: terrainShader.uniforms,
            vertexShader: terrainShader.vertexShader,
            fragmentShader: terrainShader.fragmentShader,
            lights: true
        });

        const pos = geo.attributes.position.array;
        for (let i = 0; i < pos.length; i += 3) {
            const x = pos[i];
            const z = pos[i + 1] + offsetZ;
            let h = Noise.noise2D(x * 0.005, z * 0.005) * 60;
            h += Noise.noise2D(x * 0.02, z * 0.02) * 5;
            
            const dist = Math.abs(x);
            if (dist < 20) {
                const s = Math.pow(dist / 20, 2);
                h *= s;
            }
            pos[i + 2] = h;
        }
        geo.computeVertexNormals();
        const mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(0, 0, offsetZ);
        terrainGroup.add(mesh);
        return mesh;
    };

    const tiles = [createTerrainMesh(0), createTerrainMesh(-config.terrainSize)];

    // Scenery Assets
    const createTree = (x, z) => {
        const tree = new THREE.Group();
        const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.8, 4, 0.8), new THREE.MeshStandardMaterial({ color: 0x3d2b1f }));
        trunk.position.y = 2;
        tree.add(trunk);
        const leaves = new THREE.Mesh(new THREE.SphereGeometry(3, 8, 8), new THREE.MeshStandardMaterial({ color: 0x1a4a1a }));
        leaves.position.y = 5;
        tree.add(leaves);
        tree.position.set(x, 0, z);
        scene.add(tree);
        return tree;
    };

    const trees = [];
    for(let i = 0; i < 30; i++) {
        trees.push(createTree( (Math.random() > 0.5 ? 25 : -25) + (Math.random() * 40 - 20), -Math.random() * 1000 ));
    }

    // --- System Loops ---
    const sun = new THREE.DirectionalLight(0xfff5e6, 1.2);
    sun.position.set(50, 150, 50);
    scene.add(sun);
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));

    const hud = {
        speed: document.getElementById('speed-indicator'),
        needleS: document.getElementById('speed-needle'),
        needleR: document.getElementById('rpm-needle'),
        wheel: document.getElementById('steering-wheel'),
        engine: document.getElementById('engine-btn'),
        gas: document.getElementById('gas-pedal'),
        brake: document.getElementById('brake-pedal')
    };

    const animate = () => {
        const time = performance.now();
        const dt = Math.min(0.1, (time - state.lastTime) / 1000);
        state.lastTime = time;

        if (state.engineOn) {
            if (state.isGas) {
                state.rpm = THREE.MathUtils.lerp(state.rpm, 6500, dt * 1.5);
                state.speed = Math.min(config.maxSpeed, state.speed + config.accel * (state.rpm/6500) * dt);
            } else {
                state.rpm = THREE.MathUtils.lerp(state.rpm, 800, dt);
                state.speed = Math.max(0, state.speed - 8 * dt);
            }
            if (state.isBrake) {
                state.speed = Math.max(0, state.speed - 120 * dt);
                state.rpm = Math.max(800, state.rpm - 5000 * dt);
            }
            const steerDir = (state.isLeft ? 1 : 0) - (state.isRight ? 1 : 0);
            state.steering = THREE.MathUtils.lerp(state.steering, steerDir * 0.6, dt * 4);
            state.posX += state.steering * (state.speed / 8) * dt;
        } else {
            state.speed = Math.max(0, state.speed - 25 * dt);
            state.rpm = THREE.MathUtils.lerp(state.rpm, 0, dt * 8);
        }

        // Infinite Scenery Treadmill
        state.posZ -= state.speed * 2.5 * dt;
        terrainGroup.position.z = -state.posZ % config.terrainSize;

        tiles.forEach(tile => {
            const worldZ = tile.position.z + state.posZ;
            if (worldZ > config.terrainSize) tile.position.z -= tiles.length * config.terrainSize;
        });

        trees.forEach(tree => {
            tree.position.z += state.speed * 2.5 * dt;
            if (tree.position.z > 50) {
                tree.position.z = -1000;
                tree.position.x = (Math.random() > 0.5 ? 25 : -25) + (Math.random() * 40 - 20);
                // Adjust height for terrain
                const h = Noise.noise2D(tree.position.x * 0.005, tree.position.z * 0.005) * 60;
                tree.position.y = h < 0 ? 0 : h;
            }
        });

        // Car Dynamics
        camera.position.x = -state.posX;
        camera.rotation.z = state.steering * 0.08;
        camera.position.y = 5 + (state.speed / config.maxSpeed) * (Math.random()-0.5) * 0.3; // Road vibration

        hud.speed.innerHTML = `${Math.round(state.speed)}<span>km/h</span>`;
        hud.needleS.style.transform = `rotate(${(state.speed/config.maxSpeed)*240-120}deg)`;
        hud.needleR.style.transform = `rotate(${(state.rpm/7000)*240-120}deg)`;
        hud.wheel.style.transform = `rotate(${-state.steering * 180}deg)`;
        hud.gas.classList.toggle('active', state.isGas);
        hud.brake.classList.toggle('active', state.isBrake);

        renderer.render(scene, camera);
        requestAnimationFrame(animate);
    };

    const setKeys = (k, down) => {
        const key = k.toLowerCase();
        if (key === 'w' || k === 'ArrowUp') state.isGas = down;
        if (key === 's' || k === 'ArrowDown') state.isBrake = down;
        if (key === 'a' || k === 'ArrowLeft') state.isLeft = down;
        if (key === 'd' || k === 'ArrowRight') state.isRight = down;
        if (down && !state.engineOn && ['w','a','s','d'].includes(key)) assistant.innerText = "START ENGINE! (Press E)";
    };

    window.addEventListener('keydown', e => {
        setKeys(e.key, true);
        if (e.key.toLowerCase() === 'e') hud.engine.click();
    });
    window.addEventListener('keyup', e => setKeys(e.key, false));
    hud.engine.addEventListener('click', () => {
        state.engineOn = !state.engineOn;
        hud.engine.innerText = state.engineOn ? 'STOP' : 'START';
        state.rpm = state.engineOn ? 800 : 0;
        assistant.innerText = state.engineOn ? "Real Graphics Enabled." : "Ready.";
    });

    window.addEventListener('resize', () => {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });

    animate();
};

if (document.readyState === 'complete') startApp();
else window.addEventListener('load', startApp);
