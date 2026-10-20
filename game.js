// Squid Game: Red Light, Green Light - Advanced 3D Engine
(function () {
    'use strict';

    // Game Configuration
    const CONFIG = {
        arenaWidth: 96,
        arenaLength: 350,
        startLineZ: 155,
        finishLineZ: -145,
        dollZ: -168,
        totalGameTime: 60,
        initialAliveCount: 456,
        prizePerPlayer: 100000000, // 100 Million won
        playerWalkSpeed: 20,
        playerSprintSpeed: 35,
        npcCount: 36
    };

    // Game State
    const STATE = {
        status: 'MENU', // MENU, PLAYING, GAME_OVER, VICTORY
        light: 'GREEN', // GREEN, TURNING_RED, RED
        timeLeft: CONFIG.totalGameTime,
        aliveCount: CONFIG.initialAliveCount,
        prizePool: 0,
        distanceTraveled: 0,
        stamina: 100, // 0 - 100%
        cameraMode: 'THIRD_PERSON',
        isMuted: false,
        headAngle: Math.PI,
        targetHeadAngle: Math.PI,
        roundCount: 0,
        cameraShake: 0
    };

    const keys = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        sprint: false
    };

    let scene, camera, renderer, clock;
    let player, doll, tree, guards = [], npcs = [], sniperTowers = [];
    let bloodDecals = [], dustParticles = [], floatingBills = [];
    let tracerBeams = [];
    let piggyBankMesh;

    // DOM References
    const dom = {
        timerVal: document.getElementById('timer-val'),
        timerCard: document.getElementById('timer-card'),
        aliveVal: document.getElementById('alive-val'),
        prizeVal: document.getElementById('prize-val'),
        statusPill: document.getElementById('status-pill'),
        statusText: document.getElementById('status-text'),
        dollSubtext: document.getElementById('doll-subtext'),
        progressFill: document.getElementById('progress-fill'),
        progressLabel: document.getElementById('progress-label'),
        staminaFill: document.getElementById('stamina-fill'),
        cinematicOverlay: document.getElementById('cinematic-overlay'),
        menuModal: document.getElementById('menu-modal'),
        gameOverModal: document.getElementById('game-over-modal'),
        victoryModal: document.getElementById('victory-modal'),
        startBtn: document.getElementById('start-btn'),
        retryBtn: document.getElementById('retry-btn'),
        playAgainBtn: document.getElementById('play-again-btn'),
        muteBtn: document.getElementById('mute-btn'),
        camBtn: document.getElementById('cam-btn'),
        touchStick: document.getElementById('touch-stick'),
        touchThumb: document.getElementById('touch-thumb')
    };

    // Initialize 3D Engine
    function init() {
        const container = document.getElementById('canvas-container');
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xdce7f0);
        scene.fog = new THREE.FogExp2(0xdce7f0, 0.0032);

        camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);

        renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.15;
        container.appendChild(renderer.domElement);

        clock = new THREE.Clock();

        setupLighting();
        buildArena();
        buildSniperTowers();
        buildDollAndTree();
        buildGuards();
        buildVIPBox();
        buildPlayer();
        spawnNPCs();
        setupDustSystem();

        window.addEventListener('resize', onResize);
        setupControls();
        updateHUD();

        // Start Squid Game Theme music in menu
        window.soundEngine.startPinkSoldiersBGM();
    }

    // Lighting setup
    function setupLighting() {
        const hemiLight = new THREE.HemisphereLight(0xfff7e6, 0x8d99ae, 0.75);
        scene.add(hemiLight);

        const sunLight = new THREE.DirectionalLight(0xfff4db, 1.45);
        sunLight.position.set(70, 120, 90);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        sunLight.shadow.camera.near = 10;
        sunLight.shadow.camera.far = 450;
        sunLight.shadow.camera.left = -CONFIG.arenaWidth;
        sunLight.shadow.camera.right = CONFIG.arenaWidth;
        sunLight.shadow.camera.top = CONFIG.arenaLength / 2;
        sunLight.shadow.camera.bottom = -CONFIG.arenaLength / 2;
        sunLight.shadow.bias = -0.0004;
        scene.add(sunLight);

        // Doll dramatic spotlight
        const dollSpot = new THREE.SpotLight(0xffffff, 2.0, 150, Math.PI / 4, 0.35);
        dollSpot.position.set(0, 40, CONFIG.dollZ + 30);
        dollSpot.target.position.set(0, 8, CONFIG.dollZ);
        scene.add(dollSpot);
        scene.add(dollSpot.target);
    }

    // Arena Floor with Authentic Squid Game Markings
    function buildArena() {
        // Sand Canvas Texture
        const groundCanvas = document.createElement('canvas');
        groundCanvas.width = 1024;
        groundCanvas.height = 1024;
        const ctx = groundCanvas.getContext('2d');
        ctx.fillStyle = '#dcbd8a';
        ctx.fillRect(0, 0, 1024, 1024);

        // Sand grain variation
        for (let i = 0; i < 40000; i++) {
            ctx.fillStyle = Math.random() > 0.5 ? '#cfad77' : '#ebd19f';
            ctx.fillRect(Math.random() * 1024, Math.random() * 1024, 2, 2);
        }

        // Draw Squid Game Court Layout on Sand (Circle, Triangle, Square)
        ctx.lineWidth = 14;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';

        // Top Circle
        ctx.beginPath();
        ctx.arc(512, 280, 140, 0, Math.PI * 2);
        ctx.stroke();

        // Middle Triangle
        ctx.beginPath();
        ctx.moveTo(512, 420);
        ctx.lineTo(260, 680);
        ctx.lineTo(764, 680);
        ctx.closePath();
        ctx.stroke();

        // Bottom Square
        ctx.beginPath();
        ctx.rect(340, 700, 344, 220);
        ctx.stroke();

        const groundTex = new THREE.CanvasTexture(groundCanvas);
        groundTex.wrapS = THREE.RepeatWrapping;
        groundTex.wrapT = THREE.RepeatWrapping;
        groundTex.repeat.set(6, 18);

        const groundGeo = new THREE.PlaneGeometry(CONFIG.arenaWidth, CONFIG.arenaLength);
        const groundMat = new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.92, metalness: 0.05 });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        scene.add(ground);

        // Start Line with Korean Text
        const startLineGeo = new THREE.PlaneGeometry(CONFIG.arenaWidth, 3.5);
        const startLineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const startLine = new THREE.Mesh(startLineGeo, startLineMat);
        startLine.rotation.x = -Math.PI / 2;
        startLine.position.set(0, 0.03, CONFIG.startLineZ);
        scene.add(startLine);

        // Finish Line (Red & White Tape)
        const finishLineGeo = new THREE.PlaneGeometry(CONFIG.arenaWidth, 4.5);
        const finishLineMat = new THREE.MeshBasicMaterial({ color: 0xff2a70 });
        const finishLine = new THREE.Mesh(finishLineGeo, finishLineMat);
        finishLine.rotation.x = -Math.PI / 2;
        finishLine.position.set(0, 0.04, CONFIG.finishLineZ);
        scene.add(finishLine);

        // Tall Pastel Orange Walls with Clouds
        const wallMat = new THREE.MeshStandardMaterial({ color: 0xf39c6b, roughness: 0.65 });
        const wallH = 32;

        // Left, Right, Front, Back Walls
        const leftWall = new THREE.Mesh(new THREE.BoxGeometry(2, wallH, CONFIG.arenaLength), wallMat);
        leftWall.position.set(-CONFIG.arenaWidth / 2 - 1, wallH / 2, 0);
        leftWall.castShadow = true;
        leftWall.receiveShadow = true;
        scene.add(leftWall);

        const rightWall = new THREE.Mesh(new THREE.BoxGeometry(2, wallH, CONFIG.arenaLength), wallMat);
        rightWall.position.set(CONFIG.arenaWidth / 2 + 1, wallH / 2, 0);
        rightWall.castShadow = true;
        rightWall.receiveShadow = true;
        scene.add(rightWall);

        const frontWall = new THREE.Mesh(new THREE.BoxGeometry(CONFIG.arenaWidth + 4, wallH, 2), wallMat);
        frontWall.position.set(0, wallH / 2, -CONFIG.arenaLength / 2 - 1);
        frontWall.receiveShadow = true;
        scene.add(frontWall);

        const backWall = new THREE.Mesh(new THREE.BoxGeometry(CONFIG.arenaWidth + 4, wallH, 2), wallMat);
        backWall.position.set(0, wallH / 2, CONFIG.arenaLength / 2 + 1);
        backWall.receiveShadow = true;
        scene.add(backWall);

        // Giant Golden Transparent Piggy Bank suspended overhead
        const bankGeo = new THREE.SphereGeometry(11, 32, 32);
        bankGeo.scale(1.25, 0.95, 0.95);
        const bankMat = new THREE.MeshPhysicalMaterial({
            color: 0xffd700,
            metalness: 0.7,
            roughness: 0.15,
            transmission: 0.6,
            thickness: 2.0,
            transparent: true,
            opacity: 0.85
        });
        piggyBankMesh = new THREE.Mesh(bankGeo, bankMat);
        piggyBankMesh.position.set(0, 42, 0);
        scene.add(piggyBankMesh);

        // Support Cables
        const cableGeo = new THREE.CylinderGeometry(0.12, 0.12, 35);
        const cableMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
        [-9, 9].forEach(x => {
            const cable = new THREE.Mesh(cableGeo, cableMat);
            cable.position.set(x, 52, 0);
            scene.add(cable);
        });
    }

    // Four Sniper Scaffolding Towers in Arena Corners
    function buildSniperTowers() {
        sniperTowers = [];
        const towerPositions = [
            { x: -CONFIG.arenaWidth / 2 + 6, z: -CONFIG.arenaLength / 2 + 14 },
            { x: CONFIG.arenaWidth / 2 - 6, z: -CONFIG.arenaLength / 2 + 14 },
            { x: -CONFIG.arenaWidth / 2 + 6, z: CONFIG.arenaLength / 2 - 14 },
            { x: CONFIG.arenaWidth / 2 - 6, z: CONFIG.arenaLength / 2 - 14 }
        ];

        const steelMat = new THREE.MeshStandardMaterial({ color: 0x2a313d, metalness: 0.85, roughness: 0.3 });
        const pinkMat = new THREE.MeshStandardMaterial({ color: 0xff1464, roughness: 0.5 });
        const blackMat = new THREE.MeshStandardMaterial({ color: 0x111111 });

        towerPositions.forEach(pos => {
            const tower = new THREE.Group();
            tower.position.set(pos.x, 0, pos.z);

            // 4 vertical steel pillars
            [-3, 3].forEach(tx => {
                [-3, 3].forEach(tz => {
                    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 30, 8), steelMat);
                    pillar.position.set(tx, 15, tz);
                    pillar.castShadow = true;
                    tower.add(pillar);
                });
            });

            // Platform deck
            const deck = new THREE.Mesh(new THREE.BoxGeometry(8, 0.8, 8), steelMat);
            deck.position.y = 29.5;
            deck.castShadow = true;
            tower.add(deck);

            // Railings
            const rail = new THREE.Mesh(new THREE.BoxGeometry(8.2, 2.2, 8.2), steelMat);
            rail.position.y = 31;
            tower.add(rail);

            // Sniper Guard (Circle/Triangle) atop tower
            const guard = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, 3.8, 8), pinkMat);
            guard.position.set(0, 32, 0);
            tower.add(guard);

            const guardHead = new THREE.Mesh(new THREE.SphereGeometry(0.9, 10, 10), blackMat);
            guardHead.position.set(0, 34.5, 0);
            tower.add(guardHead);

            // Sniper Rifle Barrel with laser sight
            const rifle = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 4.0), blackMat);
            rifle.position.set(0, 33, 1.8);
            tower.add(rifle);

            // Laser sight beam pointing downward to arena
            const laserSightGeo = new THREE.CylinderGeometry(0.04, 0.04, 120);
            const laserSightMat = new THREE.MeshBasicMaterial({ color: 0xff0033, transparent: true, opacity: 0.4 });
            const laserSight = new THREE.Mesh(laserSightGeo, laserSightMat);
            laserSight.position.set(0, 12, 40);
            laserSight.rotation.x = Math.PI / 3;
            tower.add(laserSight);

            tower.rifleMuzzle = new THREE.Vector3(pos.x, 33, pos.z + 3.8);

            scene.add(tower);
            sniperTowers.push(tower);
        });
    }

    // VIP Observation Box (Front Man's Room)
    function buildVIPBox() {
        const vipGroup = new THREE.Group();
        vipGroup.position.set(0, 24, CONFIG.arenaLength / 2 - 2);

        // Tinted Glass Box
        const glassMat = new THREE.MeshPhysicalMaterial({
            color: 0x111622,
            metalness: 0.9,
            roughness: 0.1,
            transmission: 0.85,
            transparent: true,
            opacity: 0.9
        });
        const box = new THREE.Mesh(new THREE.BoxGeometry(26, 8, 5), glassMat);
        vipGroup.add(box);

        // Interior warm glow
        const vipLight = new THREE.PointLight(0xffaa33, 1.2, 30);
        vipLight.position.set(0, 0, -1);
        vipGroup.add(vipLight);

        // Front Man Silhouette
        const frontMan = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, 4.2, 8), new THREE.MeshBasicMaterial({ color: 0x050505 }));
        frontMan.position.set(0, -1, -1.5);
        vipGroup.add(frontMan);

        scene.add(vipGroup);
    }

    // Giant Doll (Young-hee) & The Dead Tree
    function buildDollAndTree() {
        // Dead leafless tree
        const trunkGeo = new THREE.CylinderGeometry(1.8, 2.8, 24, 10);
        const barkMat = new THREE.MeshStandardMaterial({ color: 0x36281e, roughness: 0.95 });
        tree = new THREE.Mesh(trunkGeo, barkMat);
        tree.position.set(0, 12, CONFIG.dollZ - 12);
        tree.castShadow = true;
        scene.add(tree);

        // Branches
        const branchGeo = new THREE.CylinderGeometry(0.6, 1.2, 16, 8);
        const b1 = new THREE.Mesh(branchGeo, barkMat);
        b1.position.set(5, 20, CONFIG.dollZ - 12);
        b1.rotation.z = -0.7;
        scene.add(b1);

        const b2 = new THREE.Mesh(branchGeo, barkMat);
        b2.position.set(-5, 19, CONFIG.dollZ - 12);
        b2.rotation.z = 0.75;
        scene.add(b2);

        // Giant Doll Group
        doll = new THREE.Group();
        doll.position.set(0, 0, CONFIG.dollZ);

        // Pedestal
        const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(5, 5.5, 2, 24),
            new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.8 }));
        pedestal.position.y = 1;
        doll.add(pedestal);

        // Orange Pinafore Dress & Yellow Shirt
        const dress = new THREE.Mesh(new THREE.ConeGeometry(3.8, 10, 20),
            new THREE.MeshStandardMaterial({ color: 0xff5e00, roughness: 0.6 }));
        dress.position.y = 7.5;
        dress.castShadow = true;
        doll.add(dress);

        const shirt = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.9, 4, 18),
            new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.5 }));
        shirt.position.y = 12;
        shirt.castShadow = true;
        doll.add(shirt);

        // White socks and shoes
        [-1.3, 1.3].forEach(x => {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 3.8, 10),
                new THREE.MeshStandardMaterial({ color: 0xffffff }));
            leg.position.set(x, 2.6, 0);
            doll.add(leg);

            const shoe = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.9, 2.0),
                new THREE.MeshStandardMaterial({ color: 0x24180d }));
            shoe.position.set(x, 0.9, 0.3);
            doll.add(shoe);
        });

        // Doll Head Group (Rotates 180 degrees)
        doll.headGroup = new THREE.Group();
        doll.headGroup.position.set(0, 15.5, 0);
        doll.headGroup.rotation.y = Math.PI; // initially facing tree (Z -)

        // Head mesh
        const head = new THREE.Mesh(new THREE.SphereGeometry(2.7, 24, 24),
            new THREE.MeshStandardMaterial({ color: 0xffdfbe, roughness: 0.35 }));
        head.castShadow = true;
        doll.headGroup.add(head);

        // Black bob hair & pigtails with red hair ties
        const hairMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
        const hairCap = new THREE.Mesh(new THREE.SphereGeometry(2.8, 20, 20, 0, Math.PI * 2, 0, Math.PI / 1.7), hairMat);
        hairCap.position.y = 0.25;
        doll.headGroup.add(hairCap);

        // Red hair ribbons
        const ribbonMat = new THREE.MeshBasicMaterial({ color: 0xff0044 });
        [-3.0, 3.0].forEach(x => {
            const rib = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.15, 8, 16), ribbonMat);
            rib.position.set(x, -0.6, -0.2);
            doll.headGroup.add(rib);

            const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.25, 4.5, 8), hairMat);
            tail.position.set(x, -2.6, -0.2);
            tail.rotation.z = x > 0 ? -0.2 : 0.2;
            doll.headGroup.add(tail);
        });

        // Eyes (Sensor eyes)
        const eyeGeo = new THREE.SphereGeometry(0.44, 14, 14);
        doll.eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
        const lEye = new THREE.Mesh(eyeGeo, doll.eyeMat);
        lEye.position.set(-0.9, 0.35, 2.4);
        doll.headGroup.add(lEye);

        const rEye = new THREE.Mesh(eyeGeo, doll.eyeMat);
        rEye.position.set(0.9, 0.35, 2.4);
        doll.headGroup.add(rEye);

        // Rosy cheeks
        const cheekMat = new THREE.MeshBasicMaterial({ color: 0xff6b81 });
        [-1.4, 1.4].forEach(x => {
            const cheek = new THREE.Mesh(new THREE.CircleGeometry(0.45, 12), cheekMat);
            cheek.position.set(x, -0.35, 2.58);
            doll.headGroup.add(cheek);
        });

        // Volumetric Scanning Cones (Red Light Detection Beams)
        const beamGeo = new THREE.ConeGeometry(24, 140, 24, 1, true);
        const beamMat = new THREE.MeshBasicMaterial({
            color: 0xff0033,
            transparent: true,
            opacity: 0.0,
            side: THREE.DoubleSide
        });
        doll.scanBeam = new THREE.Mesh(beamGeo, beamMat);
        doll.scanBeam.position.set(0, 0, 70);
        doll.scanBeam.rotation.x = -Math.PI / 2;
        doll.headGroup.add(doll.scanBeam);

        doll.add(doll.headGroup);
        scene.add(doll);
    }

    // Pink Soldier Guards along arena perimeter
    function buildGuards() {
        const guardZPositions = [-100, -40, 20, 80];
        const pinkMat = new THREE.MeshStandardMaterial({ color: 0xff1464, roughness: 0.55 });
        const blackMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3 });
        const maskShapeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

        [-CONFIG.arenaWidth / 2 + 5, CONFIG.arenaWidth / 2 - 5].forEach((gx, sideIdx) => {
            guardZPositions.forEach((gz, zIdx) => {
                const guard = new THREE.Group();
                guard.position.set(gx, 0, gz);
                guard.rotation.y = gx < 0 ? Math.PI / 2 : -Math.PI / 2;

                // Body
                const body = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.1, 4.4, 10), pinkMat);
                body.position.y = 4.4;
                body.castShadow = true;
                guard.add(body);

                // Legs
                [-0.5, 0.5].forEach(lx => {
                    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 4.0, 8), pinkMat);
                    leg.position.set(lx, 2.0, 0);
                    guard.add(leg);

                    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 1.4), blackMat);
                    boot.position.set(lx, 0.35, 0.2);
                    guard.add(boot);
                });

                // Head with mask
                const head = new THREE.Mesh(new THREE.SphereGeometry(1.2, 14, 14), blackMat);
                head.position.y = 7.2;
                guard.add(head);

                const hood = new THREE.Mesh(new THREE.SphereGeometry(1.35, 14, 14, 0, Math.PI * 2, 0, Math.PI / 1.5), pinkMat);
                hood.position.y = 7.3;
                guard.add(hood);

                // Shape: Square for supervisors, Triangle for soldiers, Circle for workers
                const shapeType = zIdx === 0 ? 'square' : (zIdx === 1 ? 'triangle' : 'circle');
                let shapeMesh;
                if (shapeType === 'circle') {
                    shapeMesh = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.44, 20), maskShapeMat);
                } else if (shapeType === 'triangle') {
                    const tri = new THREE.Shape();
                    tri.moveTo(0, 0.45);
                    tri.lineTo(-0.4, -0.35);
                    tri.lineTo(0.4, -0.35);
                    tri.closePath();
                    shapeMesh = new THREE.Mesh(new THREE.ShapeGeometry(tri), maskShapeMat);
                } else {
                    shapeMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7), maskShapeMat);
                }
                shapeMesh.position.set(0, 7.2, 1.22);
                guard.add(shapeMesh);

                // MP5 Gun
                const gun = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, 2.2), blackMat);
                gun.position.set(0.6, 5.2, 0.8);
                gun.rotation.x = -0.4;
                guard.add(gun);

                scene.add(guard);
                guards.push(guard);
            });
        });
    }

    // Helper: Create Contestant Model
    function createContestantMesh(numberStr, isPlayer = false, hairType = 0) {
        const group = new THREE.Group();
        const suitMat = new THREE.MeshStandardMaterial({
            color: isPlayer ? 0x009e86 : 0x007865,
            roughness: 0.65
        });
        const skinMat = new THREE.MeshStandardMaterial({ color: 0xf5cca4, roughness: 0.45 });
        const shoeMat = new THREE.MeshStandardMaterial({ color: 0xffffff });

        // Torso with white zipper & shoulder stripes
        const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.9, 3.4, 10), suitMat);
        torso.position.y = 3.7;
        torso.castShadow = true;
        group.add(torso);

        // Contestant number on chest and back
        const numCanvas = document.createElement('canvas');
        numCanvas.width = 128;
        numCanvas.height = 128;
        const nCtx = numCanvas.getContext('2d');
        nCtx.fillStyle = '#ffffff';
        nCtx.fillRect(8, 8, 112, 112);
        nCtx.fillStyle = '#0a0a0a';
        nCtx.font = 'bold 56px Arial';
        nCtx.textAlign = 'center';
        nCtx.textBaseline = 'middle';
        nCtx.fillText(numberStr, 64, 64);
        const numTex = new THREE.CanvasTexture(numCanvas);
        const numMat = new THREE.MeshBasicMaterial({ map: numTex });

        const patchF = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.85), numMat);
        patchF.position.set(0, 3.8, 0.92);
        group.add(patchF);

        const patchB = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.85), numMat);
        patchB.position.set(0, 3.8, -0.92);
        patchB.rotation.y = Math.PI;
        group.add(patchB);

        // Head & Hair
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.92, 14, 14), skinMat);
        head.position.y = 5.8;
        head.castShadow = true;
        group.add(head);

        const hairColor = numberStr === '001' ? 0xdddddd : 0x151515; // Old man Oh Il-nam has white hair
        const hair = new THREE.Mesh(new THREE.SphereGeometry(0.98, 12, 12, 0, Math.PI * 2, 0, Math.PI / 1.7),
            new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.9 }));
        hair.position.y = 5.9;
        group.add(hair);

        // Legs
        const legGeo = new THREE.CylinderGeometry(0.35, 0.35, 2.9, 8);
        const lLeg = new THREE.Mesh(legGeo, suitMat);
        lLeg.position.set(-0.45, 1.45, 0);
        lLeg.castShadow = true;
        group.add(lLeg);

        const rLeg = new THREE.Mesh(legGeo, suitMat);
        rLeg.position.set(0.45, 1.45, 0);
        rLeg.castShadow = true;
        group.add(rLeg);

        // Slip-on shoes
        [-0.45, 0.45].forEach(lx => {
            const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.5, 1.25), shoeMat);
            shoe.position.set(lx, 0.25, 0.2);
            group.add(shoe);
        });

        // Arms
        const armGeo = new THREE.CylinderGeometry(0.3, 0.3, 2.7, 8);
        const lArm = new THREE.Mesh(armGeo, suitMat);
        lArm.position.set(-1.2, 3.5, 0);
        lArm.castShadow = true;
        group.add(lArm);

        const rArm = new THREE.Mesh(armGeo, suitMat);
        rArm.position.set(1.2, 3.5, 0);
        rArm.castShadow = true;
        group.add(rArm);

        group.leftLeg = lLeg;
        group.rightLeg = rLeg;
        group.leftArm = lArm;
        group.rightArm = rArm;
        group.torso = torso;
        group.head = head;

        return group;
    }

    // Player #456 (Seong Gi-hun)
    function buildPlayer() {
        player = createContestantMesh('456', true);
        player.position.set(0, 0, CONFIG.startLineZ + 5);
        player.velocity = new THREE.Vector3();
        player.isEliminated = false;
        player.hasWon = false;
        player.animTime = 0;
        scene.add(player);
    }

    // Spawn Famous NPC Competitors
    function spawnNPCs() {
        npcs = [];
        const famous = [
            { num: '001', name: 'Oh Il-nam', speed: 0.85, fear: 0.05 },
            { num: '218', name: 'Cho Sang-woo', speed: 1.15, fear: 0.25 },
            { num: '067', name: 'Kang Sae-byeok', speed: 1.20, fear: 0.15 },
            { num: '199', name: 'Abdul Ali', speed: 1.10, fear: 0.10 },
            { num: '101', name: 'Jang Deok-su', speed: 1.12, fear: 0.40 },
            { num: '212', name: 'Han Mi-nyeo', speed: 0.95, fear: 0.70 },
            { num: '240', name: 'Ji-yeong', speed: 1.05, fear: 0.20 },
            { num: '069', name: 'Player 069', speed: 1.0, fear: 0.50 }
        ];

        for (let i = 0; i < CONFIG.npcCount; i++) {
            const data = i < famous.length ? famous[i] : {
                num: String(Math.floor(Math.random() * 400 + 10)).padStart(3, '0'),
                speed: 0.85 + Math.random() * 0.35,
                fear: Math.random()
            };

            const npcMesh = createContestantMesh(data.num, false);
            const spreadX = (Math.random() - 0.5) * (CONFIG.arenaWidth - 22);
            const spreadZ = CONFIG.startLineZ + Math.random() * 14;
            npcMesh.position.set(spreadX, 0, spreadZ);

            const npc = {
                mesh: npcMesh,
                number: data.num,
                speed: CONFIG.playerWalkSpeed * data.speed,
                fearFactor: data.fear,
                isEliminated: false,
                hasWon: false,
                animTime: Math.random() * 10
            };

            scene.add(npcMesh);
            npcs.push(npc);
        }
    }

    // Dust particle effect for running
    function setupDustSystem() {
        dustParticles = [];
        const dustMat = new THREE.MeshBasicMaterial({ color: 0xdfbe88, transparent: true, opacity: 0.6 });
        const dustGeo = new THREE.SphereGeometry(0.3, 6, 6);

        for (let i = 0; i < 40; i++) {
            const p = new THREE.Mesh(dustGeo, dustMat.clone());
            p.visible = false;
            p.life = 0;
            scene.add(p);
            dustParticles.push(p);
        }
    }

    function spawnDust(x, z) {
        const p = dustParticles.find(d => !d.visible);
        if (p) {
            p.position.set(x + (Math.random() - 0.5) * 0.6, 0.2, z + (Math.random() - 0.5) * 0.6);
            p.scale.set(1, 1, 1);
            p.material.opacity = 0.6;
            p.visible = true;
            p.life = 1.0;
        }
    }

    // Sniper Bullet Tracer Line & Blood Decal on Elimination
    function triggerSniperShotAt(targetPos) {
        // Find nearest sniper tower
        let nearestTower = sniperTowers[0];
        let minDist = Infinity;
        sniperTowers.forEach(t => {
            const dist = t.position.distanceTo(targetPos);
            if (dist < minDist) {
                minDist = dist;
                nearestTower = t;
            }
        });

        // Sniper Muzzle Flash
        const flashLight = new THREE.PointLight(0xffdd66, 8, 40);
        flashLight.position.copy(nearestTower.rifleMuzzle);
        scene.add(flashLight);
        setTimeout(() => scene.remove(flashLight), 60);

        // Red Bullet Tracer Line
        const points = [nearestTower.rifleMuzzle.clone(), targetPos.clone().add(new THREE.Vector3(0, 2.5, 0))];
        const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
        const lineMat = new THREE.LineBasicMaterial({ color: 0xff0033, linewidth: 3 });
        const tracer = new THREE.Line(lineGeo, lineMat);
        scene.add(tracer);
        setTimeout(() => scene.remove(tracer), 120);

        // Sound effect & Camera Shake
        window.soundEngine.playSniperShot();
        STATE.cameraShake = 0.45;

        // Blood puddle decal on sand
        const bloodGeo = new THREE.CircleGeometry(1.4 + Math.random() * 0.8, 16);
        const bloodMat = new THREE.MeshBasicMaterial({
            color: 0x8a0303,
            transparent: true,
            opacity: 0.9
        });
        const blood = new THREE.Mesh(bloodGeo, bloodMat);
        blood.rotation.x = -Math.PI / 2;
        blood.position.set(targetPos.x, 0.05, targetPos.z);
        scene.add(blood);
        bloodDecals.push(blood);
    }

    // Controls setup
    function setupControls() {
        window.addEventListener('keydown', e => {
            if (STATE.status !== 'PLAYING') return;
            switch (e.code) {
                case 'KeyW':
                case 'ArrowUp':
                    keys.forward = true;
                    break;
                case 'KeyS':
                case 'ArrowDown':
                    keys.backward = true;
                    break;
                case 'KeyA':
                case 'ArrowLeft':
                    keys.left = true;
                    break;
                case 'KeyD':
                case 'ArrowRight':
                    keys.right = true;
                    break;
                case 'ShiftLeft':
                case 'ShiftRight':
                    keys.sprint = true;
                    break;
                case 'KeyV':
                    toggleCamera();
                    break;
            }
        });

        window.addEventListener('keyup', e => {
            switch (e.code) {
                case 'KeyW':
                case 'ArrowUp':
                    keys.forward = false;
                    break;
                case 'KeyS':
                case 'ArrowDown':
                    keys.backward = false;
                    break;
                case 'KeyA':
                case 'ArrowLeft':
                    keys.left = false;
                    break;
                case 'KeyD':
                case 'ArrowRight':
                    keys.right = false;
                    break;
                case 'ShiftLeft':
                case 'ShiftRight':
                    keys.sprint = false;
                    break;
            }
        });

        dom.startBtn.addEventListener('click', startGame);
        dom.retryBtn.addEventListener('click', restartGame);
        dom.playAgainBtn.addEventListener('click', restartGame);

        dom.muteBtn.addEventListener('click', () => {
            STATE.isMuted = !STATE.isMuted;
            window.soundEngine.setMuted(STATE.isMuted);
            dom.muteBtn.classList.toggle('active', STATE.isMuted);
            dom.muteBtn.innerHTML = STATE.isMuted ? '🔇 Unmute' : '🔊 Sound';
        });

        dom.camBtn.addEventListener('click', toggleCamera);
        setupTouchControls();
    }

    function setupTouchControls() {
        let touchOrigin = null;
        dom.touchStick.addEventListener('touchstart', e => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = dom.touchStick.getBoundingClientRect();
            touchOrigin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        });

        dom.touchStick.addEventListener('touchmove', e => {
            e.preventDefault();
            if (!touchOrigin || STATE.status !== 'PLAYING') return;
            const touch = e.touches[0];
            const dx = touch.clientX - touchOrigin.x;
            const dy = touch.clientY - touchOrigin.y;
            const dist = Math.hypot(dx, dy);
            const clamped = Math.min(dist, 45);
            const angle = Math.atan2(dy, dx);

            dom.touchThumb.style.transform = `translate(calc(-50% + ${Math.cos(angle) * clamped}px), calc(-50% + ${Math.sin(angle) * clamped}px))`;
            keys.forward = dy < -15;
            keys.backward = dy > 15;
            keys.left = dx < -15;
            keys.right = dx > 15;
            keys.sprint = dist > 35;
        });

        const resetTouch = () => {
            touchOrigin = null;
            dom.touchThumb.style.transform = 'translate(-50%, -50%)';
            keys.forward = keys.backward = keys.left = keys.right = keys.sprint = false;
        };
        dom.touchStick.addEventListener('touchend', resetTouch);
        dom.touchStick.addEventListener('touchcancel', resetTouch);
    }

    function toggleCamera() {
        if (STATE.cameraMode === 'THIRD_PERSON') {
            STATE.cameraMode = 'FIRST_PERSON';
            dom.camBtn.innerHTML = '🎥 1st Person';
            player.visible = false;
        } else {
            STATE.cameraMode = 'THIRD_PERSON';
            dom.camBtn.innerHTML = '🎥 3rd Person';
            player.visible = true;
        }
    }

    // Start Game
    function startGame() {
        window.soundEngine.init();
        window.soundEngine.stopBGM();
        dom.menuModal.classList.add('hidden');
        STATE.status = 'PLAYING';
        STATE.timeLeft = CONFIG.totalGameTime;
        STATE.aliveCount = CONFIG.initialAliveCount;
        STATE.prizePool = 0;
        STATE.roundCount = 0;
        STATE.stamina = 100;

        triggerGreenLight();
    }

    // Restart Game
    function restartGame() {
        dom.gameOverModal.classList.add('hidden');
        dom.victoryModal.classList.add('hidden');
        dom.cinematicOverlay.classList.remove('red-alert');

        // Clean blood decals
        bloodDecals.forEach(b => scene.remove(b));
        bloodDecals = [];

        // Reset Player
        player.position.set(0, 0, CONFIG.startLineZ + 5);
        player.rotation.set(0, 0, 0);
        player.isEliminated = false;
        player.hasWon = false;
        player.visible = true;

        // Reset NPCs
        npcs.forEach(npc => {
            npc.isEliminated = false;
            npc.hasWon = false;
            npc.mesh.position.set(
                (Math.random() - 0.5) * (CONFIG.arenaWidth - 22),
                0,
                CONFIG.startLineZ + Math.random() * 14
            );
            npc.mesh.rotation.set(0, 0, 0);
            npc.mesh.visible = true;
        });

        startGame();
    }

    // Green Light: Doll sings, turns away
    function triggerGreenLight() {
        if (STATE.status !== 'PLAYING') return;

        STATE.light = 'GREEN';
        STATE.roundCount++;
        STATE.targetHeadAngle = Math.PI; // Face tree

        // Deactivate scanner
        doll.eyeMat.color.setHex(0x111111);
        doll.scanBeam.material.opacity = 0;
        dom.cinematicOverlay.classList.remove('red-alert');

        dom.statusPill.className = 'status-pill green';
        dom.statusText.innerText = 'GREEN LIGHT';
        dom.dollSubtext.innerText = '무궁화 꽃이 피었습니다... (RUN)';

        // Speed increases in later rounds: 1.0x -> 1.25x -> 1.5x -> 1.8x -> 2.2x
        const speed = Math.min(1.0 + (STATE.roundCount - 1) * 0.22, 2.3);

        window.soundEngine.playDollChant(speed, () => {
            if (STATE.status === 'PLAYING') {
                triggerRedLight();
            }
        });
    }

    // Red Light: Doll snaps head around, activates radar
    function triggerRedLight() {
        if (STATE.status !== 'PLAYING') return;

        STATE.light = 'RED';
        STATE.targetHeadAngle = 0; // Face contestants

        dom.statusPill.className = 'status-pill red';
        dom.statusText.innerText = 'RED LIGHT';
        dom.dollSubtext.innerText = 'FREEZE! MOTION SENSORS ACTIVE';
        dom.cinematicOverlay.classList.add('red-alert');

        window.soundEngine.playRedLightAlert();

        setTimeout(() => {
            if (STATE.status !== 'PLAYING') return;
            // Eyes glow red
            doll.eyeMat.color.setHex(0xff0033);
            doll.scanBeam.material.opacity = 0.35;
            window.soundEngine.startHeartbeat();

            // Grace period before sensor triggers (0.16s)
            setTimeout(scanFieldForMovement, 160);

            // Red light duration
            const redDuration = 2200 + Math.random() * 1800;
            setTimeout(() => {
                if (STATE.status === 'PLAYING') {
                    window.soundEngine.stopHeartbeat();
                    triggerGreenLight();
                }
            }, redDuration);
        }, 280);
    }

    // Scan for any movement
    function scanFieldForMovement() {
        if (STATE.status !== 'PLAYING' || STATE.light !== 'RED') return;

        // Player check
        const isPlayerMoving = keys.forward || keys.backward || keys.left || keys.right ||
            player.velocity.length() > 0.5;

        if (isPlayerMoving && !player.isEliminated && !player.hasWon) {
            eliminatePlayer();
        }

        // NPCs check
        npcs.forEach(npc => {
            if (!npc.isEliminated && !npc.hasWon && npc.mesh.position.z > CONFIG.finishLineZ) {
                // NPCs eliminate with realistic probabilities
                if (Math.random() < 0.25) {
                    setTimeout(() => eliminateNPC(npc), Math.random() * 650);
                }
            }
        });
    }

    // Eliminate Player
    function eliminatePlayer() {
        player.isEliminated = true;
        triggerSniperShotAt(player.position);

        // Ragdoll fall animation
        let fallProgress = 0;
        const fallInterval = setInterval(() => {
            fallProgress += 0.12;
            player.rotation.x = Math.min(fallProgress * (Math.PI / 2), Math.PI / 2);
            player.position.y = Math.max(0, 1.0 - fallProgress);
            if (fallProgress >= 1.0) clearInterval(fallInterval);
        }, 16);

        setTimeout(() => gameOver(false), 1400);
    }

    // Eliminate NPC
    function eliminateNPC(npc) {
        if (npc.isEliminated || npc.hasWon || STATE.status !== 'PLAYING') return;
        npc.isEliminated = true;
        triggerSniperShotAt(npc.mesh.position);

        STATE.aliveCount = Math.max(1, STATE.aliveCount - Math.floor(Math.random() * 14 + 6));
        STATE.prizePool += CONFIG.prizePerPlayer * 10;
        updateHUD();

        let fallProgress = 0;
        const fallInterval = setInterval(() => {
            fallProgress += 0.14;
            npc.mesh.rotation.x = Math.min(fallProgress * (Math.PI / 2), Math.PI / 2);
            npc.mesh.position.y = Math.max(0, 0.8 - fallProgress);
            if (fallProgress >= 1.0) clearInterval(fallInterval);
        }, 16);
    }

    // Game Over / Victory
    function gameOver(isVictory) {
        STATE.status = isVictory ? 'VICTORY' : 'GAME_OVER';
        window.soundEngine.stopChant();

        if (isVictory) {
            window.soundEngine.playVictory();
            document.getElementById('vic-time').innerText = `${(CONFIG.totalGameTime - STATE.timeLeft).toFixed(1)}s`;
            document.getElementById('vic-prize').innerText = `₩ ${(STATE.prizePool / 1000000000).toFixed(1)}B`;
            dom.victoryModal.classList.remove('hidden');
        } else {
            document.getElementById('go-dist').innerText = `${Math.floor(STATE.distanceTraveled)}m / 300m`;
            document.getElementById('go-time').innerText = `${(CONFIG.totalGameTime - STATE.timeLeft).toFixed(1)}s`;
            dom.gameOverModal.classList.remove('hidden');
        }
    }

    // Main Update Loop
    function update(delta) {
        // Rotate doll head
        if (doll && doll.headGroup) {
            const rotSpeed = STATE.light === 'RED' ? 14 : 4.5;
            doll.headGroup.rotation.y = THREE.MathUtils.lerp(
                doll.headGroup.rotation.y,
                STATE.targetHeadAngle,
                delta * rotSpeed
            );
        }

        if (STATE.status === 'PLAYING') {
            // Timer countdown
            STATE.timeLeft = Math.max(0, STATE.timeLeft - delta);
            if (STATE.timeLeft <= 0 && !player.hasWon) {
                eliminatePlayer();
            }

            // Stamina recovery or depletion
            if (keys.sprint && (keys.forward || keys.backward || keys.left || keys.right)) {
                STATE.stamina = Math.max(0, STATE.stamina - delta * 24);
            } else {
                STATE.stamina = Math.min(100, STATE.stamina + delta * 18);
            }
            if (dom.staminaFill) {
                dom.staminaFill.style.width = `${STATE.stamina}%`;
            }

            updatePlayer(delta);
            updateNPCs(delta);

            // Progress tracking
            const totalDist = CONFIG.startLineZ - CONFIG.finishLineZ;
            const currentDist = CONFIG.startLineZ - player.position.z;
            STATE.distanceTraveled = Math.max(0, Math.min(totalDist, currentDist));
            const progressPercent = Math.min(100, Math.max(0, (STATE.distanceTraveled / totalDist) * 100));

            dom.progressFill.style.height = `${progressPercent}%`;
            dom.progressLabel.innerText = `${Math.floor(progressPercent)}%`;

            // Win check
            if (player.position.z <= CONFIG.finishLineZ && !player.hasWon && !player.isEliminated) {
                player.hasWon = true;
                gameOver(true);
            }

            updateHUD();
        }

        updateDust(delta);
        updateCamera(delta);
    }

    function updatePlayer(delta) {
        if (player.isEliminated || player.hasWon) return;

        const moveDir = new THREE.Vector3();
        if (keys.forward) moveDir.z -= 1;
        if (keys.backward) moveDir.z += 1;
        if (keys.left) moveDir.x -= 1;
        if (keys.right) moveDir.x += 1;

        const isMoving = moveDir.lengthSq() > 0;
        const canSprint = keys.sprint && STATE.stamina > 5;
        const currentSpeed = canSprint ? CONFIG.playerSprintSpeed : CONFIG.playerWalkSpeed;

        if (isMoving) {
            moveDir.normalize();
            player.position.x += moveDir.x * currentSpeed * delta;
            player.position.z += moveDir.z * currentSpeed * delta;

            const halfW = CONFIG.arenaWidth / 2 - 4;
            player.position.x = Math.max(-halfW, Math.min(halfW, player.position.x));

            player.rotation.y = Math.atan2(moveDir.x, moveDir.z);

            player.animTime += delta * (canSprint ? 18 : 11);
            const legAngle = Math.sin(player.animTime) * 0.7;
            player.leftLeg.rotation.x = legAngle;
            player.rightLeg.rotation.x = -legAngle;
            player.leftArm.rotation.x = -legAngle * 0.8;
            player.rightArm.rotation.x = legAngle * 0.8;

            window.soundEngine.playFootstep();

            if (canSprint && Math.random() < 0.35) {
                spawnDust(player.position.x, player.position.z);
            }
        } else {
            player.leftLeg.rotation.x = player.rightLeg.rotation.x = 0;
            player.leftArm.rotation.x = player.rightArm.rotation.x = 0;
        }
    }

    function updateNPCs(delta) {
        npcs.forEach(npc => {
            if (npc.isEliminated || npc.hasWon) return;

            let shouldRun = false;
            if (STATE.light === 'GREEN') {
                shouldRun = true;
            } else if (STATE.light === 'RED') {
                shouldRun = npc.fearFactor > 0.96;
            }

            if (shouldRun && npc.mesh.position.z > CONFIG.finishLineZ) {
                npc.mesh.position.z -= npc.speed * delta;
                npc.animTime += delta * 12;
                const swing = Math.sin(npc.animTime) * 0.6;
                npc.mesh.leftLeg.rotation.x = swing;
                npc.mesh.rightLeg.rotation.x = -swing;
                npc.mesh.leftArm.rotation.x = -swing;
                npc.mesh.rightArm.rotation.x = swing;

                if (npc.mesh.position.z <= CONFIG.finishLineZ) {
                    npc.hasWon = true;
                    npc.mesh.leftLeg.rotation.x = npc.mesh.rightLeg.rotation.x = 0;
                }
            } else {
                npc.mesh.leftLeg.rotation.x = npc.mesh.rightLeg.rotation.x = 0;
            }
        });
    }

    function updateDust(delta) {
        dustParticles.forEach(d => {
            if (d.visible) {
                d.life -= delta * 2.5;
                d.position.y += delta * 0.8;
                d.scale.multiplyScalar(1.03);
                d.material.opacity = d.life * 0.5;
                if (d.life <= 0) d.visible = false;
            }
        });
    }

    function updateCamera(delta) {
        if (!player) return;

        // Camera Shake effect from sniper gunfire
        let shakeOffset = new THREE.Vector3();
        if (STATE.cameraShake > 0) {
            shakeOffset.set(
                (Math.random() - 0.5) * STATE.cameraShake,
                (Math.random() - 0.5) * STATE.cameraShake,
                (Math.random() - 0.5) * STATE.cameraShake
            );
            STATE.cameraShake = Math.max(0, STATE.cameraShake - delta * 2.5);
        }

        if (STATE.cameraMode === 'THIRD_PERSON') {
            const targetPos = new THREE.Vector3(
                player.position.x * 0.45,
                player.position.y + 8.0,
                player.position.z + 17
            ).add(shakeOffset);
            camera.position.lerp(targetPos, delta * 5.5);
            camera.lookAt(player.position.x, player.position.y + 4.2, player.position.z - 8);
        } else {
            camera.position.set(player.position.x, player.position.y + 5.6, player.position.z).add(shakeOffset);
            camera.lookAt(player.position.x, player.position.y + 5.6, player.position.z - 30);
        }
    }

    function updateHUD() {
        const mins = Math.floor(STATE.timeLeft / 60);
        const secs = Math.floor(STATE.timeLeft % 60);
        dom.timerVal.innerText = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        dom.timerCard.classList.toggle('danger', STATE.timeLeft < 15);
        dom.aliveVal.innerText = `${STATE.aliveCount} / 456`;
        const bill = (STATE.prizePool / 1000000000).toFixed(1);
        dom.prizeVal.innerText = `₩ ${bill}B`;
    }

    function onResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    function animate() {
        requestAnimationFrame(animate);
        const delta = Math.min(clock.getDelta(), 0.1);
        update(delta);
        renderer.render(scene, camera);
    }

    window.addEventListener('DOMContentLoaded', () => {
        init();
        animate();
    });
})();
