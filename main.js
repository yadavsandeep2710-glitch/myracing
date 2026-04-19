const startApp = () => {
    // --- State & Config ---
    const state = {
        engineOn: false,
        speed: 0,
        rpm: 0,
        velX: 0,
        velZ: 0,
        playerOffRoadX: 0,
        steeringAngle: 0,
        isGas: false,
        isBrake: false,
        isLeft: false,
        isRight: false,
        lastTime: performance.now(),
        lessonStep: 0,
        initialized: false
    };

    const config = {
        maxSpeed: 200,
        acceleration: 60,
        braking: 150,
        friction: 5,
        steerSpeed: 4.0,
        roadWidth: 40
    };

    // Diagnostics
    console.log("DriveMaster Engine Initializing...");
    const assistantDesc = document.getElementById('lesson-desc');
    
    if (typeof THREE === 'undefined') {
        assistantDesc.innerHTML = "<span style='color: red;'>CRITICAL ERROR: 3D Engine (Three.js) failed to load. Please check your internet connection and refresh.</span>";
        return;
    }

    // --- Three.js Setup ---
    const canvas = document.getElementById('road-canvas');
    const container = document.querySelector('.windshield-frame');
    
    let scene, camera, renderer;
    try {
        scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x050505, 0.003);
        
        camera = new THREE.PerspectiveCamera(70, container.clientWidth / container.clientHeight, 0.1, 3000);
        camera.position.set(0, 4, 12);

        renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
    } catch (e) {
        assistantDesc.innerHTML = "<span style='color: red;'>WEBGL ERROR: Your browser does not support real-time 3D graphics.</span>";
        return;
    }

    // --- Environment ---
    const roadGroup = new THREE.Group();
    scene.add(roadGroup);

    const createRoadSegment = (z) => {
        const geometry = new THREE.PlaneGeometry(config.roadWidth, 100);
        const material = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.1, metalness: 0.5 });
        const road = new THREE.Mesh(geometry, material);
        road.rotation.x = -Math.PI / 2;
        road.position.z = z;
        roadGroup.add(road);
        return road;
    };

    const roadSegments = [];
    for(let i = 0; i < 20; i++) roadSegments.push(createRoadSegment(-i * 100));

    // Stars
    const starGeo = new THREE.BufferGeometry();
    const starCoords = [];
    for(let i = 0; i < 2000; i++) starCoords.push((Math.random()-0.5)*2000, Math.random()*500+100, (Math.random()-0.5)*2000);
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starCoords, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 1.5 })));

    const objectsGroup = new THREE.Group();
    scene.add(objectsGroup);

    const createWorldObject = (z) => {
        const side = Math.random() > 0.5 ? 1 : -1;
        const geo = new THREE.BoxGeometry(4, 3, 2);
        const mat = new THREE.MeshStandardMaterial({ color: 0xff3300, emissive: 0x550000 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(side * (config.roadWidth/2 + 5), 1.5, z);
        objectsGroup.add(mesh);
    };
    for(let i = 0; i < 40; i++) createWorldObject(-i * 50);

    const headlights = new THREE.SpotLight(0xffffff, 10);
    headlights.position.set(0, 2, 5);
    scene.add(headlights);
    const headTarget = new THREE.Object3D();
    scene.add(headTarget);
    headlights.target = headTarget;

    const elements = {
        speedIndicator: document.getElementById('speed-indicator'),
        speedNeedle: document.getElementById('speed-needle'),
        rpmNeedle: document.getElementById('rpm-needle'),
        engineBtn: document.getElementById('engine-btn'),
        wheel: document.getElementById('steering-wheel'),
        gasPedal: document.getElementById('gas-pedal'),
        brakePedal: document.getElementById('brake-pedal'),
        assistant: document.getElementById('assistant')
    };

    const animate = () => {
        const time = performance.now();
        const dt = Math.min(0.1, (time - state.lastTime) / 1000);
        state.lastTime = time;

        if (state.engineOn) {
            if (state.isGas) {
                state.rpm = THREE.MathUtils.lerp(state.rpm, 7000, dt * 1.5);
                state.speed = Math.min(config.maxSpeed, state.speed + config.acceleration * (state.rpm/7000) * dt);
            } else {
                state.rpm = THREE.MathUtils.lerp(state.rpm, 800, dt * 2);
                state.speed = Math.max(0, state.speed - config.friction * dt);
            }
            if (state.isBrake) {
                state.speed = Math.max(0, state.speed - config.braking * dt);
                state.rpm = Math.max(800, state.rpm - 4000 * dt);
            }
            const steerDir = (state.isLeft ? 1 : 0) - (state.isRight ? 1 : 0);
            state.steeringAngle = THREE.MathUtils.lerp(state.steeringAngle, steerDir * 0.6, dt * config.steerSpeed);
            state.playerOffRoadX += state.steeringAngle * (state.speed / 10) * dt;
        } else {
            state.speed = Math.max(0, state.speed - 30 * dt);
            state.rpm = Math.max(0, state.rpm - 5000 * dt);
        }

        roadSegments.forEach(seg => {
            seg.position.z += state.speed * 2 * dt;
            if (seg.position.z > 100) seg.position.z -= roadSegments.length * 100;
        });

        objectsGroup.children.forEach(obj => {
            obj.position.z += state.speed * 2 * dt;
            if (obj.position.z > 100) {
                obj.position.z = -1500;
                obj.position.x = (Math.random() > 0.5 ? 1 : -1) * (config.roadWidth / 2 + 5);
            }
        });

        camera.position.x = -state.playerOffRoadX;
        camera.rotation.y = -state.steeringAngle * 0.1;
        camera.rotation.z = state.steeringAngle * 0.05;
        headTarget.position.set(camera.position.x, 0, camera.position.z - 100);

        elements.speedIndicator.innerHTML = `${Math.round(state.speed)}<span>km/h</span>`;
        elements.speedNeedle.style.transform = `rotate(${(state.speed/config.maxSpeed)*240-120}deg)`;
        elements.rpmNeedle.style.transform = `rotate(${(state.rpm/7000)*240-120}deg)`;
        elements.wheel.style.transform = `rotate(${-state.steeringAngle * 180}deg)`;
        
        elements.gasPedal.classList.toggle('active', state.isGas);
        elements.brakePedal.classList.toggle('active', state.isBrake);

        renderer.render(scene, camera);
        requestAnimationFrame(animate);
    };

    const handleKey = (key, isDown) => {
        const k = (key || "").toLowerCase();
        if (k === 'w' || key === 'ArrowUp') state.isGas = isDown;
        if (k === 's' || key === 'ArrowDown') state.isBrake = isDown;
        if (k === 'a' || key === 'ArrowLeft') state.isLeft = isDown;
        if (k === 'd' || key === 'ArrowRight') state.isRight = isDown;
        if (isDown && !state.engineOn && (k === 'w' || k === 'a' || k === 's' || k === 'd')) {
            assistantDesc.innerHTML = "<span style='color: #ff3300; font-weight: 800;'>START ENGINE FIRST! (Press E)</span>";
        }
    };

    window.addEventListener('keydown', (e) => {
        handleKey(e.key, true);
        if (e.key && e.key.toLowerCase() === 'e') elements.engineBtn.click();
    });
    window.addEventListener('keyup', (e) => handleKey(e.key, false));
    
    elements.engineBtn.addEventListener('click', () => {
        state.engineOn = !state.engineOn;
        elements.engineBtn.classList.toggle('on', state.engineOn);
        elements.engineBtn.innerHTML = state.engineOn ? 'STOP' : 'START';
        state.rpm = state.engineOn ? 800 : 0;
        if (state.engineOn) assistantDesc.innerText = "Engine Running. Use WASD to Drive.";
    });

    window.addEventListener('resize', () => {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });

    animate();
};

if (document.readyState === 'complete') {
    startApp();
} else {
    window.addEventListener('load', startApp);
}
