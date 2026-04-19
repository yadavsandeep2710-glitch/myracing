// DriveMaster v9 - The Full Platform (PRO Edition)
// High-Fidelity Multi-Part Models & Daily Challenge Logic

const startApp = () => {
    // --- Utilities ---
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

    // --- State ---
    const state = {
        engineOn: false, speed: 0, rpm: 0, posX: 0, posZ: 0, steering: 0,
        isGas: false, isBrake: false, isLeft: false, isRight: false,
        lastTime: performance.now(),
        taskIndex: 0,
        tasks: [
            "1. Start the engine (Press E)",
            "2. Accelerate to 40 km/h (Hold W)",
            "3. Steer around the rickshaws (A/D)",
            "4. Brake safely to stop (Hold S)"
        ]
    };
    const config = { roadWidth: 15, terrainSize: 500, maxSpeed: 100, accel: 32 };

    // --- DOM ---
    const canvas = document.getElementById('road-canvas');
    const container = document.querySelector('.windshield-frame');
    const taskEl = document.getElementById('current-task');
    const assistant = document.getElementById('lesson-desc');
    if (!THREE) return;

    // --- Scene & Camera ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xaedce6);
    scene.fog = new THREE.FogExp2(0xaedce6, 0.002);
    const camera = new THREE.PerspectiveCamera(70, container.clientWidth / container.clientHeight, 0.1, 3000);
    camera.position.set(0, 4, 0);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);

    // --- High-Fidelity Multi-Part Models ---
    const mat = (c, m=0.3, r=0.7) => new THREE.MeshStandardMaterial({ color: c, metalness: m, roughness: r });
    const wheelGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.4, 12);
    
    const createWheel = (x, y, z) => {
        const w = new THREE.Mesh(wheelGeo, mat(0x111111));
        w.rotation.z = Math.PI / 2; w.position.set(x, y, z); return w;
    };

    const createProTruck = (x, z) => {
        const truck = new THREE.Group();
        // Body & Bed
        const bed = new THREE.Mesh(new THREE.BoxGeometry(4, 0.5, 8), mat(0x222222));
        bed.position.y = 1.2; truck.add(bed);
        const cabin = new THREE.Mesh(new THREE.BoxGeometry(4, 2.5, 3), mat(0xcc7722));
        cabin.position.set(0, 2.5, 2.5); truck.add(cabin);
        const cargo = new THREE.Mesh(new THREE.BoxGeometry(3.8, 3, 4.5), mat(0x114488));
        cargo.position.set(0, 2.8, -1.5); truck.add(cargo);
        // Windows
        const window = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 1.2), mat(0xaaccff, 1, 0));
        window.position.set(0, 3, 3.8); truck.add(window);
        // 6 Wheels
        truck.add(createWheel(1.8, 0.6, 3)); truck.add(createWheel(-1.8, 0.6, 3)); 
        truck.add(createWheel(1.8, 0.6, 0)); truck.add(createWheel(-1.8, 0.6, 0));
        truck.add(createWheel(1.8, 0.6, -3)); truck.add(createWheel(-1.8, 0.6, -3));
        
        truck.position.set(x, 0, z); scene.add(truck); return truck;
    };

    const createProRickshaw = (x, z) => {
        const ar = new THREE.Group();
        const base = new THREE.Mesh(new THREE.BoxGeometry(2, 0.4, 3.5), mat(0x111111));
        base.position.y = 0.5; ar.add(base);
        const cabin = new THREE.Mesh(new THREE.BoxGeometry(2, 2.5, 2), mat(0xffff00));
        cabin.position.set(0, 2, 0.5); ar.add(cabin);
        const roof = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.2, 3), mat(0x000000));
        roof.position.set(0, 3.25, 0.2); ar.add(roof);
        // Interior (Handlebar)
        const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.8), mat(0x222222));
        handle.rotation.z = Math.PI/2; handle.position.set(0, 1.8, 1.4); ar.add(handle);
        // 3 Wheels
        ar.add(createWheel(0, 0.4, 1.8)); ar.add(createWheel(1, 0.4, -1)); ar.add(createWheel(-1, 0.4, -1));

        ar.position.set(x, 0, z); scene.add(ar); return ar;
    };

    const createProCar = (x, z) => {
        const car = new THREE.Group();
        const body = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1, 6), mat(0xaa2211));
        body.position.y = 1; car.add(body);
        const top = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.2, 3), mat(0xaa2211));
        top.position.set(0, 2, -0.5); car.add(top);
        car.add(createWheel(1.2, 0.6, 2)); car.add(createWheel(-1.2, 0.6, 2));
        car.add(createWheel(1.2, 0.6, -2)); car.add(createWheel(-1.2, 0.6, -2));
        car.position.set(x, 0, z); scene.add(car); return car;
    };

    // --- World & Objects ---
    const worldGroup = new THREE.Group(); scene.add(worldGroup);
    const tiles = [];
    const createTile = (oz) => {
        const g = new THREE.PlaneGeometry(500, 500, 60, 60);
        const m = new THREE.MeshStandardMaterial({ color: 0x44aa44, roughness: 0.9 });
        const p = g.attributes.position.array;
        for (let i=0; i<p.length; i+=3) {
            let h = Noise.noise2D(p[i]*0.005, (p[i+1]+oz)*0.005)*60;
            if (Math.abs(p[i]) < 20) h *= Math.pow(Math.abs(p[i])/20, 2);
            p[i+2] = h;
        }
        g.computeVertexNormals();
        const t = new THREE.Mesh(g, m); t.rotation.x = -Math.PI/2; t.position.set(0,0,oz);
        worldGroup.add(t); return t;
    };
    tiles.push(createTile(0), createTile(-500));

    const obstacles = [];
    for(let i=0; i<30; i++) {
        const z = -Math.random()*1500, x = (Math.random()-0.5)*12, r = Math.random();
        if (r < 0.2) obstacles.push(createProTruck(x, z));
        else if (r < 0.8) obstacles.push(createProRickshaw(x, z));
        else obstacles.push(createProCar(x + (Math.random()*10), z));
    }

    // --- Lighting ---
    const sun = new THREE.DirectionalLight(0xfff5e6, 1.2); sun.position.set(50, 200, 50); scene.add(sun);
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));

    // --- Loop & Task Logic ---
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
                state.rpm = THREE.MathUtils.lerp(state.rpm, 6500, dt*1.5);
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
            state.posX += state.steering * (state.speed/8) * dt;

            // Task Completion System
            if (state.taskIndex === 0 && state.engineOn) updateTask(1);
            if (state.taskIndex === 1 && state.speed > 40) updateTask(2);
            if (state.taskIndex === 2 && state.posZ < -800) updateTask(3);
            if (state.taskIndex === 3 && state.speed === 0) updateTask(4);
        } else {
            state.speed = Math.max(0, state.speed - 20 * dt);
            state.rpm = THREE.MathUtils.lerp(state.rpm, 0, dt * 8);
        }

        // World Motion
        state.posZ -= state.speed * 3.0 * dt;
        worldGroup.position.z = -state.posZ % 500;
        tiles.forEach(t => { if (t.position.z + state.posZ > 500) t.position.z -= 1000; });

        obstacles.forEach(obj => {
            obj.position.z += state.speed * 3.0 * dt;
            if (obj.position.z > 50) {
                obj.position.z = -1500; obj.position.x = (Math.random()-0.5)*12;
                const h = Noise.noise2D(obj.position.x*0.005, obj.position.z*0.005)*60;
                obj.position.y = Math.max(0, h);
                // Rotate Wheels
                obj.children.forEach(c => { if (c.geometry.type === 'CylinderGeometry') c.rotation.x += state.speed * 0.1; });
            }
        });

        camera.position.x = -state.posX;
        camera.rotation.z = state.steering * 0.1;
        camera.position.y = 4 + (state.speed/100) * (Math.random()-0.5) * 0.3;

        renderHUD();
        renderer.render(scene, camera);
        requestAnimationFrame(animate);
    };

    const updateTask = (idx) => {
        state.taskIndex = idx;
        if (state.tasks[idx]) {
            taskEl.innerText = state.tasks[idx];
            assistant.innerText = "Good job! Now " + state.tasks[idx].split('.')[1];
        } else {
            taskEl.innerText = "COURSE COMPLETE!";
            assistant.innerText = "Congratulations! You are a Pro Indian Driver.";
        }
    };

    const renderHUD = () => {
        hud.s.innerHTML = `${Math.round(state.speed)}<span>km/h</span>`;
        hud.nS.style.transform = `rotate(${(state.speed/100)*240-120}deg)`;
        hud.nR.style.transform = `rotate(${(state.rpm/7000)*240-120}deg)`;
        hud.w.style.transform = `rotate(${-state.steering * 180}deg)`;
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
        hud.e.innerText = state.engineOn ? 'STOP' : 'START';
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
