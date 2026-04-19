// DriveMaster v10 - THE PERFECTIONIST EDITION
// Absolute Realism Engines & Elite Asset Fabrication

const startApp = () => {
    // --- Advanced Noise Utility ---
    const Noise = (() => {
        const grad3 = [[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]];
        const p = [151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180];
        const perm = new Array(512);
        for(let i=0; i<512; i++) perm[i] = p[i & 255];
        return {
            noise2D: (x, y) => {
                const s = (x+y)*0.366, i = Math.floor(x+s), j = Math.floor(y+s), t = (i+j)*0.211, x0 = x-(i-t), y0 = y-(j-t);
                let i1, j1; if(x0>y0) {i1=1; j1=0;} else {i1=0; j1=1;}
                const x1 = x0-i1+0.211, y1 = y0-j1+0.211, x2 = x0-1+2*0.211, y2 = y0-1+2*0.211, ii = i&255, jj = j&255;
                let t0 = 0.5-x0*x0-y0*y0, n0=0; if(t0>0){t0*=t0; n0=t0*t0*(grad3[perm[ii+perm[jj]]%12][0]*x0+grad3[perm[ii+perm[jj]]%12][1]*y0);}
                let t1 = 0.5-x1*x1-y1*y1, n1=0; if(t1>0){t1*=t1; n1=t1*t1*(grad3[perm[ii+i1+perm[jj+j1]]%12][0]*x1+grad3[perm[ii+i1+perm[jj+j1]]%12][1]*y1);}
                let t2 = 0.5-x2*x2-y2*y2, n2=0; if(t2>0){t2*=t2; n2=t2*t2*(grad3[perm[ii+1+perm[jj+1]]%12][0]*x2+grad3[perm[ii+1+perm[jj+1]]%12][1]*y2);}
                return 40 * (n0 + n1 + n2);
            }
        };
    })();

    // --- Core State ---
    const state = {
        engineOn: false, speed: 0, rpm: 0, posX: 0, posZ: 0, steering: 0,
        isGas: false, isBrake: false, isLeft: false, isRight: false,
        lastTime: performance.now(),
        taskIndex: 0,
        tasks: [
            "Initiate Ignition Sequence (Press E)",
            "Ascend to 40 km/h (Hold Thrust)",
            "Navigate the Hairpin Bends",
            "Final Stop Procedure (Hold Brake)"
        ]
    };
    const config = { terrainSize: 500, terrainRes: 80, maxSpeed: 110, accel: 35 };

    // --- DOM Elements ---
    const canvas = document.getElementById('road-canvas');
    const container = document.querySelector('.simulator-frame');
    const taskEl = document.getElementById('current-task');
    const progressEl = document.getElementById('task-progress');
    const instructor = document.getElementById('lesson-desc');
    const digiSpeed = document.getElementById('digital-speed');
    if (!THREE) return;

    // --- Scene Setup: Sunset Mood ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    scene.fog = new THREE.FogExp2(0x1a0a05, 0.0018); // Sunset Haze

    const camera = new THREE.PerspectiveCamera(72, container.clientWidth / container.clientHeight, 0.1, 4000);
    camera.position.set(0, 4.5, 0);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.toneMapping = THREE.ReinhardToneMapping;

    // --- Perfection Shaders ---
    const eliteShader = {
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
            
            float random(vec2 st) {
                return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.54);
            }
            
            void main() {
                vec3 forest = vec3(0.05, 0.15, 0.05);
                vec3 hillRock = vec3(0.25, 0.2, 0.15);
                vec3 tarmac = vec3(0.1, 0.1, 0.1);
                vec3 median = vec3(0.9, 0.7, 0.1);
                vec3 glow = vec3(1.0, 0.5, 0.1); // Sunset Glow
                
                float slope = 1.0 - vNormal.z;
                float noise = random(vWorldPos.xz * 100.0);
                
                vec3 finalColor = mix(forest, hillRock, clamp(slope * 4.0, 0.0, 1.0));
                
                // Real Asphalt Integration
                float dist = abs(vWorldPos.x);
                if (dist < 8.0) {
                    float fade = smoothstep(7.0, 8.0, dist);
                    float aggregate = random(vWorldPos.xz * 200.0) * 0.1;
                    finalColor = mix(tarmac + aggregate, finalColor, fade);
                    
                    // Central Median Line (Elite Detail)
                    if (dist < 0.22) finalColor = mix(median, tarmac, random(vWorldPos.xz)*0.1);
                }
                
                // Add Sunset Warmth
                float atmosphere = clamp(vWorldPos.y * 0.02, 0.0, 1.0);
                finalColor = mix(finalColor, glow, atmosphere * 0.3);
                
                gl_FragColor = vec4(finalColor * (0.9 + noise * 0.1), 1.0);
            }
        `
    };

    // --- World & Foliage ---
    const worldGroup = new THREE.Group();
    scene.add(worldGroup);

    const createEliteTile = (oz) => {
        const geo = new THREE.PlaneGeometry(config.terrainSize, config.terrainSize, config.terrainRes, config.terrainRes);
        const mat = new THREE.ShaderMaterial({ vertexShader: eliteShader.vertexShader, fragmentShader: eliteShader.fragmentShader });
        const pos = geo.attributes.position.array;
        for (let i = 0; i < pos.length; i += 3) {
            const x = pos[i], z = pos[i+1] + oz;
            let h = Noise.noise2D(x * 0.004, z * 0.004) * 90;
            h += Noise.noise2D(x * 0.02, z * 0.02) * 5;
            if (Math.abs(x) < 22) h *= Math.pow(Math.abs(x)/22, 2);
            pos[i+2] = h;
        }
        geo.computeVertexNormals();
        const t = new THREE.Mesh(geo, mat); t.rotation.x = -Math.PI/2; t.position.set(0,0,oz);
        worldGroup.add(t); return t;
    };
    const tiles = [createEliteTile(0), createEliteTile(-config.terrainSize)];

    // Scenery: High-Detail Trees & Rocks
    const createPine = (x, z) => {
        const tree = new THREE.Group();
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 4), new THREE.MeshStandardMaterial({color: 0x221100}));
        trunk.position.y = 2; tree.add(trunk);
        for(let i=0; i<3; i++) {
            const c = new THREE.Mesh(new THREE.ConeGeometry(2-i*0.5, 3, 8), new THREE.MeshStandardMaterial({color: 0x0a1a05}));
            c.position.y = 4 + i*2; tree.add(c);
        }
        tree.position.set(x, 0, z); scene.add(tree); return tree;
    };
    const trees = [];
    for(let i=0; i<40; i++) trees.push(createPine((Math.random()>0.5?1:-1)*(25+Math.random()*40), -Math.random()*1500));

    // --- Elite Vehicle Assets ---
    const createEliteTruck = (x, z) => {
        const truck = new THREE.Group();
        const m = (c) => new THREE.MeshStandardMaterial({color: c, metalness: 0.5, roughness: 0.2});
        const cabin = new THREE.Mesh(new THREE.BoxGeometry(4, 3, 3.5), m(0xcc6611)); cabin.position.set(0, 3, 2.5); truck.add(cabin);
        const bed = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.8, 8), m(0x222222)); bed.position.y = 1.3; truck.add(bed);
        const cargo = new THREE.Mesh(new THREE.BoxGeometry(4, 3.5, 6), m(0x0044aa)); cargo.position.set(0, 3.2, -1.5); truck.add(cargo);
        // Lights & Wheels
        const light = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.4, 0.1), new THREE.MeshBasicMaterial({color: 0xffeeaa}));
        const L1 = light.clone(); L1.position.set(1.5, 2.2, 4.3); truck.add(L1);
        const L2 = light.clone(); L2.position.set(-1.5, 2.2, 4.3); truck.add(L2);
        truck.position.set(x, 0, z); scene.add(truck); return truck;
    };
    const createEliteRickshaw = (x, z) => {
        const ar = new THREE.Group();
        const body = new THREE.Mesh(new THREE.BoxGeometry(2, 2.5, 4), new THREE.MeshStandardMaterial({color: 0xffff00})); body.position.y = 1.5; ar.add(body);
        const frame = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.2, 4.1), new THREE.MeshStandardMaterial({color: 0x000000})); frame.position.y = 3; ar.add(frame);
        ar.position.set(x, 0, z); scene.add(ar); return ar;
    };
    const obstacles = [];
    for(let i=0; i<15; i++) {
        const x = (Math.random()-0.5)*12, z = -Math.random()*2000;
        obstacles.push(Math.random()>0.4 ? createEliteRickshaw(x, z) : createEliteTruck(x, z));
    }

    // --- Lighting: The Sun Set ---
    const sun = new THREE.DirectionalLight(0xffaa66, 2.0); sun.position.set(100, 50, -100); scene.add(sun);
    const ambient = new THREE.AmbientLight(0xffddaa, 0.6); scene.add(ambient);

    // --- Interaction System ---
    const hud = {
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
                state.rpm = THREE.MathUtils.lerp(state.rpm, 6500, dt*1.2);
                state.speed = Math.min(config.maxSpeed, state.speed + config.accel * (state.rpm/6500) * dt);
            } else {
                state.rpm = THREE.MathUtils.lerp(state.rpm, 800, dt);
                state.speed = Math.max(0, state.speed - 6 * dt);
            }
            if (state.isBrake) {
                state.speed = Math.max(0, state.speed - 140 * dt);
                state.rpm = Math.max(800, state.rpm - 6000 * dt);
            }
            const stDir = (state.isLeft ? 1 : 0) - (state.isRight ? 1 : 0);
            state.steering = THREE.MathUtils.lerp(state.steering, stDir * 0.75, dt * 5);
            state.posX += state.steering * (state.speed/7) * dt;

            // Perfection Mission System
            if (state.taskIndex === 0 && state.engineOn) completeTask(1);
            if (state.taskIndex === 1 && state.speed > 50) completeTask(2);
            if (state.taskIndex === 2 && state.posZ < -1200) completeTask(3);
            if (state.taskIndex === 3 && state.speed === 0) completeTask(4);
        } else {
            state.speed = Math.max(0, state.speed - 25 * dt);
            state.rpm = THREE.MathUtils.lerp(state.rpm, 0, dt * 8);
        }

        // Motion & Scenery Treadmill
        state.posZ -= state.speed * 3.2 * dt;
        worldGroup.position.z = -state.posZ % config.terrainSize;
        tiles.forEach(t => { if (t.position.z + state.posZ > config.terrainSize) t.position.z -= 1000; });
        
        trees.forEach(t => {
            t.position.z += state.speed * 3.2 * dt;
            if (t.position.z > 100) {
                t.position.z = -1800;
                const h = Noise.noise2D(t.position.x*0.004, t.position.z*0.004)*90;
                t.position.y = Math.max(0, h);
            }
        });

        obstacles.forEach(obj => {
            obj.position.z += state.speed * 3.2 * dt;
            if (obj.position.z > 50) {
                obj.position.z = -2000; obj.position.x = (Math.random()-0.5)*13;
                const h = Noise.noise2D(obj.position.x*0.004, obj.position.z*0.004)*90;
                obj.position.y = Math.max(0, h);
            }
        });

        // Cinematic Camera Dynamics
        camera.position.x = -state.posX;
        camera.rotation.z = state.steering * 0.15;
        camera.fov = 72 + (state.speed/config.maxSpeed) * 15; camera.updateProjectionMatrix();
        camera.position.y = 4.5 + (state.speed/100) * (Math.random()-0.5) * 0.4;

        updateHUD();
        renderer.render(scene, camera);
        requestAnimationFrame(animate);
    };

    const completeTask = (idx) => {
        state.taskIndex = idx;
        if (state.tasks[idx]) {
            taskEl.innerText = state.tasks[idx];
            progressEl.style.width = (idx/state.tasks.length)*100 + "%";
            instructor.innerText = "Excellent. Proceed to: " + state.tasks[idx];
        } else {
            taskEl.innerText = "COURSE COMPLETED";
            progressEl.style.width = "100%";
            instructor.innerText = "Congratulations! You have mastered the Himalayan Ghat Odyssey.";
        }
    };

    const updateHUD = () => {
        digiSpeed.innerText = Math.round(state.speed);
        hud.nS.style.transform = `rotate(${(state.speed/config.maxSpeed)*240-120}deg)`;
        hud.nR.style.transform = `rotate(${(state.rpm/7000)*240-120}deg)`;
        hud.w.style.transform = `rotate(${-state.steering * 190}deg)`;
        hud.g.classList.toggle('active', state.isGas);
        hud.b.classList.toggle('active', state.isBrake);
    };

    const setKeys = (k, d) => {
        const key = k.toLowerCase();
        if (key === 'w' || k === 'ArrowUp') state.isGas = d;
        if (key === 's' || k === 'ArrowDown') state.isBrake = d;
        if (key === 'a' || k === 'ArrowLeft') state.isLeft = d;
        if (key === 'd' || k === 'ArrowRight') state.isRight = d;
    };

    window.addEventListener('keydown', e => {
        setKeys(e.key, true);
        if (e.key.toLowerCase()==='e') hud.e.click();
    });
    window.addEventListener('keyup', e => setKeys(e.key, false));
    hud.e.addEventListener('click', () => {
        state.engineOn = !state.engineOn;
        hud.e.classList.toggle('on', state.engineOn);
        hud.e.innerText = state.engineOn ? 'STOP' : 'IGNITION';
        state.rpm = state.engineOn ? 800 : 0;
    });
    window.addEventListener('resize', () => {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix(); renderer.setSize(container.clientWidth, container.clientHeight);
    });
    animate();
};

if (document.readyState === 'complete') startApp();
else window.addEventListener('load', startApp);
