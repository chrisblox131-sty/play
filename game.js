/**
 * The Awaiting Stars: Two Worlds, One Destiny
 * Web-Playable Dual-Perspective Hybrid Game & Sandbox Engine
 */
(function() {
    'use strict';
    const canvas = document.getElementById('game-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = 800, height = 480;
    canvas.width = width; canvas.height = height;

    const AudioEngine = {
        ctx: null, muted: false, bgmMuted: true, bgmInterval: null, bgmStep: 0,
        init() {
            if (!this.ctx) {
                const AC = window.AudioContext || window.webkitAudioContext;
                if (AC) this.ctx = new AC();
            }
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
        },
        play(freq1, freq2, dur, type='sine', gainVal=0.2) {
            if (this.muted || !this.ctx) return;
            try {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = type;
                osc.frequency.setValueAtTime(freq1, this.ctx.currentTime);
                if (freq2) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freq2), this.ctx.currentTime + dur);
                gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
                gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + dur);
                osc.connect(gain); gain.connect(this.ctx.destination);
                osc.start(); osc.stop(this.ctx.currentTime + dur);
            } catch(e){}
        },
        playJump() { this.play(160, 480, 0.12, 'sine', 0.18); },
        playSlash() { this.play(320, 90, 0.15, 'triangle', 0.22); },
        playHit() { this.play(140, 40, 0.1, 'sawtooth', 0.25); },
        playGlacial() { this.play(600, 180, 0.3, 'square', 0.22); },
        playShield() { this.play(520, 680, 0.15, 'sine', 0.18); },
        playCoin() { this.play(800, 1200, 0.18, 'sine', 0.15); },
        playSwitch() { this.play(300, 900, 0.25, 'sine', 0.25); },

        /* Cosmic Ambient Synth BGM Engine */
        toggleBGM() {
            this.init();
            this.bgmMuted = !this.bgmMuted;
            if (!this.bgmMuted) {
                this.startBGM();
            } else {
                this.stopBGM();
            }
            return !this.bgmMuted;
        },
        startBGM() {
            if (this.bgmInterval) clearInterval(this.bgmInterval);
            // Space chord scale frequencies (A Minor / Space Dorian: A, C, D, E, G)
            const arpeggio = [220, 261.63, 293.66, 329.63, 392.00, 440, 523.25, 659.25, 523.25, 392.00, 329.63, 293.66];
            const bass = [110, 110, 130.81, 130.81, 146.83, 146.83, 98.00, 98.00];

            this.bgmInterval = setInterval(() => {
                if (this.bgmMuted || !this.ctx || !Game.isTabFocused) return;
                const freq = arpeggio[this.bgmStep % arpeggio.length];
                this.play(freq, freq * 0.98, 0.35, 'sine', 0.045);

                if (this.bgmStep % 4 === 0) {
                    const bFreq = bass[Math.floor(this.bgmStep / 4) % bass.length];
                    this.play(bFreq, bFreq, 0.6, 'triangle', 0.06);
                }
                this.bgmStep++;
            }, 240);
        },
        stopBGM() {
            if (this.bgmInterval) {
                clearInterval(this.bgmInterval);
                this.bgmInterval = null;
            }
        }
    };

    const GameI18N = {
        en: {
            questBadge: '📜 IPS EXPEDITION',
            questTaskTitle: 'Field Research Task:',
            questExploring: (found) => `Explore biomes, chart elevation contours across dimensions [TAB], and uncover ancient relics (${found}/3 found)!`,
            questComplete: '🎉 Field Research Complete! All 3 ancient civilizational artifacts cataloged into the IPS Research Codex.',
            questSandbox: (count) => `🏗️ Civic Town-Planning: ${count} settlement structures established across the frontier.`,
            relicsBadge: (count) => `🏛️ Relics: ${count}/3`,
            relicModalBadge: '🏛️ ARCHEOLOGICAL DISCOVERY • IPS CODEX',
            relicCatalogBtn: 'Catalog into Research Codex ➔',
            
            // Cartographic HUD Ribbon
            elevLabel: (elev) => `📍 TOPOGRAPHY: Elev +${elev}m | REGION: Highland Starlight Ridge | GEOLOGY: Stratified Basalt`,
            elevMap: 'MAP: 2D Geomorphology Profile',
            elevDomBadge: (elev) => `🗺️ Elev: +${elev}m`,

            gpsLabel: (lat, lon) => `📍 GPS COORD: ${lat}°N, ${lon}°E | REGION: Starlight Settlement Basin | SCALE: 1:5,000`,
            gpsMap: 'MAP: Top-Down Spatial Cartography',
            gpsDomBadge: (lat, lon) => `🗺️ GPS: ${lat}°N, ${lon}°E`,

            civicLabel: (count) => `📍 CIVIC ZONE: Frontier Outpost | SURVEY: Municipal Town-Planning Grid | ASSETS: ${count} Built`,
            civicMap: 'MAP: Civic Cadastral Survey',
            civicDomBadge: '🗺️ Civic Cadastre',

            // Palette
            paletteLabel: 'Civic Town-Planning Palette:',
            paletteTile1: 'Stone Shelter Wall',
            paletteTile2: 'Cosmic Bridge',
            paletteTile3: 'Environmental Hazard',
            paletteTile4: 'Energy Beacon',
            paletteHint: '(Left Click: Build Settlement | Right Click: Demolish)',

            // Arcade Header & Mode buttons
            arcadeTitle: 'Interactive First Concept of the Game',
            arcadeDesc: 'Play the dual-plane engine right in your browser! Switch dimensions in real-time, unleash combat combos, block with shield durability, or build freely in sandbox mode.',
            mode2D: '2D Platformer',
            modeTopDown: '3D Top-Down RPG',
            modeSandbox: 'Sandbox Builder',

            // Controls bar
            btnAttack: '🗡️ Attack <span class="btn-sub-key">[Z / Click]</span>',
            btnShield: '🛡️ Shield Block <span class="btn-sub-key">[Hold X]</span>',
            btnSkill: '❄️ Glacial Strike <span class="btn-sub-key">[C]</span>',
            btnTelemetry: '📊 Telemetry',
            btnFullscreen: '⛶ Fullscreen',
            btnRestart: '🔄 Reset',

            // In-game Floating texts
            textDimension: (mode) => 'DIMENSION: ' + mode.replace('_', ' '),
            textRelicUncovered: '🏛️ RELIC UNCOVERED!',
            textGuardBroken: 'GUARD BROKEN!',
            textBlocked: 'BLOCKED!',
            textFrozen: 'FROZEN! -45',
            textDefeated: '+DEFEATED',
            textExpeditionReset: 'EXPEDITION RESET',
            textStarCollected: '+100 STAR',
            textWarp: 'WARP [TAB]',
            textCodex: '🏛️ CODEX',
            textCodexTablet: '🏛️ CODEX TABLET',
            textBoss: 'ASTRAL TITAN BOSS',
            textShield: 'SHIELD',
            textScore: '★ SCORE: ',
            textFpsDelta: ' FPS (DELTA-T)',
            sfxOn: '🔊 SFX: On',
            sfxOff: '🔇 SFX: Off',
            bgmOn: '🎵 BGM: On',
            bgmOff: '🎵 BGM: Off',
            telemetryOn: '📊 Telemetry: On',
            telemetryOff: '📊 Telemetry',
            telemetryHeader: '📊 ENGINE TELEMETRY HUD',
            telemetryMode: '• Mode: ',
            telemetryPlayerPos: '• Player Pos: ',
            telemetryVel: '• Velocity (vx, vy): ',
            telemetryParticles: '• Active Particles: ',
            telemetryEnemies: '• Active Enemies: ',
            telemetryMemory: '• Memory Leak Guard: 0 Leaks',
            telemetryFpsGraph: '60 FPS Graph',
            fsEnter: '⛶ Fullscreen',
            fsExit: '✕ Exit Fullscreen',
            textPauseTitle: '⏸️ GAME PAUSED',
            textPauseSub: '(Click / Return to this tab to resume)',

            // Relics
            relics: {
                astrolabe: {
                    name: 'Ancient Constellation Astrolabe',
                    era: 'Early Maritime Starlight Civilization',
                    desc: 'A navigational tool used by early explorers to traverse sea and desert routes by charting stellar angles. Demonstrates how human societies dynamically adapt to natural geographic constraints.'
                },
                tablet: {
                    name: 'Starlight Cartographic Tablet',
                    era: 'Classical Cartographic Epoch',
                    desc: 'An inscribed stone tablet mapping trade networks, water reservoirs, and mountain passes across territorial boundaries. Highlights early human civilizational interdependence.'
                },
                aqueduct: {
                    name: 'Civilization Aqueduct Conduit',
                    era: 'Pre-Industrial Hydraulic Engineering',
                    desc: 'Remnants of a gravitational water transport system that supplied frontier outposts. Illustrates how early human settlements modified terrain for agricultural and municipal sustainability.'
                }
            },

            // Keyboard legend
            legendMove: '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or <kbd>Arrows</kbd> Move / Jump',
            legendAttack: '<kbd>Z</kbd> / <kbd>Click</kbd> Attack',
            legendShield: '<kbd>X</kbd> Shield Guard',
            legendSkill: '<kbd>C</kbd> Glacial Burst',
            legendTab: '<kbd>Tab</kbd> Shift Dimension'
        },
        id: {
            questBadge: '📜 EKSPEDISI IPS',
            questTaskTitle: 'Tugas Riset Lapangan:',
            questExploring: (found) => `Jelajahi bioma, petakan kontur elevasi lintas dimensi [TAB], dan temukan relik kuno (${found}/3 ditemukan)!`,
            questComplete: '🎉 Riset Lapangan Selesai! Ketiga artefak peradaban kuno berhasil dicatat ke dalam Kodeks Riset IPS.',
            questSandbox: (count) => `🏗️ Tata Ruang Sipil: ${count} struktur pemukiman berhasil dibangun di wilayah perbatasan.`,
            relicsBadge: (count) => `🏛️ Relik: ${count}/3`,
            relicModalBadge: '🏛️ PENEMUAN ARKEOLOGI • KODEKS RISET IPS',
            relicCatalogBtn: 'Catat ke dalam Kodeks Riset ➔',

            // Cartographic HUD Ribbon
            elevLabel: (elev) => `📍 TOPOGRAFI: Elev +${elev}m | WILAYAH: Punggung Bukit Starlight | GEOLOGI: Basal Berlapis`,
            elevMap: 'PETA: Profil Geomorfologi 2D',
            elevDomBadge: (elev) => `🗺️ Elevasi: +${elev}m`,

            gpsLabel: (lat, lon) => `📍 KOORDINAT GPS: ${lat}°LU, ${lon}°BT | WILAYAH: Cekungan Pemukiman | SKALA: 1:5.000`,
            gpsMap: 'PETA: Kartografi Spasial Makro',
            gpsDomBadge: (lat, lon) => `🗺️ GPS: ${lat}°LU, ${lon}°BT`,

            civicLabel: (count) => `📍 ZONA SIPIL: Pos Terdepan | SURVEI: Tata Ruang Pemukiman | ASET: ${count} Dibangun`,
            civicMap: 'PETA: Survei Kadastral Sipil',
            civicDomBadge: '🗺️ Kadastral Sipil',

            // Palette
            paletteLabel: 'Palet Tata Ruang Sipil:',
            paletteTile1: 'Dinding Hunian Batu',
            paletteTile2: 'Jembatan Wilayah Kosmik',
            paletteTile3: 'Mitigasi Bahaya Geologis',
            paletteTile4: 'Menara Suar Energi',
            paletteHint: '(Klik Kiri: Bangun Pemukiman | Klik Kanan: Hancurkan)',

            // Arcade Header & Mode buttons
            arcadeTitle: 'Prototipe Konsep Interaktif Game',
            arcadeDesc: 'Mainkan mesin multi-dimensi langsung di browsermu! Alihkan dimensi secara real-time, lancarkan kombo tempur, tangkis dengan perisai, atau bangun pemukiman di mode sandbox.',
            mode2D: 'Platformer 2D',
            modeTopDown: 'RPG Top-Down 3D',
            modeSandbox: 'Pembangun Sandbox',

            // Controls bar
            btnAttack: '🗡️ Serang <span class="btn-sub-key">[Z / Klik]</span>',
            btnShield: '🛡️ Tangkis Perisai <span class="btn-sub-key">[Tahan X]</span>',
            btnSkill: '❄️ Serangan Es <span class="btn-sub-key">[C]</span>',
            btnTelemetry: '📊 Telemetri',
            btnFullscreen: '⛶ Layar Penuh',
            btnRestart: '🔄 Ulang',

            // In-game Floating texts
            textDimension: (mode) => 'DIMENSI: ' + (mode === '2D_PLATFORMER' ? 'PLATFORMER 2D' : (mode === 'TOPDOWN_RPG' ? 'RPG TOPDOWN 3D' : 'SANDBOX SIPIL')),
            textRelicUncovered: '🏛️ RELIK DITEMUKAN!',
            textGuardBroken: 'PERISAI HANCUR!',
            textBlocked: 'DITANGKIS!',
            textFrozen: 'BEKU! -45',
            textDefeated: '+DIKALAHKAN',
            textExpeditionReset: 'EKSPEDISI DIULANG',
            textStarCollected: '+100 BINTANG',
            textWarp: 'PINDAH [TAB]',
            textCodex: '🏛️ KODEKS',
            textCodexTablet: '🏛️ PRASASTI KODEKS',
            textBoss: 'BOS TITAN ASTRAL',
            textShield: 'PERISAI',
            textScore: '★ SKOR: ',
            textFpsDelta: ' FPS (DELTA-T)',
            sfxOn: '🔊 Efek: Aktif',
            sfxOff: '🔇 Efek: Nonaktif',
            bgmOn: '🎵 Musik: Aktif',
            bgmOff: '🎵 Musik: Nonaktif',
            telemetryOn: '📊 Telemetri: Aktif',
            telemetryOff: '📊 Telemetri',
            telemetryHeader: '📊 TELEMETRI ENGINE REAL-TIME',
            telemetryMode: '• Mode: ',
            telemetryPlayerPos: '• Posisi Pemain: ',
            telemetryVel: '• Kecepatan (vx, vy): ',
            telemetryParticles: '• Partikel Aktif: ',
            telemetryEnemies: '• Musuh Aktif: ',
            telemetryMemory: '• Kebocoran Memori: 0.00 MB (Stabil)',
            telemetryFpsGraph: 'Grafik 60 FPS',
            fsEnter: '⛶ Layar Penuh',
            fsExit: '✕ Keluar Layar Penuh',
            textPauseTitle: '⏸️ GAME DIJEDA',
            textPauseSub: '(Klik / Kembali ke tab ini untuk lanjut bermain)',

            // Relics
            relics: {
                astrolabe: {
                    name: 'Astrolabe Rasi Bintang Kuno',
                    era: 'Peradaban Maritim Awal Starlight',
                    desc: 'Alat navigasi yang digunakan penjelajah masa lampau untuk melintasi rute laut dan gurun dengan memetakan sudut bintang. Menunjukkan bagaimana manusia beradaptasi secara dinamis terhadap batasan geografis alam.'
                },
                tablet: {
                    name: 'Prasasti Kartografi Starlight',
                    era: 'Zaman Kartografi Klasik',
                    desc: 'Prasasti batu berpahat yang memetakan jaringan perdagangan, cadangan mata air, dan celah pegunungan lintas batas wilayah. Menyoroti ketergantungan dan interaksi spasial peradaban awal.'
                },
                aqueduct: {
                    name: 'Saluran Akuaduk Peradaban',
                    era: 'Rekayasa Hidrolik Pra-Industri',
                    desc: 'Sisa sistem penyaluran air gravitasi yang menyuplai pos perbatasan. Menggambarkan bagaimana pemukiman awal memodifikasi bentang lahan demi keberlanjutan irigasi dan sanitasi.'
                }
            },

            // Keyboard legend
            legendMove: '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> atau <kbd>Panah</kbd> Gerak / Lompat',
            legendAttack: '<kbd>Z</kbd> / <kbd>Klik</kbd> Serang',
            legendShield: '<kbd>X</kbd> Tangkis Perisai',
            legendSkill: '<kbd>C</kbd> Serangan Badai Es',
            legendTab: '<kbd>Tab</kbd> Alih Dimensi Spasial'
        }
    };

    const Game = {
        lang: 'en',
        mode: '2D_PLATFORMER',
        score: 0,
        keys: {},
        mouse: { x: 0, y: 0, isDown: false, rightDown: false },
        selectedTile: 1,
        camera: { x: 0, y: 0 },
        particles: [],
        slashes: [],
        glacialBursts: [],
        floatingTexts: [],
        dimensionTransition: 0,
        frameCount: 0,

        // Social Studies / Educational Factors (IPS)
        relics: [],
        collectedRelicsCount: 0,
        activeRelicModal: false,
        currentActiveRelic: null,

        player: {
            x: 100, y: 300, vx: 0, vy: 0, w: 32, h: 44,
            speed: 5.2, jumpStrength: -15.5, gravity: 0.72,
            grounded: false, facing: 1,
            hp: 100, maxHp: 100, shield: 100, maxShield: 100,
            isShielding: false, shieldOverheated: false, shieldCooldown: 0,
            attackTimer: 0, comboStep: 0, glacialCooldown: 0, maxGlacialCd: 180,
            invulnerable: 0
        },

        platforms2D: [],
        gridSize: 32,
        sandboxMap: {},
        enemies: [],
        stars: [],
        portals: [],

        init() {
            try {
                const saved = localStorage.getItem('tas_lang');
                if (saved === 'id' || saved === 'en') this.lang = saved;
            } catch(e){}
            this.setupInitialLevels();
            this.bindEvents();
            this.applyLanguage();
            this.loop();
        },

        setLanguage(lang) {
            this.lang = (lang === 'id') ? 'id' : 'en';
            this.applyLanguage();
        },

        applyLanguage() {
            const t = GameI18N[this.lang] || GameI18N.en;

            const questBadge = document.querySelector('.ips-quest-badge');
            if (questBadge) questBadge.textContent = t.questBadge;

            const questTitle = document.querySelector('.ips-quest-title');
            if (questTitle) questTitle.textContent = t.questTaskTitle;

            const relicModalBadge = document.querySelector('.relic-modal-badge');
            if (relicModalBadge) relicModalBadge.textContent = t.relicModalBadge;

            const closeRelicBtn = document.getElementById('btn-close-relic');
            if (closeRelicBtn) closeRelicBtn.textContent = t.relicCatalogBtn;

            const arcadeTitle = document.querySelector('.game-arcade-title');
            if (arcadeTitle) arcadeTitle.textContent = t.arcadeTitle;

            const arcadeDesc = document.querySelector('.game-arcade-desc');
            if (arcadeDesc) arcadeDesc.textContent = t.arcadeDesc;

            const btn2D = document.querySelector('.game-mode-btn[data-mode="2D_PLATFORMER"]');
            if (btn2D) btn2D.innerHTML = `<span class="mode-icon">🏃</span> ${t.mode2D}`;

            const btnTopDown = document.querySelector('.game-mode-btn[data-mode="TOPDOWN_RPG"]');
            if (btnTopDown) btnTopDown.innerHTML = `<span class="mode-icon">⚔️</span> ${t.modeTopDown}`;

            const btnSandbox = document.querySelector('.game-mode-btn[data-mode="SANDBOX"]');
            if (btnSandbox) btnSandbox.innerHTML = `<span class="mode-icon">🧱</span> ${t.modeSandbox}`;

            const palLabel = document.querySelector('.palette-label');
            if (palLabel) palLabel.textContent = t.paletteLabel;

            const palTile1 = document.querySelector('.sandbox-tile-btn[data-tile="1"]');
            if (palTile1) palTile1.innerHTML = `<span class="tile-swatch stone-swatch"></span> ${t.paletteTile1}`;

            const palTile2 = document.querySelector('.sandbox-tile-btn[data-tile="2"]');
            if (palTile2) palTile2.innerHTML = `<span class="tile-swatch cosmic-swatch"></span> ${t.paletteTile2}`;

            const palTile3 = document.querySelector('.sandbox-tile-btn[data-tile="3"]');
            if (palTile3) palTile3.innerHTML = `<span class="tile-swatch spike-swatch"></span> ${t.paletteTile3}`;

            const palTile4 = document.querySelector('.sandbox-tile-btn[data-tile="4"]');
            if (palTile4) palTile4.innerHTML = `<span class="tile-swatch star-swatch"></span> ${t.paletteTile4}`;

            const palHint = document.querySelector('.palette-hint');
            if (palHint) palHint.textContent = t.paletteHint;

            const btnAtk = document.getElementById('btn-game-attack');
            if (btnAtk) btnAtk.innerHTML = t.btnAttack;

            const btnDef = document.getElementById('btn-game-shield');
            if (btnDef) btnDef.innerHTML = t.btnShield;

            const btnSkl = document.getElementById('btn-game-skill');
            if (btnSkl) btnSkl.innerHTML = t.btnSkill;

            const btnTel = document.getElementById('btn-game-telemetry');
            if (btnTel) btnTel.textContent = this.showTelemetry ? t.telemetryOn : t.telemetryOff;

            const btnFs = document.getElementById('btn-game-fullscreen');
            if (btnFs) {
                const isFs = document.querySelector('.game-canvas-container')?.classList.contains('fullscreen-mode');
                btnFs.textContent = isFs ? t.fsExit : t.fsEnter;
            }

            const soundBtn = document.getElementById('btn-game-sound');
            if (soundBtn) {
                soundBtn.textContent = AudioEngine.muted ? t.sfxOff : t.sfxOn;
            }

            const bgmBtn = document.getElementById('btn-game-bgm');
            if (bgmBtn) {
                bgmBtn.textContent = !AudioEngine.bgmMuted ? t.bgmOn : t.bgmOff;
            }

            const btnRst = document.getElementById('btn-game-restart');
            if (btnRst) btnRst.textContent = t.btnRestart;

            const legendItems = document.querySelectorAll('.game-keyboard-legend .legend-item');
            if (legendItems.length >= 5) {
                legendItems[0].innerHTML = t.legendMove;
                legendItems[1].innerHTML = t.legendAttack;
                legendItems[2].innerHTML = t.legendShield;
                legendItems[3].innerHTML = t.legendSkill;
                legendItems[4].innerHTML = t.legendTab;
            }

            this.updateRelicHUD();

            if (this.activeRelicModal && this.currentActiveRelic) {
                this.showRelicModal(this.currentActiveRelic);
            }
        },

        setupInitialLevels() {
            this.platforms2D = [
                { x: 0, y: 420, w: 1200, h: 60, type: 1 },
                { x: 220, y: 320, w: 140, h: 24, type: 2 },
                { x: 440, y: 240, w: 160, h: 24, type: 1 },
                { x: 680, y: 310, w: 140, h: 24, type: 2 },
                { x: 900, y: 220, w: 180, h: 24, type: 1 },
                { x: 360, y: 150, w: 120, h: 20, type: 2 }
            ];

            this.stars = [
                { x: 280, y: 280, collected: false },
                { x: 500, y: 200, collected: false },
                { x: 740, y: 270, collected: false },
                { x: 980, y: 180, collected: false },
                { x: 400, y: 110, collected: false }
            ];

            this.portals = [{ x: 1050, y: 360, w: 40, h: 60, rot: 0 }];

            this.enemies = [
                { x: 480, y: 370, vx: -1.5, vy: 0, w: 32, h: 32, hp: 50, maxHp: 50, type: 'slime', facing: -1, hitTimer: 0, frozen: 0 },
                { x: 780, y: 370, vx: 1.8, vy: 0, w: 36, h: 36, hp: 80, maxHp: 80, type: 'knight', facing: 1, hitTimer: 0, frozen: 0 },
                { x: 520, y: 190, vx: -1.2, vy: 0, w: 28, h: 28, hp: 40, maxHp: 40, type: 'slime', facing: -1, hitTimer: 0, frozen: 0 }
            ];

            // Archaeological Relics (IPS Factor: Field Research Discovery)
            this.relics = [
                {
                    id: 'astrolabe',
                    icon: '🧭',
                    mode: '2D_PLATFORMER',
                    x: 630,
                    y: 280,
                    w: 28,
                    h: 28,
                    collected: false
                },
                {
                    id: 'tablet',
                    icon: '📜',
                    mode: 'TOPDOWN_RPG',
                    x: 280,
                    y: 230,
                    w: 30,
                    h: 30,
                    collected: false
                },
                {
                    id: 'aqueduct',
                    icon: '🏛️',
                    mode: '2D_PLATFORMER',
                    x: 950,
                    y: 190,
                    w: 28,
                    h: 28,
                    collected: false
                }
            ];

            for (let c = 0; c < 25; c++) this.sandboxMap[c + ',13'] = 1;
            this.sandboxMap['6,10'] = 2; this.sandboxMap['7,10'] = 2;
            this.sandboxMap['13,8'] = 2; this.sandboxMap['14,8'] = 2;
            this.sandboxMap['19,10'] = 2;
        },

        switchMode(newMode) {
            if (this.mode === newMode) return;
            AudioEngine.init();
            AudioEngine.playSwitch();
            this.mode = newMode;
            this.dimensionTransition = 30;
            this.player.vx = 0; this.player.vy = 0;

            if (newMode === '2D_PLATFORMER') {
                this.player.y = 360;
                this.player.x = Math.max(60, Math.min(this.player.x, 700));
            } else if (newMode === 'TOPDOWN_RPG') {
                this.player.x = width / 2; this.player.y = height / 2;
                this.enemies = [
                    { x: 180, y: 140, vx: 0, vy: 0, w: 36, h: 36, hp: 70, maxHp: 70, type: 'knight', facing: 1, hitTimer: 0, frozen: 0 },
                    { x: 620, y: 140, vx: 0, vy: 0, w: 36, h: 36, hp: 70, maxHp: 70, type: 'knight', facing: -1, hitTimer: 0, frozen: 0 },
                    { x: 400, y: 380, vx: 0, vy: 0, w: 44, h: 44, hp: 160, maxHp: 160, type: 'boss', facing: 1, hitTimer: 0, frozen: 0 }
                ];
            } else if (newMode === 'SANDBOX') {
                this.player.x = 120; this.player.y = 360;
            }

            this.updateUIButtons();
            this.updateRelicHUD();
            const t = GameI18N[this.lang] || GameI18N.en;
            this.addFloatingText(this.player.x, this.player.y - 30, t.textDimension(newMode), '#38bdf8');
        },

        getRelicText(id) {
            const t = GameI18N[this.lang] || GameI18N.en;
            return (t.relics && t.relics[id]) ? t.relics[id] : { name: 'Ancient Relic', era: 'Ancient Epoch', desc: '' };
        },

        showRelicModal(relic) {
            this.activeRelicModal = true;
            this.currentActiveRelic = relic;
            this.keys = {};
            const overlay = document.getElementById('relic-modal-overlay');
            const iconEl = document.getElementById('relic-modal-icon');
            const titleEl = document.getElementById('relic-modal-title');
            const eraEl = document.getElementById('relic-modal-era');
            const descEl = document.getElementById('relic-modal-desc');

            const info = this.getRelicText(relic.id);

            if (iconEl) iconEl.textContent = relic.icon || '🏛️';
            if (titleEl) titleEl.textContent = info.name;
            if (eraEl) eraEl.textContent = (this.lang === 'id' ? 'Era: ' : 'Era: ') + info.era;
            if (descEl) descEl.textContent = info.desc;

            if (overlay) overlay.style.display = 'flex';
        },

        closeRelicModal() {
            this.activeRelicModal = false;
            this.currentActiveRelic = null;
            const overlay = document.getElementById('relic-modal-overlay');
            if (overlay) overlay.style.display = 'none';
        },

        updateRelicHUD() {
            const t = GameI18N[this.lang] || GameI18N.en;
            const relicBadge = document.getElementById('ips-stat-relics');
            if (relicBadge) {
                relicBadge.textContent = t.relicsBadge(this.collectedRelicsCount);
                relicBadge.style.color = this.collectedRelicsCount === 3 ? '#22c55e' : '#fbbf24';
            }
            const questDesc = document.getElementById('ips-quest-desc');
            if (questDesc) {
                if (this.collectedRelicsCount === 3) {
                    questDesc.textContent = t.questComplete;
                } else if (this.mode === 'SANDBOX') {
                    const blockCount = Object.keys(this.sandboxMap).length;
                    questDesc.textContent = t.questSandbox(blockCount);
                } else {
                    questDesc.textContent = t.questExploring(this.collectedRelicsCount);
                }
            }
        },

        addFloatingText(x, y, text, color='#fff') {
            this.floatingTexts.push({ x, y, text, color, alpha: 1, life: 45 });
        },

        addParticles(x, y, count=8, color='#a855f7') {
            for (let i = 0; i < count; i++) {
                this.particles.push({
                    x, y,
                    vx: (Math.random() - 0.5) * 6,
                    vy: (Math.random() - 0.5) * 6,
                    radius: Math.random() * 3 + 1.5,
                    color, life: 25, maxLife: 25
                });
            }
        },

        triggerAttack() {
            if (this.player.attackTimer > 0) return;
            AudioEngine.init();
            AudioEngine.playSlash();
            this.player.attackTimer = 18;
            this.player.comboStep = (this.player.comboStep + 1) % 3;

            const reach = 52;
            const slashX = this.player.facing === 1 ? this.player.x + this.player.w : this.player.x - reach;
            const slashY = this.player.y - 6;

            this.slashes.push({
                x: slashX, y: slashY, w: reach, h: this.player.h + 12,
                facing: this.player.facing, life: 14
            });

            this.enemies.forEach(en => {
                if (en.hp <= 0) return;
                const hit = (
                    slashX < en.x + en.w && slashX + reach > en.x &&
                    slashY < en.y + en.h && slashY + this.player.h + 12 > en.y
                );
                if (hit) {
                    const damage = 25 + Math.floor(Math.random() * 12);
                    en.hp -= damage; en.hitTimer = 12; en.vx = this.player.facing * 4;
                    AudioEngine.playHit();
                    this.addParticles(en.x + en.w/2, en.y + en.h/2, 10, '#f43f5e');
                    this.addFloatingText(en.x + en.w/2, en.y - 10, '-' + damage, '#fb7185');
                    if (en.hp <= 0) {
                        this.score += en.type === 'boss' ? 500 : 120;
                        this.addFloatingText(en.x, en.y - 25, (GameI18N[this.lang] || GameI18N.en).textDefeated, '#fbbf24');
                    }
                }
            });
        },

        triggerGlacialStrike() {
            if (this.player.glacialCooldown > 0) return;
            AudioEngine.init();
            AudioEngine.playGlacial();
            this.player.glacialCooldown = this.player.maxGlacialCd;
            const radius = 160;

            this.glacialBursts.push({
                x: this.player.x + this.player.w / 2,
                y: this.player.y + this.player.h / 2,
                radius: 10, maxRadius: radius, life: 25
            });

            this.enemies.forEach(en => {
                const dx = (en.x + en.w/2) - (this.player.x + this.player.w/2);
                const dy = (en.y + en.h/2) - (this.player.y + this.player.h/2);
                if (Math.sqrt(dx*dx + dy*dy) < radius) {
                    en.hp -= 45; en.frozen = 120; en.hitTimer = 15;
                    this.addParticles(en.x + en.w/2, en.y + en.h/2, 14, '#38bdf8');
                    this.addFloatingText(en.x, en.y - 15, (GameI18N[this.lang] || GameI18N.en).textFrozen, '#38bdf8');
                }
            });
        },

        update() {
            this.frameCount++;
            if (this.activeRelicModal) return; // Freeze game actions while examining IPS relic modal

            if (this.dimensionTransition > 0) this.dimensionTransition--;
            if (this.player.attackTimer > 0) this.player.attackTimer--;
            if (this.player.glacialCooldown > 0) this.player.glacialCooldown--;
            if (this.player.invulnerable > 0) this.player.invulnerable--;

            if (this.keys['KeyX'] || this.keys['KeyE'] || this.player.isShieldingBtn) {
                if (!this.player.shieldOverheated && this.player.shield > 0) {
                    this.player.isShielding = true;
                    this.player.shield = Math.max(0, this.player.shield - 0.45);
                    if (this.player.shield === 0) {
                        this.player.shieldOverheated = true;
                        this.player.shieldCooldown = 150;
                        AudioEngine.playHit();
                        this.addFloatingText(this.player.x, this.player.y - 20, (GameI18N[this.lang] || GameI18N.en).textGuardBroken, '#ef4444');
                    }
                } else this.player.isShielding = false;
            } else {
                this.player.isShielding = false;
                if (this.player.shieldCooldown > 0) {
                    this.player.shieldCooldown--;
                    if (this.player.shieldCooldown === 0) this.player.shieldOverheated = false;
                } else this.player.shield = Math.min(this.player.maxShield, this.player.shield + 0.35);
            }

            if (this.mode === '2D_PLATFORMER' || this.mode === 'SANDBOX') this.update2DPhysics();
            else if (this.mode === 'TOPDOWN_RPG') this.updateTopDownPhysics();

            this.slashes.forEach(s => s.life--);
            this.slashes = this.slashes.filter(s => s.life > 0);

            this.glacialBursts.forEach(b => {
                b.radius += (b.maxRadius - b.radius) * 0.25;
                b.life--;
            });
            this.glacialBursts = this.glacialBursts.filter(b => b.life > 0);

            this.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life--; });
            this.particles = this.particles.filter(p => p.life > 0);

            this.floatingTexts.forEach(t => { t.y -= 0.8; t.alpha = t.life / 45; t.life--; });
            this.floatingTexts = this.floatingTexts.filter(t => t.life > 0);

            if (this.mode === 'SANDBOX' && this.mouse.isDown) {
                const gx = Math.floor((this.mouse.x + this.camera.x) / this.gridSize);
                const gy = Math.floor((this.mouse.y + this.camera.y) / this.gridSize);
                if (gx >= 0 && gy >= 0 && gy < 15) {
                    if (this.sandboxMap[gx + ',' + gy] !== this.selectedTile) {
                        this.sandboxMap[gx + ',' + gy] = this.selectedTile;
                        this.updateRelicHUD();
                    }
                }
            } else if (this.mode === 'SANDBOX' && this.mouse.rightDown) {
                const gx = Math.floor((this.mouse.x + this.camera.x) / this.gridSize);
                const gy = Math.floor((this.mouse.y + this.camera.y) / this.gridSize);
                if (this.sandboxMap[gx + ',' + gy]) {
                    delete this.sandboxMap[gx + ',' + gy];
                    this.updateRelicHUD();
                }
            }
        },

        update2DPhysics() {
            let moveX = 0;
            if (this.keys['KeyA'] || this.keys['ArrowLeft'] || this.touchMove === -1) { moveX = -this.player.speed; this.player.facing = -1; }
            if (this.keys['KeyD'] || this.keys['ArrowRight'] || this.touchMove === 1) { moveX = this.player.speed; this.player.facing = 1; }
            if (this.player.isShielding) moveX *= 0.35;
            this.player.vx = moveX;

            if ((this.keys['KeyW'] || this.keys['ArrowUp'] || this.keys['Space'] || this.touchJump) && this.player.grounded) {
                this.player.vy = this.player.jumpStrength;
                this.player.grounded = false;
                this.touchJump = false;
                AudioEngine.init();
                AudioEngine.playJump();
                this.addParticles(this.player.x + this.player.w/2, this.player.y + this.player.h, 6, '#e2e8f0');
            }

            this.player.vy += this.player.gravity;
            if (this.player.vy > 14) this.player.vy = 14;

            this.player.x += this.player.vx;
            this.resolve2DCollisions('x');

            this.player.grounded = false;
            this.player.y += this.player.vy;
            this.resolve2DCollisions('y');

            if (this.player.x < 0) this.player.x = 0;
            if (this.player.y > 600) {
                this.player.x = 100; this.player.y = 200; this.player.vy = 0;
                this.player.hp = Math.max(1, this.player.hp - 20);
            }

            this.camera.x += (this.player.x - width / 2.5 - this.camera.x) * 0.08;
            if (this.camera.x < 0) this.camera.x = 0;

            this.stars.forEach(st => {
                if (!st.collected && this.player.x < st.x + 20 && this.player.x + this.player.w > st.x &&
                    this.player.y < st.y + 20 && this.player.y + this.player.h > st.y) {
                    st.collected = true; this.score += 100;
                    AudioEngine.playCoin();
                    this.addParticles(st.x, st.y, 10, '#fbbf24');
                    this.addFloatingText(st.x, st.y - 15, (GameI18N[this.lang] || GameI18N.en).textStarCollected, '#fbbf24');
                }
            });

            // Archaeological Relic Collision Check (2D Platformer)
            this.relics.forEach(relic => {
                if (relic.mode === '2D_PLATFORMER' && !relic.collected) {
                    if (this.player.x < relic.x + relic.w && this.player.x + this.player.w > relic.x &&
                        this.player.y < relic.y + relic.h && this.player.y + this.player.h > relic.y) {
                        relic.collected = true;
                        this.collectedRelicsCount++;
                        this.score += 250;
                        AudioEngine.init();
                        AudioEngine.playCoin();
                        this.addParticles(relic.x + relic.w/2, relic.y + relic.h/2, 16, '#fbbf24');
                        this.addFloatingText(relic.x, relic.y - 20, (GameI18N[this.lang] || GameI18N.en).textRelicUncovered, '#fbbf24');
                        this.updateRelicHUD();
                        this.showRelicModal(relic);
                    }
                }
            });

            this.portals.forEach(pt => {
                if (this.player.x < pt.x + pt.w && this.player.x + this.player.w > pt.x &&
                    this.player.y < pt.y + pt.h && this.player.y + this.player.h > pt.y) {
                    this.switchMode('TOPDOWN_RPG');
                }
            });

            this.enemies.forEach(en => {
                if (en.hp <= 0) return;
                if (en.hitTimer > 0) en.hitTimer--;
                if (en.frozen > 0) { en.frozen--; return; }

                en.x += en.vx;
                if (en.x < 200 || en.x > 950) en.vx *= -1;

                if (this.player.invulnerable <= 0 && this.player.x < en.x + en.w && this.player.x + this.player.w > en.x &&
                    this.player.y < en.y + en.h && this.player.y + this.player.h > en.y) {
                    if (this.player.isShielding) {
                        AudioEngine.playShield();
                        this.player.shield = Math.max(0, this.player.shield - 15);
                        this.addParticles(this.player.x + this.player.w/2, this.player.y + this.player.h/2, 6, '#38bdf8');
                        this.addFloatingText(this.player.x, this.player.y - 15, (GameI18N[this.lang] || GameI18N.en).textBlocked, '#38bdf8');
                        en.vx *= -1;
                    } else {
                        AudioEngine.playHit();
                        this.player.hp = Math.max(0, this.player.hp - 18);
                        this.player.invulnerable = 45; this.player.vy = -6; this.player.vx = en.vx > 0 ? 6 : -6;
                        this.addParticles(this.player.x + this.player.w/2, this.player.y + this.player.h/2, 10, '#ef4444');
                        this.addFloatingText(this.player.x, this.player.y - 20, '-18 HP', '#ef4444');
                    }
                }
            });
        },

        resolve2DCollisions(axis) {
            this.platforms2D.forEach(p => {
                if (this.player.x < p.x + p.w && this.player.x + this.player.w > p.x &&
                    this.player.y < p.y + p.h && this.player.y + this.player.h > p.y) {
                    if (axis === 'x') {
                        if (this.player.vx > 0) this.player.x = p.x - this.player.w;
                        else if (this.player.vx < 0) this.player.x = p.x + p.w;
                    } else if (axis === 'y') {
                        if (this.player.vy > 0) { this.player.y = p.y - this.player.h; this.player.vy = 0; this.player.grounded = true; }
                        else if (this.player.vy < 0) { this.player.y = p.y + p.h; this.player.vy = 0; }
                    }
                }
            });

            if (this.mode === 'SANDBOX') {
                for (let key in this.sandboxMap) {
                    const [gx, gy] = key.split(',').map(Number);
                    const tx = gx * this.gridSize, ty = gy * this.gridSize;
                    if (this.sandboxMap[key] === 1 || this.sandboxMap[key] === 2) {
                        if (this.player.x < tx + this.gridSize && this.player.x + this.player.w > tx &&
                            this.player.y < ty + this.gridSize && this.player.y + this.player.h > ty) {
                            if (axis === 'x') {
                                if (this.player.vx > 0) this.player.x = tx - this.player.w;
                                else if (this.player.vx < 0) this.player.x = tx + this.gridSize;
                            } else if (axis === 'y') {
                                if (this.player.vy > 0) { this.player.y = ty - this.player.h; this.player.vy = 0; this.player.grounded = true; }
                                else if (this.player.vy < 0) { this.player.y = ty + this.gridSize; this.player.vy = 0; }
                            }
                        }
                    }
                }
            }
        },

        updateTopDownPhysics() {
            let dx = 0, dy = 0;
            if (this.keys['KeyA'] || this.keys['a'] || this.keys['A'] || this.keys['ArrowLeft']) dx -= 1;
            if (this.keys['KeyD'] || this.keys['d'] || this.keys['D'] || this.keys['ArrowRight']) dx += 1;
            if (this.keys['KeyW'] || this.keys['w'] || this.keys['W'] || this.keys['ArrowUp']) dy -= 1;
            if (this.keys['KeyS'] || this.keys['s'] || this.keys['S'] || this.keys['ArrowDown']) dy += 1;

            if (dx !== 0 && dy !== 0) { dx *= 0.7071; dy *= 0.7071; }
            let spd = this.player.speed * (this.player.isShielding ? 0.4 : 1);
            this.player.x += dx * spd; this.player.y += dy * spd;
            if (dx !== 0) this.player.facing = dx > 0 ? 1 : -1;

            this.player.x = Math.max(40, Math.min(this.player.x, width - 40 - this.player.w));
            this.player.y = Math.max(40, Math.min(this.player.y, height - 40 - this.player.h));
            this.camera.x = 0;

            // Archaeological Relic Collision Check (Top-Down RPG)
            this.relics.forEach(relic => {
                if (relic.mode === 'TOPDOWN_RPG' && !relic.collected) {
                    if (this.player.x < relic.x + relic.w && this.player.x + this.player.w > relic.x &&
                        this.player.y < relic.y + relic.h && this.player.y + this.player.h > relic.y) {
                        relic.collected = true;
                        this.collectedRelicsCount++;
                        this.score += 250;
                        AudioEngine.init();
                        AudioEngine.playCoin();
                        this.addParticles(relic.x + relic.w/2, relic.y + relic.h/2, 16, '#fbbf24');
                        this.addFloatingText(relic.x, relic.y - 20, (GameI18N[this.lang] || GameI18N.en).textRelicUncovered, '#fbbf24');
                        this.updateRelicHUD();
                        this.showRelicModal(relic);
                    }
                }
            });

            this.enemies.forEach(en => {
                if (en.hp <= 0) return;
                if (en.hitTimer > 0) en.hitTimer--;
                if (en.frozen > 0) { en.frozen--; return; }

                const edx = (this.player.x + this.player.w/2) - (en.x + en.w/2);
                const edy = (this.player.y + this.player.h/2) - (en.y + en.h/2);
                const dist = Math.sqrt(edx*edx + edy*edy);

                if (dist > 8) {
                    const eSpeed = en.type === 'boss' ? 1.8 : 2.4;
                    en.x += (edx / dist) * eSpeed;
                    en.y += (edy / dist) * eSpeed;
                    en.facing = edx > 0 ? 1 : -1;
                }

                if (this.player.invulnerable <= 0 && this.player.x < en.x + en.w && this.player.x + this.player.w > en.x &&
                    this.player.y < en.y + en.h && this.player.y + this.player.h > en.y) {
                    if (this.player.isShielding) {
                        AudioEngine.playShield();
                        this.player.shield = Math.max(0, this.player.shield - 20);
                        this.addParticles(this.player.x + this.player.w/2, this.player.y + this.player.h/2, 8, '#38bdf8');
                        this.addFloatingText(this.player.x, this.player.y - 15, (GameI18N[this.lang] || GameI18N.en).textBlocked, '#38bdf8');
                    } else {
                        AudioEngine.playHit();
                        const dmg = en.type === 'boss' ? 26 : 14;
                        this.player.hp = Math.max(0, this.player.hp - dmg);
                        this.player.invulnerable = 45;
                        this.addParticles(this.player.x + this.player.w/2, this.player.y + this.player.h/2, 10, '#ef4444');
                        this.addFloatingText(this.player.x, this.player.y - 20, '-' + dmg + ' HP', '#ef4444');
                    }
                }
            });
        },

        render() {
            ctx.clearRect(0, 0, width, height);
            if (this.mode === '2D_PLATFORMER' || this.mode === 'SANDBOX') this.render2D();
            else if (this.mode === 'TOPDOWN_RPG') this.renderTopDown();
            this.renderCombatFX();
            this.renderHUD();

            if (this.dimensionTransition > 0) {
                ctx.fillStyle = 'rgba(168, 85, 247, ' + (this.dimensionTransition / 25 * 0.4) + ')';
                ctx.fillRect(0, 0, width, height);
            }
        },

        render2D() {
            const camX = this.camera.x;
            const grad = ctx.createLinearGradient(0, 0, 0, height);
            grad.addColorStop(0, '#060714'); grad.addColorStop(0.6, '#13112b'); grad.addColorStop(1, '#231846');
            ctx.fillStyle = grad; ctx.fillRect(0, 0, width, height);

            ctx.fillStyle = '#ffffff';
            for (let i = 0; i < 40; i++) {
                const sx = (i * 47 - camX * 0.15) % width;
                const sy = (i * 29) % 260;
                ctx.fillRect(sx < 0 ? sx + width : sx, sy, 2, 2);
            }

            ctx.fillStyle = 'rgba(76, 29, 149, 0.35)';
            ctx.beginPath(); ctx.moveTo(0, height);
            for (let x = 0; x <= width; x += 80) {
                const my = 280 + Math.sin((x + camX * 0.3) * 0.015) * 45;
                ctx.lineTo(x, my);
            }
            ctx.lineTo(width, height); ctx.fill();

            this.platforms2D.forEach(p => {
                const rx = p.x - camX;
                if (rx + p.w > 0 && rx < width) {
                    ctx.fillStyle = p.type === 1 ? '#1e1b4b' : '#312e81';
                    ctx.fillRect(rx, p.y, p.w, p.h);
                    ctx.fillStyle = p.type === 1 ? '#a855f7' : '#38bdf8';
                    ctx.fillRect(rx, p.y, p.w, 4);
                }
            });

            if (this.mode === 'SANDBOX') {
                ctx.strokeStyle = 'rgba(168, 85, 247, 0.12)'; ctx.lineWidth = 1;
                for (let x = 0; x < width; x += this.gridSize) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke(); }
                for (let y = 0; y < height; y += this.gridSize) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }

                for (let key in this.sandboxMap) {
                    const [gx, gy] = key.split(',').map(Number);
                    const tx = gx * this.gridSize - camX, ty = gy * this.gridSize;
                    const type = this.sandboxMap[key];
                    if (type === 1) {
                        ctx.fillStyle = '#334155'; ctx.fillRect(tx, ty, this.gridSize, this.gridSize);
                        ctx.strokeStyle = '#64748b'; ctx.strokeRect(tx, ty, this.gridSize, this.gridSize);
                    } else if (type === 2) {
                        ctx.fillStyle = '#4c1d95'; ctx.fillRect(tx, ty, this.gridSize, this.gridSize);
                        ctx.fillStyle = '#a855f7'; ctx.fillRect(tx + 4, ty + 4, this.gridSize - 8, 4);
                    } else if (type === 3) {
                        ctx.fillStyle = '#ef4444'; ctx.beginPath();
                        ctx.moveTo(tx, ty + this.gridSize); ctx.lineTo(tx + this.gridSize / 2, ty + 6); ctx.lineTo(tx + this.gridSize, ty + this.gridSize); ctx.fill();
                    } else if (type === 4) {
                        ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(tx + 16, ty + 16, 8, 0, Math.PI * 2); ctx.fill();
                    }
                }
                const mx = Math.floor((this.mouse.x + camX) / this.gridSize) * this.gridSize - camX;
                const my = Math.floor(this.mouse.y / this.gridSize) * this.gridSize;
                ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 2; ctx.strokeRect(mx, my, this.gridSize, this.gridSize);
            }

            this.stars.forEach(st => {
                if (!st.collected) {
                    const rx = st.x - camX;
                    ctx.save(); ctx.fillStyle = '#fbbf24'; ctx.shadowBlur = 10; ctx.shadowColor = '#fbbf24';
                    ctx.beginPath(); ctx.arc(rx + 10, st.y + 10, 8, 0, Math.PI * 2); ctx.fill(); ctx.restore();
                }
            });

            this.portals.forEach(pt => {
                const rx = pt.x - camX;
                pt.rot = (pt.rot || 0) + 0.05;
                ctx.save(); ctx.translate(rx + pt.w/2, pt.y + pt.h/2); ctx.rotate(pt.rot);
                ctx.fillStyle = 'rgba(56, 189, 248, 0.4)'; ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 3;
                ctx.beginPath(); ctx.ellipse(0, 0, 24, 36, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore();
                ctx.fillStyle = '#38bdf8'; ctx.font = '10px monospace'; ctx.fillText((GameI18N[this.lang] || GameI18N.en).textWarp, rx - 10, pt.y - 10);
            });

            // Archaeological Relics in 2D Plane (IPS Field Research Factor)
            this.relics.forEach(relic => {
                if (relic.mode === '2D_PLATFORMER' && !relic.collected) {
                    const rx = relic.x - camX;
                    if (rx + relic.w > -40 && rx < width + 40) {
                        const now = Date.now();
                        const bob = Math.sin(now * 0.005) * 4;
                        const auraGlow = Math.sin(now * 0.008) * 6 + 12;

                        ctx.save();
                        // Ancient Stone Pedestal
                        ctx.fillStyle = '#1e1b4b';
                        ctx.fillRect(rx + 2, relic.y + relic.h - 4, relic.w - 4, 6);
                        ctx.fillStyle = '#fbbf24';
                        ctx.fillRect(rx, relic.y + relic.h - 2, relic.w, 3);

                        // Pulsing Relic Aura Halo
                        ctx.shadowBlur = auraGlow;
                        ctx.shadowColor = '#fbbf24';
                        ctx.fillStyle = 'rgba(251, 191, 36, 0.22)';
                        ctx.beginPath();
                        ctx.arc(rx + relic.w / 2, relic.y + relic.h / 2 + bob, 15, 0, Math.PI * 2);
                        ctx.fill();

                        // Relic Inscription / Glyph
                        ctx.font = '16px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(relic.icon || '🏛️', rx + relic.w / 2, relic.y + relic.h / 2 + bob);

                        // Identification Badge
                        ctx.shadowBlur = 0;
                        ctx.font = 'bold 9px monospace';
                        ctx.fillStyle = '#fbbf24';
                        ctx.fillText((GameI18N[this.lang] || GameI18N.en).textCodex, rx + relic.w / 2, relic.y - 8 + bob);
                        ctx.restore();
                    }
                }
            });

            this.enemies.forEach(en => {
                if (en.hp <= 0) return;
                const rx = en.x - camX;
                ctx.fillStyle = en.frozen > 0 ? '#38bdf8' : (en.hitTimer > 0 ? '#ffffff' : (en.type === 'knight' ? '#e11d48' : '#10b981'));
                ctx.fillRect(rx, en.y, en.w, en.h);
                ctx.fillStyle = '#000';
                const eyeOffset = en.facing === 1 ? en.w - 10 : 4;
                ctx.fillRect(rx + eyeOffset, en.y + 6, 4, 4);
                ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(rx, en.y - 8, en.w, 4);
                ctx.fillStyle = '#22c55e'; ctx.fillRect(rx, en.y - 8, (en.hp / en.maxHp) * en.w, 4);
            });

            const px = this.player.x - camX;
            this.renderPlayerSprite(px, this.player.y);
        },

        renderTopDown() {
            ctx.fillStyle = '#0b0c16'; ctx.fillRect(0, 0, width, height);
            ctx.strokeStyle = 'rgba(99, 102, 241, 0.12)'; ctx.lineWidth = 1;
            for (let x = 40; x < width - 40; x += 40) { ctx.beginPath(); ctx.moveTo(x, 40); ctx.lineTo(x, height - 40); ctx.stroke(); }
            for (let y = 40; y < height - 40; y += 40) { ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(width - 40, y); ctx.stroke(); }

            ctx.strokeStyle = '#8b5cf6'; ctx.lineWidth = 4; ctx.shadowBlur = 12; ctx.shadowColor = '#8b5cf6';
            ctx.strokeRect(38, 38, width - 76, height - 76); ctx.shadowBlur = 0;

            // Archaeological Relics in TopDown Plane (IPS Field Research Factor)
            this.relics.forEach(relic => {
                if (relic.mode === 'TOPDOWN_RPG' && !relic.collected) {
                    const now = Date.now();
                    const bob = Math.sin(now * 0.005) * 3;
                    const auraGlow = Math.sin(now * 0.008) * 8 + 14;

                    ctx.save();
                    // Ground Shadow
                    ctx.beginPath();
                    ctx.ellipse(relic.x + relic.w / 2, relic.y + relic.h + 2, 14, 5, 0, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(0,0,0,0.5)';
                    ctx.fill();

                    // Relic Aura & Tablet
                    ctx.shadowBlur = auraGlow;
                    ctx.shadowColor = '#fbbf24';
                    ctx.fillStyle = 'rgba(251, 191, 36, 0.22)';
                    ctx.beginPath();
                    ctx.arc(relic.x + relic.w / 2, relic.y + relic.h / 2 + bob, 17, 0, Math.PI * 2);
                    ctx.fill();

                    // Ancient Stone Slab
                    ctx.fillStyle = '#1e1b4b';
                    ctx.strokeStyle = '#fbbf24';
                    ctx.lineWidth = 2;
                    ctx.fillRect(relic.x, relic.y + bob, relic.w, relic.h);
                    ctx.strokeRect(relic.x, relic.y + bob, relic.w, relic.h);

                    // Icon / Glyph
                    ctx.font = '16px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(relic.icon || '📜', relic.x + relic.w / 2, relic.y + relic.h / 2 + bob);

                    // Badge
                    ctx.shadowBlur = 0;
                    ctx.font = 'bold 9px monospace';
                    ctx.fillStyle = '#fbbf24';
                    ctx.fillText((GameI18N[this.lang] || GameI18N.en).textCodexTablet, relic.x + relic.w / 2, relic.y - 8 + bob);
                    ctx.restore();
                }
            });

            this.enemies.forEach(en => {
                if (en.hp <= 0) return;
                ctx.beginPath(); ctx.ellipse(en.x + en.w/2, en.y + en.h - 2, en.w/2, 6, 0, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fill();
                ctx.fillStyle = en.frozen > 0 ? '#38bdf8' : (en.hitTimer > 0 ? '#ffffff' : (en.type === 'boss' ? '#9333ea' : '#dc2626'));
                ctx.fillRect(en.x, en.y, en.w, en.h);
                ctx.fillStyle = '#fff';
                const eyeX = en.facing === 1 ? en.x + en.w - 10 : en.x + 4;
                ctx.fillRect(eyeX, en.y + 8, 5, 5);
                ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(en.x, en.y - 10, en.w, 5);
                ctx.fillStyle = en.type === 'boss' ? '#ec4899' : '#22c55e';
                ctx.fillRect(en.x, en.y - 10, (en.hp / en.maxHp) * en.w, 5);
                if (en.type === 'boss') { ctx.fillStyle = '#ec4899'; ctx.font = '10px monospace'; ctx.fillText((GameI18N[this.lang] || GameI18N.en).textBoss, en.x - 10, en.y - 14); }
            });

            this.renderPlayerSprite(this.player.x, this.player.y);
        },

        renderPlayerSprite(x, y) {
            ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath();
            ctx.ellipse(x + this.player.w/2, y + this.player.h, 14, 5, 0, 0, Math.PI * 2); ctx.fill();
            if (this.player.invulnerable > 0 && Math.floor(this.player.invulnerable / 4) % 2 === 0) return;

            ctx.fillStyle = '#7c3aed'; ctx.fillRect(x, y, this.player.w, this.player.h);
            ctx.fillStyle = '#a855f7'; ctx.fillRect(x + 4, y + 8, this.player.w - 8, 20);
            ctx.fillStyle = '#38bdf8'; ctx.shadowBlur = 8; ctx.shadowColor = '#38bdf8';
            const eyeX = this.player.facing === 1 ? x + this.player.w - 12 : x + 4;
            ctx.fillRect(eyeX, y + 8, 8, 5); ctx.shadowBlur = 0;

            if (this.player.isShielding) {
                ctx.save(); ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 3; ctx.shadowBlur = 15; ctx.shadowColor = '#38bdf8';
                ctx.beginPath(); ctx.arc(x + this.player.w/2, y + this.player.h/2, 28, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
            }
        },

        renderCombatFX() {
            this.slashes.forEach(s => {
                const sx = s.x - (this.mode === 'TOPDOWN_RPG' ? 0 : this.camera.x);
                ctx.save(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4; ctx.shadowBlur = 12; ctx.shadowColor = '#a855f7';
                ctx.beginPath();
                if (s.facing === 1) ctx.arc(sx, s.y + s.h/2, s.w/1.2, -Math.PI/3, Math.PI/3);
                else ctx.arc(sx + s.w, s.y + s.h/2, s.w/1.2, Math.PI*2/3, Math.PI*4/3);
                ctx.stroke(); ctx.restore();
            });

            this.glacialBursts.forEach(b => {
                const bx = b.x - (this.mode === 'TOPDOWN_RPG' ? 0 : this.camera.x);
                ctx.save(); ctx.fillStyle = 'rgba(56, 189, 248, 0.2)'; ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 3; ctx.shadowBlur = 20; ctx.shadowColor = '#38bdf8';
                ctx.beginPath(); ctx.arc(bx, b.y, b.radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore();
            });

            this.particles.forEach(p => {
                const px = p.x - (this.mode === 'TOPDOWN_RPG' ? 0 : this.camera.x);
                ctx.fillStyle = p.color; ctx.globalAlpha = p.life / p.maxLife; ctx.fillRect(px, p.y, p.radius, p.radius); ctx.globalAlpha = 1;
            });

            this.floatingTexts.forEach(t => {
                const tx = t.x - (this.mode === 'TOPDOWN_RPG' ? 0 : this.camera.x);
                ctx.font = 'bold 12px monospace'; ctx.fillStyle = t.color; ctx.globalAlpha = t.alpha;
                ctx.fillText(t.text, tx, t.y); ctx.globalAlpha = 1;
            });
        },

        showTelemetry: false,
        fpsHistory: [],
        lastFrameTime: performance.now(),
        currentFps: 60,

        renderHUD() {
            ctx.fillStyle = 'rgba(6, 7, 14, 0.85)'; ctx.strokeStyle = 'rgba(168, 85, 247, 0.3)'; ctx.lineWidth = 1;
            ctx.fillRect(10, 10, width - 20, 48); ctx.strokeRect(10, 10, width - 20, 48);

            ctx.fillStyle = '#94a3b8'; ctx.font = '10px monospace'; ctx.fillText('HP', 22, 28);
            ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(42, 20, 120, 10);
            ctx.fillStyle = '#22c55e'; ctx.fillRect(42, 20, (this.player.hp / this.player.maxHp) * 120, 10);

            const _tHud = GameI18N[this.lang] || GameI18N.en;
            ctx.fillStyle = '#94a3b8'; ctx.fillText(_tHud.textShield, 22, 48);
            ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(72, 40, 90, 8);
            ctx.fillStyle = this.player.shieldOverheated ? '#ef4444' : '#38bdf8';
            ctx.fillRect(72, 40, (this.player.shield / this.player.maxShield) * 90, 8);

            const cdPct = this.player.glacialCooldown / this.player.maxGlacialCd;
            ctx.fillStyle = cdPct > 0 ? 'rgba(56, 189, 248, 0.2)' : 'rgba(56, 189, 248, 0.7)';
            ctx.fillRect(180, 18, 32, 32); ctx.strokeStyle = '#38bdf8'; ctx.strokeRect(180, 18, 32, 32);
            ctx.fillStyle = '#fff'; ctx.font = 'bold 11px monospace'; ctx.fillText('[C]', 188, 38);
            if (cdPct > 0) { ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(180, 18, 32, 32 * cdPct); }

            ctx.fillStyle = '#a855f7'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center';
            ctx.fillText('MODE: ' + this.mode.replace('_', ' '), width / 2, 38); ctx.textAlign = 'left';

            ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 13px monospace'; ctx.fillText(_tHud.textScore + this.score, width - 180, 32);
            ctx.fillStyle = '#38bdf8'; ctx.font = '10px monospace'; ctx.fillText(Math.round(this.currentFps) + _tHud.textFpsDelta, width - 180, 48);

            // ================= SOCIAL STUDIES CARTOGRAPHIC HUD RIBBON =================
            ctx.fillStyle = 'rgba(8, 12, 26, 0.9)';
            ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
            ctx.lineWidth = 1;
            ctx.fillRect(10, 62, width - 20, 22);
            ctx.strokeRect(10, 62, width - 20, 22);

            const t = GameI18N[this.lang] || GameI18N.en;
            let cartoLeft = '';
            let cartoRight = '';
            let mapBadgeText = '';

            if (this.mode === '2D_PLATFORMER') {
                const elev = Math.round((420 - this.player.y) * 1.6 + 60);
                cartoLeft = t.elevLabel(elev);
                cartoRight = t.elevMap;
                mapBadgeText = t.elevDomBadge(elev);
            } else if (this.mode === 'TOPDOWN_RPG') {
                const lat = (3.1390 + (this.player.y * 0.00015)).toFixed(4);
                const lon = (101.6869 + (this.player.x * 0.00018)).toFixed(4);
                cartoLeft = t.gpsLabel(lat, lon);
                cartoRight = t.gpsMap;
                mapBadgeText = t.gpsDomBadge(lat, lon);
            } else if (this.mode === 'SANDBOX') {
                const blockCount = Object.keys(this.sandboxMap).length;
                cartoLeft = t.civicLabel(blockCount);
                cartoRight = t.civicMap;
                mapBadgeText = t.civicDomBadge;
            }

            ctx.fillStyle = '#fbbf24';
            ctx.font = 'bold 10px monospace';
            ctx.fillText(cartoLeft, 20, 77);

            ctx.fillStyle = '#38bdf8';
            ctx.font = 'bold 9px monospace';
            ctx.textAlign = 'right';
            ctx.fillText(cartoRight, width - 20, 77);
            ctx.textAlign = 'left';

            // Sync DOM cartographic tracker badge
            const cartoDom = document.getElementById('ips-stat-carto');
            if (cartoDom && (this.frameCount % 8 === 0)) {
                cartoDom.textContent = mapBadgeText;
            }

            if (this.showTelemetry) {
                this.renderTelemetryHUD();
            }
        },

        renderTelemetryHUD() {
            ctx.save();
            const panelW = 230, panelH = 155;
            const px = width - panelW - 10, py = 90;

            ctx.fillStyle = 'rgba(6, 8, 18, 0.92)';
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1;
            ctx.fillRect(px, py, panelW, panelH);
            ctx.strokeRect(px, py, panelW, panelH);

            const _tTel = GameI18N[this.lang] || GameI18N.en;
            ctx.fillStyle = '#38bdf8';
            ctx.font = 'bold 11px monospace';
            ctx.fillText(_tTel.telemetryHeader, px + 10, py + 18);

            ctx.fillStyle = '#cbd5e1';
            ctx.font = '10px monospace';
            ctx.fillText(`${_tTel.telemetryMode}${this.mode}`, px + 10, py + 34);
            ctx.fillText(`${_tTel.telemetryPlayerPos}(${Math.round(this.player.x)}, ${Math.round(this.player.y)})`, px + 10, py + 48);
            ctx.fillText(`${_tTel.telemetryVel}(${this.player.vx.toFixed(1)}, ${this.player.vy.toFixed(1)})`, px + 10, py + 62);
            ctx.fillText(`${_tTel.telemetryParticles}${this.particles.length}`, px + 10, py + 76);
            ctx.fillText(`${_tTel.telemetryEnemies}${this.enemies.length}`, px + 10, py + 90);
            ctx.fillText(_tTel.telemetryMemory, px + 10, py + 104);

            // Live FPS sparkline graph
            ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.fillRect(px + 10, py + 112, panelW - 20, 32);
            ctx.strokeStyle = '#22c55e';
            ctx.beginPath();
            const graphX = px + 10;
            const graphY = py + 140;
            const stepW = (panelW - 20) / Math.max(1, this.fpsHistory.length - 1);
            for (let i = 0; i < this.fpsHistory.length; i++) {
                const normalized = Math.min(Math.max((this.fpsHistory[i] - 30) / 40, 0), 1);
                const gx = graphX + i * stepW;
                const gy = graphY - normalized * 26;
                if (i === 0) ctx.moveTo(gx, gy);
                else ctx.lineTo(gx, gy);
            }
            ctx.stroke();
            ctx.fillStyle = '#22c55e';
            ctx.font = '9px monospace';
            ctx.fillText((GameI18N[this.lang] || GameI18N.en).telemetryFpsGraph, px + 15, py + 124);
            ctx.restore();
        },

        updateUIButtons() {
            document.querySelectorAll('.game-mode-btn').forEach(btn => {
                btn.classList.toggle('active', btn.getAttribute('data-mode') === this.mode);
            });
            const palette = document.getElementById('sandbox-palette');
            if (palette) palette.style.display = this.mode === 'SANDBOX' ? 'flex' : 'none';
        },

        bindEvents() {
            window.addEventListener('keydown', e => {
                if (this.activeRelicModal && (e.code === 'Space' || e.code === 'Enter' || e.code === 'Escape')) {
                    e.preventDefault();
                    this.closeRelicModal();
                    return;
                }

                this.keys[e.code] = true;
                if (e.key) {
                    this.keys[e.key.toLowerCase()] = true;
                    this.keys[e.key.toUpperCase()] = true;
                }

                if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) {
                    const activeTag = document.activeElement ? document.activeElement.tagName : '';
                    if (activeTag !== 'INPUT' && activeTag !== 'TEXTAREA') {
                        e.preventDefault();
                    }
                }

                if (e.code === 'Tab') {
                    if (this.mode === '2D_PLATFORMER') this.switchMode('TOPDOWN_RPG');
                    else if (this.mode === 'TOPDOWN_RPG') this.switchMode('SANDBOX');
                    else this.switchMode('2D_PLATFORMER');
                }
                if (e.code === 'KeyZ' || e.key === 'z' || e.key === 'Z') this.triggerAttack();
                if (e.code === 'KeyC' || e.key === 'c' || e.key === 'C') this.triggerGlacialStrike();
            });

            window.addEventListener('keyup', e => {
                this.keys[e.code] = false;
                if (e.key) {
                    this.keys[e.key.toLowerCase()] = false;
                    this.keys[e.key.toUpperCase()] = false;
                }
            });

            const closeRelicBtn = document.getElementById('btn-close-relic');
            if (closeRelicBtn) {
                closeRelicBtn.addEventListener('click', () => {
                    this.closeRelicModal();
                });
            }

            canvas.addEventListener('mousedown', e => {
                const rect = canvas.getBoundingClientRect();
                this.mouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
                this.mouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
                if (e.button === 0) {
                    this.mouse.isDown = true;
                    if (this.mode !== 'SANDBOX') this.triggerAttack();
                } else if (e.button === 2) this.mouse.rightDown = true;
            });

            canvas.addEventListener('mousemove', e => {
                const rect = canvas.getBoundingClientRect();
                this.mouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
                this.mouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
            });

            window.addEventListener('mouseup', () => { this.mouse.isDown = false; this.mouse.rightDown = false; });
            canvas.addEventListener('contextmenu', e => e.preventDefault());

            document.querySelectorAll('.game-mode-btn').forEach(btn => {
                btn.addEventListener('click', () => this.switchMode(btn.getAttribute('data-mode')));
            });

            const attackBtn = document.getElementById('btn-game-attack');
            if (attackBtn) attackBtn.addEventListener('click', () => this.triggerAttack());

            const skillBtn = document.getElementById('btn-game-skill');
            if (skillBtn) skillBtn.addEventListener('click', () => this.triggerGlacialStrike());

            const shieldBtn = document.getElementById('btn-game-shield');
            if (shieldBtn) {
                shieldBtn.addEventListener('mousedown', () => { this.player.isShieldingBtn = true; });
                shieldBtn.addEventListener('mouseup', () => { this.player.isShieldingBtn = false; });
                shieldBtn.addEventListener('touchstart', (e) => { e.preventDefault(); this.player.isShieldingBtn = true; });
                shieldBtn.addEventListener('touchend', () => { this.player.isShieldingBtn = false; });
            }

            const restartBtn = document.getElementById('btn-game-restart');
            if (restartBtn) restartBtn.addEventListener('click', () => {
                this.player.hp = 100; this.player.shield = 100; this.score = 0;
                this.collectedRelicsCount = 0;
                this.setupInitialLevels();
                this.updateRelicHUD();
                this.closeRelicModal();
                this.addFloatingText(this.player.x, this.player.y - 20, (GameI18N[this.lang] || GameI18N.en).textExpeditionReset, '#22c55e');
            });

            const soundBtn = document.getElementById('btn-game-sound');
            if (soundBtn) {
                soundBtn.addEventListener('click', () => {
                    AudioEngine.init();
                    AudioEngine.muted = !AudioEngine.muted;
                    const _t = GameI18N[this.lang] || GameI18N.en;
                    soundBtn.textContent = AudioEngine.muted ? _t.sfxOff : _t.sfxOn;
                });
            }

            const bgmBtn = document.getElementById('btn-game-bgm');
            if (bgmBtn) {
                bgmBtn.addEventListener('click', () => {
                    const isPlaying = AudioEngine.toggleBGM();
                    const _t = GameI18N[this.lang] || GameI18N.en;
                    bgmBtn.textContent = isPlaying ? _t.bgmOn : _t.bgmOff;
                    bgmBtn.classList.toggle('active', isPlaying);
                });
            }

            const telemetryBtn = document.getElementById('btn-game-telemetry');
            if (telemetryBtn) {
                telemetryBtn.addEventListener('click', () => {
                    this.showTelemetry = !this.showTelemetry;
                    telemetryBtn.classList.toggle('active', this.showTelemetry);
                    const _t = GameI18N[this.lang] || GameI18N.en;
                    telemetryBtn.textContent = this.showTelemetry ? _t.telemetryOn : _t.telemetryOff;
                });
            }

            const fullscreenBtn = document.getElementById('btn-game-fullscreen');
            const canvasContainer = document.querySelector('.game-canvas-container');
            if (fullscreenBtn && canvasContainer) {
                fullscreenBtn.addEventListener('click', () => {
                    const isFs = canvasContainer.classList.toggle('fullscreen-mode');
                    const _t = GameI18N[this.lang] || GameI18N.en;
                    fullscreenBtn.textContent = isFs ? _t.fsExit : _t.fsEnter;
                    if (isFs) {
                        document.body.style.overflow = 'hidden';
                    } else {
                        document.body.style.overflow = '';
                    }
                });

                // Escape key exits fullscreen
                window.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape' && canvasContainer.classList.contains('fullscreen-mode')) {
                        canvasContainer.classList.remove('fullscreen-mode');
                        const _t = GameI18N[this.lang] || GameI18N.en;
                        fullscreenBtn.textContent = _t.fsEnter;
                        document.body.style.overflow = '';
                    }
                });
            }

            document.querySelectorAll('.sandbox-tile-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.sandbox-tile-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.selectedTile = parseInt(btn.getAttribute('data-tile'), 10);
                });
            });

            // Virtual Mobile D-Pad Handlers
            const bindTouchBtn = (id, keyName) => {
                const el = document.getElementById(id);
                if (!el) return;
                const setKey = (val, e) => {
                    if (e) e.preventDefault();
                    this.keys[keyName] = val;
                    el.classList.toggle('pressed', val);
                };
                el.addEventListener('touchstart', (e) => setKey(true, e), { passive: false });
                el.addEventListener('touchend', (e) => setKey(false, e), { passive: false });
                el.addEventListener('mousedown', (e) => setKey(true, e));
                el.addEventListener('mouseup', (e) => setKey(false, e));
                el.addEventListener('mouseleave', (e) => setKey(false, e));
            };

            bindTouchBtn('dpad-up', 'ArrowUp');
            bindTouchBtn('dpad-down', 'ArrowDown');
            bindTouchBtn('dpad-left', 'ArrowLeft');
            bindTouchBtn('dpad-right', 'ArrowRight');
            bindTouchBtn('touch-btn-jump', 'Space');

            const touchAtk = document.getElementById('touch-btn-attack');
            if (touchAtk) {
                touchAtk.addEventListener('touchstart', (e) => { e.preventDefault(); this.triggerAttack(); }, { passive: false });
                touchAtk.addEventListener('click', () => this.triggerAttack());
            }

            const touchShield = document.getElementById('touch-btn-shield');
            if (touchShield) {
                touchShield.addEventListener('touchstart', (e) => { e.preventDefault(); this.player.isShieldingBtn = true; }, { passive: false });
                touchShield.addEventListener('touchend', (e) => { e.preventDefault(); this.player.isShieldingBtn = false; }, { passive: false });
                touchShield.addEventListener('mousedown', () => { this.player.isShieldingBtn = true; });
                touchShield.addEventListener('mouseup', () => { this.player.isShieldingBtn = false; });
            }

            const touchSkill = document.getElementById('touch-btn-skill');
            if (touchSkill) {
                touchSkill.addEventListener('touchstart', (e) => { e.preventDefault(); this.triggerGlacialStrike(); }, { passive: false });
                touchSkill.addEventListener('click', () => this.triggerGlacialStrike());
            }

            // Tab Visibility & Focus State Management (Freeze when not in active tab)
            document.addEventListener('visibilitychange', () => {
                this.isTabFocused = !document.hidden;
                if (!this.isTabFocused) {
                    this.keys = {};
                    this.player.isShieldingBtn = false;
                }
            });
            window.addEventListener('blur', () => {
                this.isTabFocused = false;
                this.keys = {};
                this.player.isShieldingBtn = false;
            });
            window.addEventListener('focus', () => {
                this.isTabFocused = true;
            });

            // Global Language Synchronization Event
            window.addEventListener('tas-lang-change', (e) => {
                if (e.detail && e.detail.lang) {
                    this.setLanguage(e.detail.lang);
                }
            });
        },

        isTabFocused: true,

        renderPauseOverlay() {
            const t = GameI18N[this.lang] || GameI18N.en;
            ctx.save();
            ctx.fillStyle = 'rgba(4, 5, 10, 0.85)';
            ctx.fillRect(0, 0, width, height);

            ctx.fillStyle = '#a855f7';
            ctx.font = 'bold 22px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(t.textPauseTitle, width / 2, height / 2 - 15);

            ctx.fillStyle = '#38bdf8';
            ctx.font = '13px monospace';
            ctx.fillText(t.textPauseSub, width / 2, height / 2 + 18);
            ctx.restore();
        },

        loop() {
            const now = performance.now();
            const delta = now - this.lastFrameTime;
            this.lastFrameTime = now;
            if (delta > 0) {
                const fps = 1000 / delta;
                this.currentFps = this.currentFps * 0.9 + fps * 0.1;
                this.fpsHistory.push(fps);
                if (this.fpsHistory.length > 30) this.fpsHistory.shift();
            }

            if (this.isTabFocused) {
                this.update();
                this.render();
            } else {
                this.renderPauseOverlay();
            }
            requestAnimationFrame(() => this.loop());
        }
    };

    window.AwaitingStarsGame = Game;
    window.addEventListener('load', () => Game.init());
})();
