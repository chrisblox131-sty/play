/**
 * The Awaiting Stars: Two Worlds, One Destiny
 * Mobile Word Typist Arcade Engine (HTML5 Canvas + Web Audio API)
 * Features: On-screen QWERTY touch keyboard, 1.5x slower mobile speed,
 * Waves 1-25, Boss Waves, Natural Science vocabulary (Bio, Chem, Phys).
 */

(function(window) {
    'use strict';

    const VOCAB = {
        tier1: [
            ["RIVER", "Geography", "Natural flowing watercourse"],
            ["OCEAN", "Geography", "Vast body of salt water"],
            ["VALLEY", "Geography", "Low land between mountains"],
            ["DESERT", "Geography", "Arid landscape with little rain"],
            ["TUNDRA", "Geography", "Vast treeless arctic plain"],
            ["CANYON", "Geography", "Deep gorge carved by a river"],
            ["PLATEAU", "Geography", "Elevated level ground"],
            ["FOREST", "Geography", "Dense area dominated by trees"],
            ["ISLAND", "Geography", "Land surrounded by water"],
            ["SUMMIT", "Geography", "Highest point of a mountain"],
            ["GLACIER", "Geography", "Moving mass of ice"],
            ["SAVANNA", "Geography", "Grassy tropical plain"],
            ["CORAL", "Geography", "Marine calcium reef structure"],
            ["OASIS", "Geography", "Fertile desert water spring"]
        ],
        tier2: [
            ["TRADE", "Economics", "Exchange of goods and services"],
            ["MARKET", "Economics", "Arena for commercial exchange"],
            ["TARIFF", "Economics", "Tax imposed on imports"],
            ["COMMERCE", "Economics", "Activity of buying and selling"],
            ["SUPPLY", "Economics", "Total amount of a good available"],
            ["DEMAND", "Economics", "Consumer desire to purchase goods"],
            ["CURRENCY", "Economics", "System of money in common use"],
            ["CAPITAL", "Economics", "Wealth in money or assets"],
            ["RESOURCE", "Economics", "Stock of materials or assets"],
            ["LABOR", "Economics", "Human physical and mental effort"]
        ],
        tier3: [
            ["CITIZEN", "Civics", "Legally recognized subject of a state"],
            ["BALLOT", "Civics", "Device used to cast votes"],
            ["STATUTE", "Civics", "Written law passed by legislature"],
            ["JUSTICE", "Civics", "Fair and equitable treatment"],
            ["SENATE", "Civics", "Deliberative assembly or council"],
            ["TREATY", "Civics", "Formally ratified international pact"],
            ["REPUBLIC", "Civics", "State where supreme power is held by people"],
            ["CHARTER", "Civics", "Written grant of rights or privileges"]
        ],
        science: [
            // Biology
            ["PHOTOSYNTHESIS", "Biology", "Plants synthesize food from sunlight & CO2"],
            ["CHLOROPHYLL", "Biology", "Photosynthetic pigment absorbing sunlight"],
            ["MITOSIS", "Biology", "Cell division creating identical nuclei"],
            ["RIBOSOME", "Biology", "Cellular organelle for protein synthesis"],
            ["HOMEOSTASIS", "Biology", "Stable internal physiological equilibrium"],
            ["ECOSYSTEM", "Biology", "Community of interacting organisms"],
            ["METABOLISM", "Biology", "Chemical processes sustaining life"],
            ["SYMBIOSIS", "Biology", "Beneficial interaction between organisms"],
            ["CELLULOSE", "Biology", "Structural carbohydrate in plant cell walls"],
            ["TAXONOMY", "Biology", "Classification and naming of organisms"],
            // Chemistry
            ["CATALYST", "Chemistry", "Substance accelerating chemical reaction rate"],
            ["COVALENT", "Chemistry", "Chemical bond sharing electron pairs"],
            ["POLYMER", "Chemistry", "Macromolecule of repeating monomer units"],
            ["ENDOTHERMIC", "Chemistry", "Reaction absorbing thermal heat energy"],
            ["EXOTHERMIC", "Chemistry", "Reaction releasing thermal energy"],
            ["MOLECULE", "Chemistry", "Group of bonded atoms forming compound"],
            ["VALENCE", "Chemistry", "Combining power of outer electron shell"],
            ["DISTILLATION", "Chemistry", "Purification by boiling and condensation"],
            // Physics
            ["THERMODYNAMICS", "Physics", "Science of heat and energy transformation"],
            ["KINEMATICS", "Physics", "Mechanics of motion without force causes"],
            ["MOMENTUM", "Physics", "Product of mass and velocity of a body"],
            ["REFRACTION", "Physics", "Bending of waves passing between media"],
            ["INERTIA", "Physics", "Resistance of matter to velocity change"],
            ["CONDUCTIVITY", "Physics", "Rate of thermal or electrical transfer"],
            ["ENTROPY", "Physics", "Measure of microscopic disorder in a system"],
            ["VELOCITY", "Physics", "Speed with specified spatial direction"],
            ["GRAVITY", "Physics", "Universal attractive force between masses"]
        ]
    };

    class WordTypistMobile {
        constructor(canvasId) {
            this.canvas = document.getElementById(canvasId);
            if (!this.canvas) return;
            this.ctx = this.canvas.getContext('2d');
            
            this.width = this.canvas.width = 600;
            this.height = this.canvas.height = 700;

            // Audio Context
            this.audioCtx = null;
            this.soundEnabled = true;

            // Game State
            this.wave = 1;
            this.maxWave = 25;
            this.score = 0;
            this.combo = 0;
            this.maxCombo = 0;
            this.health = 100;
            this.maxHealth = 100;
            this.state = 'TITLE'; // TITLE, PLAYING, WAVE_CLEAR, GAMEOVER, VICTORY
            this.stateTimer = 0;

            // Mobile Slower Speed Modifier (1.5x slower)
            this.mobileSpeedFactor = 0.667; 

            // Entities
            this.enemies = [];
            this.lasers = [];
            this.particles = [];
            this.stars = [];
            this.floatingTexts = [];

            // Targeted Enemy
            this.targetedEnemy = null;

            // Wave Spawning Metrics
            this.enemiesToSpawn = 0;
            this.spawnTimer = 0;
            this.scienceToSpawn = 0;
            this.bossesToSpawn = 0;

            this.initStars();
            this.bindEvents();
            this.bindKeyboard();

            this.lastTime = performance.now();
            requestAnimationFrame((t) => this.loop(t));
        }

        initAudio() {
            if (!this.audioCtx) {
                const AC = window.AudioContext || window.webkitAudioContext;
                if (AC) this.audioCtx = new AC();
            }
            if (this.audioCtx && this.audioCtx.state === 'suspended') {
                this.audioCtx.resume();
            }
        }

        playTone(f1, f2, dur, type='sine', vol=0.15) {
            if (!this.soundEnabled || !this.audioCtx) return;
            try {
                const osc = this.audioCtx.createOscillator();
                const gain = this.audioCtx.createGain();
                osc.type = type;
                osc.frequency.setValueAtTime(f1, this.audioCtx.currentTime);
                if (f2) osc.frequency.exponentialRampToValueAtTime(Math.max(1, f2), this.audioCtx.currentTime + dur);
                gain.gain.setValueAtTime(vol, this.audioCtx.currentTime);
                gain.gain.linearRampToValueAtTime(0.001, this.audioCtx.currentTime + dur);
                osc.connect(gain);
                gain.connect(this.audioCtx.destination);
                osc.start();
                osc.stop(this.audioCtx.currentTime + dur);
            } catch (e) {}
        }

        initStars() {
            this.stars = [];
            for (let i = 0; i < 60; i++) {
                this.stars.push({
                    x: Math.random() * this.width,
                    y: Math.random() * this.height,
                    size: Math.random() * 2 + 0.5,
                    speed: Math.random() * 0.8 + 0.3,
                    alpha: Math.random() * 0.7 + 0.3
                });
            }
        }

        startWave(waveNum) {
            this.wave = waveNum;
            this.state = 'PLAYING';
            this.enemies = [];
            this.lasers = [];
            this.targetedEnemy = null;

            // Waves formula: Wave 1 has 4 enemies, +1 per wave
            const totalEnemies = 4 + (waveNum - 1);
            this.enemiesToSpawn = totalEnemies;
            this.spawnTimer = 0.5;

            // Boss counts: Wave 5: 1, Wave 10: 2, Wave 15: 3, Wave 20: 4, Wave 25: 5
            this.bossesToSpawn = (waveNum % 5 === 0) ? (waveNum / 5) : 0;

            // Science terms for waves 15-25: 2 to 3 science enemies per wave
            this.scienceToSpawn = (waveNum >= 15 && waveNum <= 25) ? (Math.floor(Math.random() * 2) + 2) : 0;

            this.floatingTexts.push({
                text: `WAVE ${this.wave}` + (this.bossesToSpawn > 0 ? ` - BOSS DETECTED! (${this.bossesToSpawn})` : ''),
                x: this.width / 2,
                y: this.height / 2 - 40,
                color: this.bossesToSpawn > 0 ? '#ff4d6d' : '#ffea75',
                life: 2.0,
                size: 22
            });

            this.playTone(440, 880, 0.4, 'triangle', 0.25);
        }

        getWordForWave(isScience = false, isBoss = false) {
            if (isBoss) {
                const bossWords = ["ASTROPHYSICS", "THERMODYNAMICS", "ELECTROMAGNETISM", "PHOTOSYNTHESIS", "SUPERCONDUCTOR", "CIVILIZATION", "CONSTITUTION"];
                const w = bossWords[Math.floor(Math.random() * bossWords.length)];
                return { word: w, category: "Titan Boss", desc: "Formidable boss enemy requiring rapid typing" };
            }
            if (isScience) {
                const item = VOCAB.science[Math.floor(Math.random() * VOCAB.science.length)];
                return { word: item[0], category: item[1], desc: item[2] };
            }
            let pool = VOCAB.tier1;
            if (this.wave > 5 && this.wave <= 10) pool = VOCAB.tier2;
            else if (this.wave > 10) pool = VOCAB.tier3;
            const item = pool[Math.floor(Math.random() * pool.length)];
            return { word: item[0], category: item[1], desc: item[2] };
        }

        spawnEnemy() {
            if (this.enemiesToSpawn <= 0) return;
            this.enemiesToSpawn--;

            let isBoss = false;
            let isScience = false;

            if (this.bossesToSpawn > 0) {
                isBoss = true;
                this.bossesToSpawn--;
            } else if (this.scienceToSpawn > 0) {
                isScience = true;
                this.scienceToSpawn--;
            }

            const data = this.getWordForWave(isScience, isBoss);
            const baseSpeed = isBoss ? 16 : (22 + this.wave * 1.5);
            // Apply 1.5x mobile slower speed
            const speed = baseSpeed * this.mobileSpeedFactor;

            const enemy = {
                word: data.word,
                typedIndex: 0,
                category: data.category,
                desc: data.desc,
                isBoss: isBoss,
                isScience: isScience,
                x: 60 + Math.random() * (this.width - 120),
                y: -30,
                speed: speed,
                width: isBoss ? 56 : 38,
                height: isBoss ? 56 : 38,
                maxHp: data.word.length,
                color: isBoss ? '#ff3366' : (isScience ? '#00f5d4' : '#ffb703')
            };

            this.enemies.push(enemy);
        }

        handleInput(char) {
            char = char.toUpperCase();
            this.initAudio();

            if (this.state !== 'PLAYING') {
                if (this.state === 'TITLE' || this.state === 'GAMEOVER' || this.state === 'VICTORY') {
                    this.score = 0;
                    this.health = 100;
                    this.combo = 0;
                    this.startWave(1);
                }
                return;
            }

            // If already targeting an enemy
            if (this.targetedEnemy) {
                const targetWord = this.targetedEnemy.word;
                if (targetWord[this.targetedEnemy.typedIndex] === char) {
                    this.hitTargetLetter();
                    return;
                }
            }

            // Find an enemy whose next letter matches
            let candidates = [];
            for (let e of this.enemies) {
                if (e.word[e.typedIndex] === char) {
                    candidates.push(e);
                }
            }

            if (candidates.length > 0) {
                // Prioritize the lowest enemy (closest to player ship)
                candidates.sort((a, b) => b.y - a.y);
                this.targetedEnemy = candidates[0];
                this.hitTargetLetter();
            } else {
                // Missed letter -> Reset combo
                this.combo = 0;
                this.playTone(180, 110, 0.12, 'sawtooth', 0.15);
            }
        }

        hitTargetLetter() {
            const e = this.targetedEnemy;
            if (!e) return;

            e.typedIndex++;
            this.score += 10 + this.combo * 2;
            this.combo++;
            if (this.combo > this.maxCombo) this.maxCombo = this.combo;

            // Spawn laser beam from bottom ship to enemy
            this.lasers.push({
                x1: this.width / 2,
                y1: this.height - 70,
                x2: e.x,
                y2: e.y,
                color: e.isBoss ? '#ff3366' : (e.isScience ? '#00f5d4' : '#ffe169'),
                life: 0.12
            });

            // Particles
            for (let i = 0; i < 5; i++) {
                this.particles.push({
                    x: e.x,
                    y: e.y,
                    vx: (Math.random() - 0.5) * 120,
                    vy: (Math.random() - 0.5) * 120,
                    color: e.color,
                    life: 0.4,
                    maxLife: 0.4,
                    size: 3
                });
            }

            this.playTone(400 + e.typedIndex * 70, 800, 0.08, 'sine', 0.18);

            // Check if word completed
            if (e.typedIndex >= e.word.length) {
                this.destroyEnemy(e);
            }
        }

        destroyEnemy(e) {
            const idx = this.enemies.indexOf(e);
            if (idx !== -1) this.enemies.splice(idx, 1);
            if (this.targetedEnemy === e) this.targetedEnemy = null;

            const bonus = e.isBoss ? 200 : (e.isScience ? 60 : 30);
            this.score += bonus;

            // Floating text
            this.floatingTexts.push({
                text: `+${bonus} ${e.category.toUpperCase()}!`,
                x: e.x,
                y: e.y,
                color: e.color,
                life: 1.2,
                size: e.isBoss ? 18 : 14
            });

            // Explosion particles
            for (let i = 0; i < 20; i++) {
                this.particles.push({
                    x: e.x,
                    y: e.y,
                    vx: (Math.random() - 0.5) * 260,
                    vy: (Math.random() - 0.5) * 260,
                    color: e.color,
                    life: 0.6,
                    maxLife: 0.6,
                    size: Math.random() * 4 + 2
                });
            }

            this.playTone(280, 90, 0.25, 'triangle', 0.25);

            // Check wave clear
            if (this.enemies.length === 0 && this.enemiesToSpawn === 0) {
                this.waveClear();
            }
        }

        waveClear() {
            this.state = 'WAVE_CLEAR';
            this.stateTimer = 2.0;
            this.playTone(520, 1040, 0.5, 'sine', 0.3);

            if (this.wave >= this.maxWave) {
                this.state = 'VICTORY';
            }
        }

        bindEvents() {
            window.addEventListener('keydown', (e) => {
                if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
                    this.handleInput(e.key);
                } else if (e.key === 'Backspace' && this.targetedEnemy) {
                    if (this.targetedEnemy.typedIndex > 0) {
                        this.targetedEnemy.typedIndex--;
                    }
                }
            });

            this.canvas.addEventListener('click', () => {
                this.initAudio();
                if (this.state === 'TITLE' || this.state === 'GAMEOVER' || this.state === 'VICTORY') {
                    this.score = 0;
                    this.health = 100;
                    this.combo = 0;
                    this.startWave(1);
                }
            });
        }

        bindKeyboard() {
            const keys = document.querySelectorAll('.vk-key');
            keys.forEach(btn => {
                const char = btn.getAttribute('data-key');
                const trigger = (ev) => {
                    ev.preventDefault();
                    btn.classList.add('active');
                    setTimeout(() => btn.classList.remove('active'), 120);
                    if (char === 'BACK') {
                        if (this.targetedEnemy && this.targetedEnemy.typedIndex > 0) {
                            this.targetedEnemy.typedIndex--;
                        }
                    } else if (char) {
                        this.handleInput(char);
                    }
                };
                btn.addEventListener('touchstart', trigger, { passive: false });
                btn.addEventListener('mousedown', trigger);
            });
        }

        update(dt) {
            // Update stars
            for (let s of this.stars) {
                s.y += s.speed * 40 * dt;
                if (s.y > this.height) {
                    s.y = 0;
                    s.x = Math.random() * this.width;
                }
            }

            if (this.state === 'PLAYING') {
                // Spawning
                if (this.enemiesToSpawn > 0) {
                    this.spawnTimer -= dt;
                    if (this.spawnTimer <= 0) {
                        this.spawnEnemy();
                        this.spawnTimer = Math.max(1.2, 2.8 - this.wave * 0.08);
                    }
                }

                // Update Enemies
                for (let i = this.enemies.length - 1; i >= 0; i--) {
                    let e = this.enemies[i];
                    e.y += e.speed * dt;

                    // Reached player barrier
                    if (e.y > this.height - 85) {
                        this.health -= e.isBoss ? 35 : 15;
                        this.combo = 0;
                        this.playTone(120, 40, 0.35, 'sawtooth', 0.35);

                        this.floatingTexts.push({
                            text: `BARRIER HIT! -${e.isBoss ? 35 : 15}`,
                            x: e.x,
                            y: this.height - 90,
                            color: '#ff3366',
                            life: 1.0,
                            size: 15
                        });

                        if (this.targetedEnemy === e) this.targetedEnemy = null;
                        this.enemies.splice(i, 1);

                        if (this.health <= 0) {
                            this.health = 0;
                            this.state = 'GAMEOVER';
                            this.playTone(220, 55, 0.8, 'sawtooth', 0.4);
                        } else if (this.enemies.length === 0 && this.enemiesToSpawn === 0) {
                            this.waveClear();
                        }
                    }
                }
            } else if (this.state === 'WAVE_CLEAR') {
                this.stateTimer -= dt;
                if (this.stateTimer <= 0) {
                    this.startWave(this.wave + 1);
                }
            }

            // Update Lasers
            for (let i = this.lasers.length - 1; i >= 0; i--) {
                this.lasers[i].life -= dt;
                if (this.lasers[i].life <= 0) this.lasers.splice(i, 1);
            }

            // Update Particles
            for (let i = this.particles.length - 1; i >= 0; i--) {
                let p = this.particles[i];
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.life -= dt;
                if (p.life <= 0) this.particles.splice(i, 1);
            }

            // Update Floating Texts
            for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
                let ft = this.floatingTexts[i];
                ft.y -= 25 * dt;
                ft.life -= dt;
                if (ft.life <= 0) this.floatingTexts.splice(i, 1);
            }
        }

        draw() {
            const ctx = this.ctx;
            ctx.clearRect(0, 0, this.width, this.height);

            // Deep Space Gradient
            const bgGrad = ctx.createLinearGradient(0, 0, 0, this.height);
            bgGrad.addColorStop(0, '#090514');
            bgGrad.addColorStop(1, '#160d2b');
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, this.width, this.height);

            // Stars
            for (let s of this.stars) {
                ctx.fillStyle = `rgba(255, 255, 255, ${s.alpha})`;
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
                ctx.fill();
            }

            // Defense Boundary Line
            ctx.strokeStyle = 'rgba(255, 80, 120, 0.4)';
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 6]);
            ctx.beginPath();
            ctx.moveTo(0, this.height - 85);
            ctx.lineTo(this.width, this.height - 85);
            ctx.stroke();
            ctx.setLineDash([]);

            // Draw Lasers
            for (let l of this.lasers) {
                ctx.strokeStyle = l.color;
                ctx.lineWidth = 3;
                ctx.shadowColor = l.color;
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.moveTo(l.x1, l.y1);
                ctx.lineTo(l.x2, l.y2);
                ctx.stroke();
                ctx.shadowBlur = 0;
            }

            // Draw Enemies
            for (let e of this.enemies) {
                const isTarget = (e === this.targetedEnemy);

                // Enemy Drone Icon
                ctx.save();
                ctx.translate(e.x, e.y);

                // Glow if targeted
                if (isTarget) {
                    ctx.shadowColor = e.color;
                    ctx.shadowBlur = 14;
                }

                ctx.fillStyle = e.color;
                ctx.beginPath();
                ctx.moveTo(0, e.height / 2);
                ctx.lineTo(-e.width / 2, -e.height / 2);
                ctx.lineTo(0, -e.height / 3);
                ctx.lineTo(e.width / 2, -e.height / 2);
                ctx.closePath();
                ctx.fill();

                if (e.isBoss) {
                    ctx.strokeStyle = '#fff';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }
                ctx.restore();

                // Category Tag
                ctx.font = '10px "JetBrains Mono", monospace';
                ctx.textAlign = 'center';
                ctx.fillStyle = e.isBoss ? '#ff85a1' : (e.isScience ? '#70e000' : '#ffd166');
                ctx.fillText(`[${e.category.toUpperCase()}]`, e.x, e.y - 20);

                // Word Box with Typed / Untyped Letters
                ctx.font = 'bold 15px "JetBrains Mono", monospace';
                const typedPart = e.word.substring(0, e.typedIndex);
                const untypedPart = e.word.substring(e.typedIndex);

                const fullW = ctx.measureText(e.word).width;
                const boxX = e.x - fullW / 2 - 8;
                const boxY = e.y + 12;

                // Word background pill
                ctx.fillStyle = isTarget ? 'rgba(30, 20, 50, 0.9)' : 'rgba(15, 10, 25, 0.75)';
                ctx.strokeStyle = isTarget ? e.color : 'rgba(120, 100, 160, 0.4)';
                ctx.lineWidth = isTarget ? 2 : 1;
                ctx.beginPath();
                ctx.roundRect(boxX, boxY, fullW + 16, 22, 6);
                ctx.fill();
                ctx.stroke();

                // Draw Letters
                ctx.textAlign = 'left';
                let startX = e.x - fullW / 2;

                // Typed Letters (Green glow)
                ctx.fillStyle = '#48cae4';
                ctx.fillText(typedPart, startX, boxY + 16);

                // Untyped Letters (White / highlighted)
                const typedW = ctx.measureText(typedPart).width;
                ctx.fillStyle = isTarget ? '#ffffff' : '#cfc7e8';
                ctx.fillText(untypedPart, startX + typedW, boxY + 16);
            }

            // Draw Particles
            for (let p of this.particles) {
                const alpha = p.life / p.maxLife;
                ctx.fillStyle = p.color;
                ctx.globalAlpha = alpha;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1.0;

            // Player Starship at Bottom Center
            ctx.save();
            ctx.translate(this.width / 2, this.height - 65);
            ctx.fillStyle = '#3a86ff';
            ctx.shadowColor = '#4cc9f0';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.moveTo(0, -22);
            ctx.lineTo(-18, 16);
            ctx.lineTo(0, 8);
            ctx.lineTo(18, 16);
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.restore();

            // Draw HUD (Score, Wave, Health, Combo)
            ctx.fillStyle = 'rgba(15, 10, 28, 0.85)';
            ctx.fillRect(0, 0, this.width, 46);
            ctx.strokeStyle = 'rgba(140, 100, 220, 0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, 46);
            ctx.lineTo(this.width, 46);
            ctx.stroke();

            // Wave Indicator
            ctx.font = 'bold 13px "JetBrains Mono", monospace';
            ctx.textAlign = 'left';
            ctx.fillStyle = '#ffb703';
            ctx.fillText(`WAVE: ${this.wave}/${this.maxWave}`, 14, 18);

            // Speed mode indicator
            ctx.font = '10px "Inter", sans-serif';
            ctx.fillStyle = '#70e000';
            ctx.fillText(`MOBILE SLOW: 1.5x`, 14, 34);

            // Score
            ctx.font = 'bold 15px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(`★ ${this.score}`, this.width / 2, 28);

            // Health Bar
            const barW = 120, barH = 12;
            const barX = this.width - barW - 14, barY = 14;
            ctx.fillStyle = '#2b1b3d';
            ctx.beginPath();
            ctx.roundRect(barX, barY, barW, barH, 4);
            ctx.fill();

            const hpRatio = Math.max(0, this.health / this.maxHealth);
            ctx.fillStyle = hpRatio > 0.5 ? '#06d6a0' : (hpRatio > 0.25 ? '#ffd166' : '#ef476f');
            if (hpRatio > 0) {
                ctx.beginPath();
                ctx.roundRect(barX, barY, barW * hpRatio, barH, 4);
                ctx.fill();
            }
            ctx.strokeStyle = 'rgba(255,255,255,0.4)';
            ctx.strokeRect(barX, barY, barW, barH);

            ctx.font = '10px "JetBrains Mono", monospace';
            ctx.textAlign = 'right';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(`HP: ${this.health}%`, this.width - 14, 38);

            // Floating Texts
            for (let ft of this.floatingTexts) {
                ctx.font = `bold ${ft.size || 14}px "JetBrains Mono", monospace`;
                ctx.textAlign = 'center';
                ctx.fillStyle = ft.color;
                ctx.shadowColor = ft.color;
                ctx.shadowBlur = 8;
                ctx.fillText(ft.text, ft.x, ft.y);
                ctx.shadowBlur = 0;
            }

            // State Overlays
            if (this.state === 'TITLE') {
                this.drawOverlayModal("THE AWAITING STARS", "Word Typist Mobile Arcade", "Tap anywhere or type to start Wave 1!", "#ffb703");
            } else if (this.state === 'GAMEOVER') {
                this.drawOverlayModal("DEFENSE BREACHED", `Final Score: ${this.score} • Reached Wave ${this.wave}`, "Tap anywhere to retry!", "#ef476f");
            } else if (this.state === 'VICTORY') {
                this.drawOverlayModal("★ COSMIC VICTORY! ★", `All 25 Waves Cleared! Score: ${this.score}`, "Outstanding typing mastery! Tap to play again.", "#06d6a0");
            }
        }

        drawOverlayModal(title, subtitle, prompt, titleColor) {
            const ctx = this.ctx;
            ctx.fillStyle = 'rgba(8, 5, 18, 0.85)';
            ctx.fillRect(0, 0, this.width, this.height);

            const cardW = this.width - 60, cardH = 220;
            const cardX = 30, cardY = this.height / 2 - 130;

            ctx.fillStyle = '#1c1333';
            ctx.strokeStyle = titleColor;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(cardX, cardY, cardW, cardH, 12);
            ctx.fill();
            ctx.stroke();

            ctx.font = 'bold 20px "Cinzel", serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = titleColor;
            ctx.fillText(title, this.width / 2, cardY + 50);

            ctx.font = '13px "Inter", sans-serif';
            ctx.fillStyle = '#dcd6f7';
            ctx.fillText(subtitle, this.width / 2, cardY + 95);

            ctx.font = '12px "JetBrains Mono", monospace';
            ctx.fillStyle = '#ffd166';
            ctx.fillText("Natural Science & Social Studies Edition", this.width / 2, cardY + 125);

            // Pulsing start prompt
            const pulse = Math.sin(performance.now() * 0.006) * 0.3 + 0.7;
            ctx.fillStyle = `rgba(255, 255, 255, ${pulse})`;
            ctx.font = 'bold 13px "Inter", sans-serif';
            ctx.fillText(prompt, this.width / 2, cardY + 175);
        }

        loop(now) {
            const dt = Math.min(0.1, (now - this.lastTime) / 1000.0);
            this.lastTime = now;

            this.update(dt);
            this.draw();

            requestAnimationFrame((t) => this.loop(t));
        }
    }

    window.WordTypistMobile = WordTypistMobile;

})(window);
