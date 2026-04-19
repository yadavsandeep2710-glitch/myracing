// DriveMaster v6 - Scenic Odyssey (Slow Roads Inspired)
// Bulletproof Global Three.js Implementation

const startApp = () => {
    // --- Simplex Noise Implementation (Minimal) ---
    const Noise = (() => {
        const grad3 = [[1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0], [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1], [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]];
        const p = [151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,190, 6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168, 68,175,74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54, 65,25,63,161, 1,216,80,73,209,76,132,187,208, 89,18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186, 3,64,52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,223,183,170,213,119,248,152, 2,44,154,163, 70,221,153,101,155,167, 43,172,9,129,22,39,253, 19,98,108,110,79,113,224,232,178,185, 112,104,218,246,97,228,251,34,242,193,238,210,144,12,191,179,162,241, 81,51,145,235,249,14,239,107,49,192,214, 31,181,199,106,157,184, 84,204,176,115,121,50,45,127, 4,150,254,138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180];
        const perm = new Array(512);
        for(let i=0; i<512; i++) perm[i] = p[i & 255];
        return {
            noise2D: (x, y) => {
                const s = (x + y) * 0.366025403;
                const i = Math.floor(x + s), j = Math.floor(y + s);
                const t = (i + j) * 0.211324865;
                const x0 = x - (i - t), y0 = y - (j - t);
                let i1, j1; if(x0 > y0) { i1=1; j1=0; } else { i1=0; j1=1; }
                const x1 = x0 - i1 + 0.211324865, y1 = y0 - j1 + 0.211324865;
                const x2 = x0 - 1 + 2 * 0.211324865, y2 = y0 - 1 + 2 * 0.211324865;
                const ii = i & 255, jj = j & 255;
                let n0=0, n1=0, n2=0;
                let t0 = 0.5 - x0*x0 - y0*y0;
                if(t0 > 0) { t0 *= t0; n0 = t0 * t0 * (grad3[perm[ii+perm[jj]] % 12][0]*x0 + grad3[perm[ii+perm[jj]] % 12][1]*y0); }
                let t1 = 0.5 - x1*x1 - y1*y1;
                if(t1 > 0) { t1 *= t1; n1 = t1 * t1 * (grad3[perm[ii+i1+perm[jj+j1]] % 12][0]*x1 + grad3[perm[ii+i1+perm[jj+j1]] % 12][1]*y1); }
                let t2 = 0.5 - x2*x2 - y2*y2;
                if(t2 > 0) { t2 *= t2; n2 = t2 * t2 * (grad3[perm[ii+1+perm[jj+1]] % 12][0]*x2 + grad3[perm[ii+1+perm[jj+1]] % 12][1]*y2); }
                return 40 * (n0 + n1 + n2);
            }
        };
    })();

    // --- State & Config ---
    const state = {
        engineOn: false,
        speed: 0,
        rpm: 0,
        posX: 0,
        posZ: 0,
        steering: 0,
        isGas: false, isBrake: false, isLeft: false, isRight: false,
        lastTime: performance.now()
    };

    const config = {
        roadWidth: 20,
        terrainSize: 400,
        terrainRes: 64,
        maxSpeed: 100,
        accel: 30
    };

    // --- DOM ---
    const canvas = document.getElementById('road-canvas');
    const container = document.querySelector('.windshield-frame');
    const assistantDesc = document.getElementById('lesson-desc');

    if (typeof THREE === 'undefined') {
        assistantDesc.innerText = "Error: Three.js missing.";
        return;
    }

    // --- Scene Setup ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xaaccff); // Soft blue sky
    scene.fog = new THREE.Fog(0xaaccff, 100, 800);

    const camera = new THREE.PerspectiveCamera(70, container.clientWidth / container.clientHeight, 0.1, 2000);
    camera.position.set(0, 5, 0);

    const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    // --- Lighting ---
    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(100, 200, 100);
    scene.add(sun);
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));

    // --- Terrain System ---
    const terrainGroup = new THREE.Group();
    scene.add(terrainGroup);

    const createTerrainTile = (offsetX, offsetZ) => {
        const geo = new THREE.PlaneBufferGeometry(config.terrainSize, config.terrainSize, config.terrainRes, config.terrainRes);
        const mat = new THREE.MeshStandardMaterial({ 
            color: 0x44aa44, 
            roughness: 0.8,
            vertexColors: true 
        });

        const vertices = geo.attributes.position.array;
        const colors = new Float32Array(vertices.length);
        
        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i] + offsetX;
            const z = vertices[i + 1] + offsetZ;
            
            // Generate Noise Height
            let h = Noise.noise2D(x * 0.005, z * 0.005) * 50;
            h += Noise.noise2D(x * 0.02, z * 0.02) * 5;

            // Road Smoothing
            const distFromRoad = Math.abs(x);
            if (distFromRoad < config.roadWidth) {
                const factor = Math.pow(distFromRoad / config.roadWidth, 2);
                h = h * factor; // Flatten road
            }

            vertices[i + 2] = h; // Set Z (height in PlaneGeometry)

            // Dynamic Coloring
            const color = new THREE.Color(h > 20 ? 0x888888 : 0x44aa44);
            if (distFromRoad < config.roadWidth - 2) color.set(0x333333); // Road color
            colors[i] = color.r; colors[i+1] = color.g; colors[i+2] = color.b;
        }

        geo.computeVertexNormals();
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        const mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(offsetX, 0, offsetZ);
        
        terrainGroup.add(mesh);
        return mesh;
    };

    const tiles = [];
    for(let z = -2; z <= 0; z++) {
        tiles.push(createTerrainTile(0, z * config.terrainSize));
    }

    // --- HUD Elements ---
    const elements = {
        speed: document.getElementById('speed-indicator'),
        needleS: document.getElementById('speed-needle'),
        needleR: document.getElementById('rpm-needle'),
        wheel: document.getElementById('steering-wheel'),
        engine: document.getElementById('engine-btn'),
        gas: document.getElementById('gas-pedal'),
        brake: document.getElementById('brake-pedal')
    };

    // --- Loop ---
    const animate = () => {
        const time = performance.now();
        const dt = Math.min(0.1, (time - state.lastTime) / 1000);
        state.lastTime = time;

        if (state.engineOn) {
            // Speed Logic
            if (state.isGas) {
                state.speed = Math.min(config.maxSpeed, state.speed + config.accel * dt);
                state.rpm = THREE.MathUtils.lerp(state.rpm, 6000, dt * 2);
            } else {
                state.speed = Math.max(0, state.speed - 5 * dt);
                state.rpm = THREE.MathUtils.lerp(state.rpm, 800, dt);
            }
            if (state.isBrake) state.speed = Math.max(0, state.speed - 80 * dt);

            // Steering Logic
            const steerDir = (state.isLeft ? 1 : 0) - (state.isRight ? 1 : 0);
            state.steering = THREE.MathUtils.lerp(state.steering, steerDir * 0.5, dt * 3);
            state.posX += state.steering * (state.speed / 10) * dt;
        } else {
            state.speed = Math.max(0, state.speed - 20 * dt);
            state.rpm = THREE.MathUtils.lerp(state.rpm, 0, dt * 5);
        }

        // Move Terrain
        state.posZ -= state.speed * 2 * dt;
        terrainGroup.position.z = -state.posZ % config.terrainSize;

        // Tile Management (Simple swap)
        tiles.forEach((tile, i) => {
            const worldZ = tile.position.z + state.posZ;
            if (worldZ > config.terrainSize) {
                tile.position.z -= tiles.length * config.terrainSize;
            }
        });

        // Car Height Following (Approximate)
        const carH = Noise.noise2D(state.posX * 0.005, -state.posZ * 0.005) * 5; // Slight bobbing
        camera.position.y = 5 + carH;
        camera.position.x = -state.posX;
        camera.rotation.z = state.steering * 0.1;
        camera.rotation.x = -state.speed * 0.0005; // Pitching

        updateHUD();
        renderer.render(scene, camera);
        requestAnimationFrame(animate);
    };

    const updateHUD = () => {
        elements.speed.innerHTML = `${Math.round(state.speed)}<span>km/h</span>`;
        elements.needleS.style.transform = `rotate(${(state.speed/config.maxSpeed)*240-120}deg)`;
        elements.needleR.style.transform = `rotate(${(state.rpm/7000)*240-120}deg)`;
        elements.wheel.style.transform = `rotate(${-state.steering * 180}deg)`;
        elements.gas.classList.toggle('active', state.isGas);
        elements.brake.classList.toggle('active', state.isBrake);
    };

    // --- Input Handling ---
    const setKeys = (k, down) => {
        const key = k.toLowerCase();
        if (key === 'w' || k === 'ArrowUp') state.isGas = down;
        if (key === 's' || k === 'ArrowDown') state.isBrake = down;
        if (key === 'a' || k === 'ArrowLeft') state.isLeft = down;
        if (key === 'd' || k === 'ArrowRight') state.isRight = down;
        if (down && !state.engineOn && ['w','a','s','d'].includes(key)) {
            assistantDesc.innerText = "START ENGINE FIRST! (Press E)";
        }
    };

    window.addEventListener('keydown', (e) => {
        setKeys(e.key, true);
        if (e.key.toLowerCase() === 'e') elements.engine.click();
    });
    window.addEventListener('keyup', (e) => setKeys(e.key, false));
    
    elements.engine.addEventListener('click', () => {
        state.engineOn = !state.engineOn;
        elements.engine.classList.toggle('on', state.engineOn);
        elements.engine.innerHTML = state.engineOn ? 'STOP' : 'START';
        state.rpm = state.engineOn ? 800 : 0;
        assistantDesc.innerText = state.engineOn ? "Engine Running. Enjoy the cruise." : "Engine Stopped.";
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
