// DriveMaster v8 - Indian Ghat Odyssey (Himalayan Edition)
// Advanced Indian Infrastructure & Procedural Local Obstacles

const startApp = () => {
    // --- Noise & Math ---
    const Noise = (() => {
        const grad3 = [[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]];
        const p = [151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180];
        const perm = new Array(512);
        for(let i=0; i<512; i++) perm[i] = p[i & 255];
        return {
            noise2D: (x, y) => {
                const s = (x+y)*0.366025, i = Math.floor(x+s), j = Math.floor(y+s), t = (i+j)*0.211324, x0 = x-(i-t), y0 = y-(j-t);
                let i1, j1; if(x0>y0) {i1=1; j1=0;} else {i1=0; j1=1;}
                const x1 = x0-i1+0.211324, y1 = y0-j1+0.211324, x2 = x0-1+2*0.211324, y2 = y0-1+2*0.211324, ii = i&255, jj = j&255;
                let t0 = 0.5-x0*x0-y0*y0, n0=0; if(t0>0){t0*=t0; n0=t0*t0*(grad3[perm[ii+perm[jj]]%12][0]*x0+grad3[perm[ii+perm[jj]]%12][1]*y0);}
                let t1 = 0.5-x1*x1-y1*y1, n1=0; if(t1>0){t1*=t1; n1=t1*t1*(grad3[perm[ii+i1+perm[jj+j1]]%12][0]*x1+grad3[perm[ii+i1+perm[jj+j1]]%12][1]*y1);}
                let t2 = 0.5-x2*x2-y2*y2, n2=0; if(t2>0){t2*=t2; n2=t2*t2*(grad3[perm[ii+1+perm[jj+1]]%12][0]*x2+grad3[perm[ii+1+perm[jj+1]]%12][1]*y2);}
                return 40 * (n0 + n1 + n2);
            }
        };
    })();

    // --- State ---
    const state = {
        engineOn: false, speed: 0, rpm: 0, posX: 0, posZ: 0, steering: 0,
        isGas: false, isBrake: false, isLeft: false, isRight: false,
        lastTime: performance.now()
    };
    const config = { roadWidth: 15, terrainSize: 500, terrainRes: 80, maxSpeed: 90, accel: 30 };

    // --- DOM ---
    const canvas = document.getElementById('road-canvas');
    const container = document.querySelector('.windshield-frame');
    const assistant = document.getElementById('lesson-desc');
    if (!THREE) return;

    // --- Scene ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xaedce6);
    scene.fog = new THREE.FogExp2(0xaedce6, 0.002);
    const camera = new THREE.PerspectiveCamera(70, container.clientWidth / container.clientHeight, 0.1, 3000);
    camera.position.set(0, 4, 0);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);

    // --- Indian Ghat Shader ---
    const ghatShader = {
        vertexShader: `
            varying vec3 vNormal;
            varying vec3 vWorldPos;
            void main() {
                vNormal = normal;
                vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            varying vec3 vNormal;
            varying vec3 vWorldPos;
            void main() {
                vec3 forest = vec3(0.1, 0.35, 0.15);
                vec3 hillRock = vec3(0.4, 0.35, 0.3);
                vec3 tarmac = vec3(0.15, 0.15, 0.15);
                vec3 yellowLine = vec3(0.95, 0.75, 0.1);
                
                float slope = 1.0 - vNormal.z;
                float noise = fract(sin(dot(vWorldPos.xz, vec2(12.9898, 78.233))) * 43758.54);
                
                vec3 finalColor = mix(forest, hillRock, clamp(slope * 3.5, 0.0, 1.0));
                
                // Indian Ghat Road
                float dist = abs(vWorldPos.x);
                if (dist < 7.5) {
                    float fade = smoothstep(6.5, 7.5, dist);
                    finalColor = mix(tarmac + noise*0.02, finalColor, fade);
                    
                    // Solid Yellow Median Line
                    if (dist < 0.25) finalColor = yellowLine;
                }
                
                gl_FragColor = vec4(finalColor * (0.85 + noise*0.05), 1.0);
            }
        `
    };

    // --- World Creation ---
    const world = new THREE.Group();
    scene.add(world);

    const createGhatTile = (offsetZ) => {
        const geo = new THREE.PlaneGeometry(config.terrainSize, config.terrainSize, config.terrainRes, config.terrainRes);
        const mat = new THREE.ShaderMaterial({ vertexShader: ghatShader.vertexShader, fragmentShader: ghatShader.fragmentShader });
        const pos = geo.attributes.position.array;
        for (let i = 0; i < pos.length; i += 3) {
            const x = pos[i], z = pos[i+1] + offsetZ;
            let h = Noise.noise2D(x * 0.004, z * 0.004) * 80;
            h += Noise.noise2D(x * 0.015, z * 0.015) * 8;
            if (Math.abs(x) < 20) h *= Math.pow(Math.abs(x)/20, 2);
            pos[i+2] = h;
        }
        geo.computeVertexNormals();
        const mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(0, 0, offsetZ);
        world.add(mesh);
        return mesh;
    };
    const tiles = [createGhatTile(0), createGhatTile(-config.terrainSize)];

    // Indian Obstacles
    const createTruck = (x, z) => {
        const truck = new THREE.Group();
        const r = (c) => new THREE.MeshStandardMaterial({ color: c });
        const body = new THREE.Mesh(new THREE.BoxGeometry(4, 3, 8), r(0xcc7722));
        body.position.y = 2.5; truck.add(body);
        const cabin = new THREE.Mesh(new THREE.BoxGeometry(4, 2, 3), r(0xaa2211));
        cabin.position.set(0, 5, 2.5); truck.add(cabin);
        const hornPlease = new THREE.Mesh(new THREE.PlaneGeometry(3, 1), new THREE.MeshBasicMaterial({ color: 0xffff00 }));
        hornPlease.position.set(0, 2.5, -4.01); hornPlease.rotation.y = Math.PI; truck.add(hornPlease);
        truck.position.set(x, 0, z); scene.add(truck);
        return truck;
    };
    const createRickshaw = (x, z) => {
        const ar = new THREE.Group();
        const top = new THREE.Mesh(new THREE.BoxGeometry(2, 2.5, 3), new THREE.MeshStandardMaterial({ color: 0xffff00 }));
        top.position.y = 1.5; ar.add(top);
        const base = new THREE.Mesh(new THREE.BoxGeometry(2, 0.5, 3), new THREE.MeshStandardMaterial({ color: 0x000000 }));
        base.position.y = 0.25; ar.add(base);
        ar.position.set(x, 0, z); scene.add(ar);
        return ar;
    };
    const createCow = (x, z) => {
        const cow = new THREE.Group();
        const main = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.2, 2.5), new THREE.MeshStandardMaterial({ color: 0xffffff }));
        main.position.y = 1.2; cow.add(main);
        cow.position.set(x, 0, z); scene.add(cow);
        return cow;
    };

    const obstacles = [];
    for(let i=0; i<15; i++) {
        const z = -Math.random()*1500;
        const x = (Math.random()-0.5)*10;
        const type = Math.random();
        if (type < 0.3) obstacles.push(createTruck(x, z));
        else if (type < 0.7) obstacles.push(createRickshaw(x, z));
        else obstacles.push(createCow(x, z));
    }

    // --- Systems ---
    const sun = new THREE.DirectionalLight(0xfff5e6, 1.5);
    sun.position.set(50, 150, 50); scene.add(sun);
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));

    const hud = {
        s: document.getElementById('speed-indicator'),
        nS: document.getElementById('speed-needle'),
        nR: document.getElementById('rpm-needle'),
        w: document.getElementById('steering-wheel'),
        e: document.getElementById('engine-btn'),
        g: document.getElementById('gas-pedal'),
        b: document.getElementById('brake-pedal')
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
                state.speed = Math.max(0, state.speed - 6 * dt);
            }
            if (state.isBrake) {
                state.speed = Math.max(0, state.speed - 120 * dt);
                state.rpm = Math.max(800, state.rpm - 5000 * dt);
            }
            const stDir = (state.isLeft ? 1 : 0) - (state.isRight ? 1 : 0);
            state.steering = THREE.MathUtils.lerp(state.steering, stDir * 0.7, dt * 4);
            state.posX += state.steering * (state.speed/7) * dt;
        } else {
            state.speed = Math.max(0, state.speed - 20 * dt);
            state.rpm = THREE.MathUtils.lerp(state.rpm, 0, dt * 8);
        }

        // World Treadmill
        state.posZ -= state.speed * 3.0 * dt;
        world.position.z = -state.posZ % config.terrainSize;
        tiles.forEach(t => {
            if (t.position.z + state.posZ > config.terrainSize) t.position.z -= tiles.length * config.terrainSize;
        });

        obstacles.forEach(obj => {
            obj.position.z += state.speed * 3.0 * dt;
            if (obj.position.z > 50) {
                obj.position.z = -1500;
                obj.position.x = (Math.random()-0.5)*12;
                const h = Noise.noise2D(obj.position.x*0.004, obj.position.z*0.004)*80;
                obj.position.y = Math.max(0, h);
            }
        });

        // Diagnostics & HUD
        camera.position.x = -state.posX;
        camera.rotation.z = state.steering * 0.12;
        camera.position.y = 4 + (state.speed/config.maxSpeed) * (Math.random()-0.5) * 0.4;

        hud.s.innerHTML = `${Math.round(state.speed)}<span>km/h</span>`;
        hud.nS.style.transform = `rotate(${(state.speed/config.maxSpeed)*240-120}deg)`;
        hud.nR.style.transform = `rotate(${(state.rpm/7000)*240-120}deg)`;
        hud.w.style.transform = `rotate(${-state.steering * 180}deg)`;
        hud.g.classList.toggle('active', state.isGas);
        hud.b.classList.toggle('active', state.isBrake);

        renderer.render(scene, camera);
        requestAnimationFrame(animate);
    };

    const setKeys = (k, d) => {
        const key = k.toLowerCase();
        if (key === 'w' || k === 'ArrowUp') state.isGas = d;
        if (key === 's' || k === 'ArrowDown') state.isBrake = d;
        if (key === 'a' || k === 'ArrowLeft') state.isLeft = d;
        if (key === 'd' || k === 'ArrowRight') state.isRight = d;
        if (d && !state.engineOn && ['w','a','s','d'].includes(key)) assistant.innerText = "START ENGINE FIRST! (Press E)";
    };

    window.addEventListener('keydown', e => {
        setKeys(e.key, true);
        if (e.key.toLowerCase()==='e') hud.e.click();
    });
    window.addEventListener('keyup', e => setKeys(e.key, false));
    hud.e.addEventListener('click', () => {
        state.engineOn = !state.engineOn;
        hud.e.innerText = state.engineOn ? 'STOP' : 'START';
        state.rpm = state.engineOn ? 800 : 0;
        assistant.innerText = state.engineOn ? "Himalayan Ghat Odyssey Active." : "Engine Off.";
    });
    window.addEventListener('resize', () => {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix(); renderer.setSize(container.clientWidth, container.clientHeight);
    });
    animate();
};

if (document.readyState === 'complete') startApp();
else window.addEventListener('load', startApp);
