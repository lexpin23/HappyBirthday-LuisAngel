'use strict';

const FXManager = {
  canvas: null, ctx: null,
  _particles: [], _shooters: [], _rings: [],
  _flash: 0, _animId: null,

  init() {
    this.canvas = document.getElementById('fxCanvas');
    this.ctx    = this.canvas.getContext('2d');
    window.addEventListener('resize', () => this._resize());
    this._resize();
  },

  _resize() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width  = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.ctx.scale(dpr, dpr);
    this.canvas.style.width = `${window.innerWidth}px`;
    this.canvas.style.height = `${window.innerHeight}px`;
  },

  _drawStar(x, y, r, alpha, color) {
    const { ctx } = this;
    const inner = r * 0.42;
    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.fillStyle   = color;
    ctx.shadowColor = color;
    ctx.shadowBlur  = r * 3;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const angle  = (i * Math.PI) / 5 - Math.PI / 2;
      const radius = i % 2 === 0 ? r : inner;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  },

  _spawnBurst(count = 64) {
    const cx = this.canvas.width  / 2;
    const cy = this.canvas.height / 2;
    const colors = ['#f7c948', '#fff7b0', '#fdd835', '#ffef9f', '#e8a24a', '#ffffff', '#ffe066'];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      const speed = 1 + Math.random() * 12;
      this._particles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: 3 + Math.random() * 13,
        life: 1,
        decay: 0.006 + Math.random() * 0.008,
        color: colors[Math.floor(Math.random() * colors.length)],
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.22
      });
    }
  },

  _spawnScreenSparkles(count = 60) {
    const W = this.canvas.width;
    const H = this.canvas.height;
    const colors = ['#f7c948', '#fff7b0', '#ffffff', '#fdd835', '#ffe599'];
    for (let i = 0; i < count; i++) {
      this._particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        r: 1.5 + Math.random() * 6,
        life: 0.4 + Math.random() * 0.6,
        decay: 0.007 + Math.random() * 0.009,
        color: colors[Math.floor(Math.random() * colors.length)],
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.12
      });
    }
  },

  _spawnShootersAllEdges(perEdge = 6) {
    const W = this.canvas.width;
    const H = this.canvas.height;
    for (let edge = 0; edge < 4; edge++) {
      for (let j = 0; j < perEdge; j++) {
        let x, y, vx, vy;
        const speed = 10 + Math.random() * 7;
        if (edge === 0) {
          x = Math.random() * W; y = -10;
          vx = (Math.random() - 0.5) * 7; vy = speed;
        } else if (edge === 1) {
          x = Math.random() * W; y = H + 10;
          vx = (Math.random() - 0.5) * 7; vy = -speed;
        } else if (edge === 2) {
          x = -10; y = Math.random() * H;
          vx = speed; vy = (Math.random() - 0.5) * 7;
        } else {
          x = W + 10; y = Math.random() * H;
          vx = -speed; vy = (Math.random() - 0.5) * 7;
        }
        this._shooters.push({ x, y, vx, vy, len: 110 + Math.random() * 80, life: 1, decay: 0.013 + Math.random() * 0.008 });
      }
    }
  },

  _spawnRing(speed = 22, rgb = '247,201,72', glow = '#ffe066') {
    const maxR = Math.hypot(this.canvas.width, this.canvas.height) / 2 + 100;
    this._rings.push({ r: 0, maxR, speed, life: 1, rgb, glow });
  },

  _loop() {
    const { ctx, canvas } = this;
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Flash dorado cegador
    if (this._flash > 0) {
      const grd = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, Math.hypot(W, H) / 2);
      grd.addColorStop(0,   `rgba(255,240,100,${this._flash})`);
      grd.addColorStop(0.5, `rgba(247,201,72,${this._flash * 0.9})`);
      grd.addColorStop(1,   `rgba(200,130,20,${this._flash * 0.6})`);
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, W, H);
      this._flash = Math.max(0, this._flash - 0.018);
    }

    // Anillos expansivos
    this._rings = this._rings.filter(ring => {
      ring.r   += ring.speed;
      ring.life = Math.max(0, 1 - ring.r / ring.maxR);
      if (ring.life <= 0) return false;
      ctx.save();
      ctx.strokeStyle = `rgba(${ring.rgb ?? '247,201,72'},${ring.life * 0.9})`;
      ctx.lineWidth   = Math.max(1, 8 * ring.life);
      ctx.shadowColor = ring.glow ?? '#ffe066';
      ctx.shadowBlur  = 28 * ring.life;
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, ring.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      return true;
    });

    // Partículas + chispas de pantalla
    this._particles = this._particles.filter(p => {
      p.x  += p.vx; p.y  += p.vy;
      p.vx *= 0.97; p.vy *= 0.97;
      p.rot += p.rotSpeed;
      p.life -= p.decay;
      if (p.life <= 0) return false;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      this._drawStar(0, 0, p.r, p.life, p.color);
      ctx.restore();
      return true;
    });

    // Estrellas fugaces
    this._shooters = this._shooters.filter(s => {
      s.x += s.vx; s.y += s.vy;
      s.life -= s.decay;
      if (s.life <= 0) return false;
      const mag   = Math.hypot(s.vx, s.vy);
      const tailX = s.x - (s.vx / mag) * s.len;
      const tailY = s.y - (s.vy / mag) * s.len;
      const grad  = ctx.createLinearGradient(tailX, tailY, s.x, s.y);
      grad.addColorStop(0, `rgba(247,201,72,0)`);
      grad.addColorStop(1, `rgba(255,248,200,${s.life})`);
      ctx.save();
      ctx.strokeStyle = grad;
      ctx.lineWidth   = 3;
      ctx.shadowColor = '#ffe066';
      ctx.shadowBlur  = 8;
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(s.x, s.y);
      ctx.stroke();
      ctx.restore();
      return true;
    });

    const alive = this._flash > 0 || this._rings.length || this._particles.length || this._shooters.length;
    if (alive) {
      this._animId = requestAnimationFrame(() => this._loop());
    } else {
      canvas.style.display = 'none';
    }
  },

  // ── Warp — viaje a velocidad luz (derecha → izquierda) ──
  playWarp(onDone) {
    this._resize();
    cancelAnimationFrame(this._animId);
    this.canvas.style.display = 'block';

    const W = this.canvas.width, H = this.canvas.height;
    const streaks = [];
    for (let i = 0; i < 80; i++) {
      streaks.push({
        x:    Math.random() * W * 1.5 + W * 0.2,
        y:    Math.random() * H,
        len:  60  + Math.random() * 180,
        spd:  28  + Math.random() * 40,
        w:    1   + Math.random() * 2,
        life: 0.5 + Math.random() * 0.5
      });
    }

    const start = performance.now();
    const duration = 3800;

    const loop = () => {
      const elapsed = performance.now() - start;
      const t = Math.min(elapsed / duration, 1);

      this.ctx.clearRect(0, 0, W, H);

      // Oscurecer el fondo — llega a opaco completo a t≈0.35 para tapar el contenido anterior
      this.ctx.fillStyle = `rgba(0,0,5,${Math.min(1, t * 2.8)})`;
      this.ctx.fillRect(0, 0, W, H);

      const globalAlpha = t < 0.8 ? 1 : 1 - (t - 0.8) / 0.2; // fade out final

      streaks.forEach(s => {
        s.x -= s.spd * (1 + t * 3); // aceleran con el tiempo
        if (s.x + s.len < 0) s.x = W + Math.random() * 200;

        const grad = this.ctx.createLinearGradient(s.x - s.len, s.y, s.x, s.y);
        grad.addColorStop(0, `rgba(255,255,255,0)`);
        grad.addColorStop(1, `rgba(220,210,255,${s.life * globalAlpha})`);
        this.ctx.save();
        this.ctx.strokeStyle = grad;
        this.ctx.lineWidth   = s.w;
        this.ctx.shadowColor = '#c8a0ff';
        this.ctx.shadowBlur  = 4;
        this.ctx.beginPath();
        this.ctx.moveTo(s.x - s.len, s.y);
        this.ctx.lineTo(s.x, s.y);
        this.ctx.stroke();
        this.ctx.restore();
      });

      if (t < 1) {
        this._animId = requestAnimationFrame(loop);
      } else {
        this.canvas.style.display = 'none';
        onDone?.();
      }
    };

    this._animId = requestAnimationFrame(loop);
  },

  // ── Nivel 3 · Cinemático (Gran Estrella) — reservado para otras fases ──
  // _playCinematicLevel3(onMidpoint) {
  //   this._resize();
  //   this._particles = [];
  //   this._shooters  = [];
  //   this._rings     = [];
  //   this._flash     = 0;
  //   cancelAnimationFrame(this._animId);
  //   this.canvas.style.display = 'block';
  //   this._flash = 1;
  //   this._spawnRing(22);
  //   this._spawnBurst(120);
  //   this._loop();
  //   setTimeout(() => this._spawnScreenSparkles(70), 120);
  //   setTimeout(() => this._spawnRing(14), 200);
  //   setTimeout(() => this._spawnRing(9), 400);
  //   for (let i = 0; i < 5; i++) {
  //     setTimeout(() => this._spawnShootersAllEdges(5), 350 + i * 90);
  //   }
  //   setTimeout(() => onMidpoint?.(), 600);
  // },

  // ── Final Grand Star — celebración épica de 3 actos ──
  playGrandStar(onReady) {
    this._resize();
    this._particles = [];
    this._shooters  = [];
    this._rings     = [];
    this._flash     = 0;
    cancelAnimationFrame(this._animId);
    this.canvas.style.display = 'block';

    // Acto 1: Tensión (2.8s) — anillos que se aceleran + estrellas enloquecidas
    StarsCanvas.boost(12, 5000);
    const tensionSpeeds = [5, 9, 14, 20, 28];
    tensionSpeeds.forEach((spd, i) => {
      setTimeout(() => this._spawnRing(spd, '247,201,72', '#ffe066'), i * 520);
    });
    this._loop();
    document.body.classList.add('grand-tension');

    // Acto 2: Explosión (t=2.8s)
    setTimeout(() => {
      document.body.classList.remove('grand-tension');
      this._flash = 1;
      this._spawnRing(36, '247,201,72', '#ffe066');
      this._spawnRing(26, '255,255,200', '#ffffff');
      this._spawnBurst(160);
      setTimeout(() => this._spawnScreenSparkles(130), 80);
      setTimeout(() => this._spawnRing(18, '247,201,72', '#ffe066'), 180);
      setTimeout(() => this._spawnRing(12, '200,160,255', '#c8a0ff'), 350);
      for (let i = 0; i < 8; i++) {
        setTimeout(() => this._spawnShootersAllEdges(6), 150 + i * 90);
      }

      // Acto 3: Reveal (t=2.8+1.6s)
      setTimeout(() => {
        this.canvas.style.display = 'none';
        onReady?.();
      }, 1600);
    }, 2800);
  },

  // ── Cometa — un trazo veloz que cruza la pantalla ──
  comet() {
    this._resize();
    const W = window.innerWidth;
    const needStart = this.canvas.style.display !== 'block';
    if (needStart) {
      this._particles = [];
      this._rings     = [];
      this._shooters  = [];
      this._flash     = 0;
      cancelAnimationFrame(this._animId);
    }
    this._shooters.push({
      x:    W * (0.15 + Math.random() * 0.7),
      y:    -20,
      vx:   (Math.random() > 0.5 ? 1 : -1) * (1.2 + Math.random() * 1.8),
      vy:   14 + Math.random() * 8,
      len:  180 + Math.random() * 100,
      life: 1,
      decay: 0.005 + Math.random() * 0.003
    });
    if (needStart) {
      this.canvas.style.display = 'block';
      this._loop();
    }
  },

  // ── Nivel 2 · Explosión estelar — transición activa ──
  play(onMidpoint) {
    this._resize();
    this._particles = [];
    this._shooters  = [];
    this._rings     = [];
    this._flash     = 0;
    cancelAnimationFrame(this._animId);
    this.canvas.style.display = 'block';

    // t=0: flash + anillo expansivo
    this._flash = 1;
    this._spawnRing(22);
    this._loop();

    // t=80ms: 64 partículas desde el centro
    setTimeout(() => this._spawnBurst(), 80);

    // t=350ms: 4 oleadas de estrellas fugaces desde todos los bordes
    for (let i = 0; i < 4; i++) {
      setTimeout(() => this._spawnShootersAllEdges(4), 350 + i * 120);
    }

    // t=1100ms: callback — el quiz ya está listo, aparece con brillo dorado
    setTimeout(() => onMidpoint?.(), 1100);
  }
};

const StarsCanvas = {
  canvas: null, ctx: null, W: 0, H: 0, stars: [], _running: false, _boost: 1,

  init() {
    this.canvas = document.getElementById('stars');
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
    for (let i = 0; i < 180; i++) {
      this.stars.push({
        x: Math.random(), y: Math.random(),
        r: Math.random() * 1.4 + 0.3,
        a: Math.random(),
        speed: Math.random() * 0.008 + 0.002
      });
    }
    this.draw();
  },

  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.W = this.canvas.width  = window.innerWidth * dpr;
    this.H = this.canvas.height = window.innerHeight * dpr;
    this.ctx.scale(dpr, dpr);
    this.canvas.style.width = `${window.innerWidth}px`;
    this.canvas.style.height = `${window.innerHeight}px`;
  },

  boost(factor, ms) {
    this._boost = factor;
    setTimeout(() => { this._boost = 1; }, ms);
  },

  draw() {
    if (this._running) return;
    this._running = true;
    const tick = () => {
      const { ctx, W, H } = this;
      ctx.clearRect(0, 0, W, H);
      this.stars.forEach(s => {
        s.a += s.speed * this._boost;
        const alpha = 0.4 + 0.5 * Math.abs(Math.sin(s.a));
        ctx.beginPath();
        ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.fill();
      });
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
};

const AudioManager = {
  current: null,
  _fadeInterval: null,
  _loopHandler: null,
  _endedHandler: null,

  _clearLoopHandler() {
    if (this._loopHandler) {
      document.getElementById('bgm').removeEventListener('timeupdate', this._loopHandler);
      this._loopHandler = null;
    }
  },

  _clearEndedHandler() {
    if (this._endedHandler) {
      document.getElementById('bgm').removeEventListener('ended', this._endedHandler);
      this._endedHandler = null;
    }
  },

  play(src, volume = 0.7, loop = true) {
    clearInterval(this._fadeInterval);
    this._fadeInterval = null;
    this._clearLoopHandler();
    this._clearEndedHandler();
    const audio = document.getElementById('bgm');
    audio.src = src;
    audio.volume = volume;
    audio.loop = loop;
    this.current = audio;
    audio.play().catch(() => {
      document.addEventListener('click', () => audio.play(), { once: true });
    });
  },

  playWithCustomLoop(src, volume = 0.7, loopStart = 10, loopEnd = 13) {
    clearInterval(this._fadeInterval);
    this._fadeInterval = null;
    this._clearLoopHandler();
    const audio = document.getElementById('bgm');
    audio.src = src;
    audio.volume = volume;
    audio.loop = false;
    this._loopHandler = () => { if (audio.currentTime >= loopEnd) audio.currentTime = loopStart; };
    audio.addEventListener('timeupdate', this._loopHandler);
    this.current = audio;
    audio.play().catch(() => {
      document.addEventListener('click', () => audio.play(), { once: true });
    });
  },

  // Reproduce src1 una vez; al terminar, reproduce src2 en loop
  playThen(src1, src2, volume = 0.7) {
    this.play(src1, volume, false);
    this._endedHandler = () => {
      this._clearEndedHandler();
      this.play(src2, volume, true);
    };
    this.current.addEventListener('ended', this._endedHandler);
  },

  fadeOut(ms = 1500, onDone) {
    if (!this.current) { onDone?.(); return; }
    clearInterval(this._fadeInterval);
    this._clearLoopHandler();
    this._clearEndedHandler();
    const audio = this.current;
    const step = Math.max(audio.volume / (ms / 50), 0.001);
    this._fadeInterval = setInterval(() => {
      if (audio.volume > step) {
        audio.volume = Math.max(audio.volume - step, 0);
      } else {
        audio.volume = 0;
        audio.pause();
        clearInterval(this._fadeInterval);
        this._fadeInterval = null;
        onDone?.();
      }
    }, 50);
  },

  swap(src, volume = 0.7) {
    this.fadeOut(1200, () => this.play(src, volume));
  }
};


// Generation counter guarantees concurrent write() calls don't corrupt each other.
// Each write() gets a unique gen; any older chain stops on its next tick.
const TypeWriter = {
  _gen: 0,

  write(element, text, speed = 24, onDone) {
    const gen = ++this._gen;
    const textSpan = document.createElement('span');
    const cursor   = document.createElement('span');
    cursor.className = 'cursor';
    element.innerHTML = '';
    element.appendChild(textSpan);
    element.appendChild(cursor);
    let i = 0;
    const type = () => {
      if (this._gen !== gen) return;
      if (i <= text.length) {
        textSpan.innerHTML = text.slice(0, i).replace(/\n/g, '<br>');
        i++;
        setTimeout(type, speed);
      } else {
        cursor.remove();
        onDone?.();
      }
    };
    type();
  },

  skip() { this._gen++; }
};

const UI = {
  _el: {},

  init() {
    this._el = {
      startOverlay: document.getElementById('startOverlay'),
      btn:          document.getElementById('btnContinue'),
      narration:    document.getElementById('narration'),
      starBar:      document.getElementById('starBar'),
      starCount:    document.getElementById('starCount'),
      textBox:      document.getElementById('textBox'),
      phaseTag:     document.getElementById('phaseTag'),
      logo:         document.getElementById('logo'),
      subtitle:     document.getElementById('subtitleTop'),
      quizContent:  document.getElementById('quizContent'),
      quizCounter:  document.getElementById('quizCounter'),
      quizQuestion: document.getElementById('quizQuestion'),
      quizOptions:  document.getElementById('quizOptions'),
      quizFeedback: document.getElementById('quizFeedback'),
    };
  },

  showBtn(label, onClick, extraClass = '') {
    const btn = this._el.btn;
    btn.querySelector('span').textContent = label;
    btn.onclick = onClick;
    btn.className = 'btn-continue visible';
    if (extraClass) btn.classList.add(extraClass);
    // Doble rAF garantiza que el browser haya pintado display:block antes de animar opacity
    requestAnimationFrame(() => requestAnimationFrame(() => btn.classList.add('shown')));
  },

  hideBtn() {
    const btn = this._el.btn;
    btn.classList.remove('shown', 'visible');
  },

  showStarBar()        { this._el.starBar.style.opacity = '1'; },
  updateStarBar(count) { this._el.starCount.textContent = count; },
  showTextBox()        { this._el.textBox.style.opacity = '1'; },
  hideTextBox()        { this._el.textBox.style.opacity = '0'; },
  setPhaseTag(text)    { this._el.phaseTag.textContent = text; },
  getNarration()       { return this._el.narration; },
  setNarrationHTML(h)  { this._el.narration.innerHTML = h; },
  fadeInLogo()         { this._el.logo.style.opacity = '1'; },
  fadeInSubtitle()     { this._el.subtitle.style.opacity = '1'; },
  showQuiz()           { this._el.quizContent.style.display = 'block'; },
  hideQuiz()           { this._el.quizContent.style.display = 'none'; },

  showTextBoxGold() {
    const el = this._el.textBox;
    el.classList.remove('gold-reveal');
    void el.offsetWidth;
    el.style.opacity = '1';
    el.classList.add('gold-reveal');
    setTimeout(() => el.classList.remove('gold-reveal'), 1300);
  },

  hideLogo()     { this._el.logo.style.opacity = '0'; },
  hideSubtitle() { this._el.subtitle.style.opacity = '0'; },
  collapseHeader() {
    this._el.logo.style.display     = 'none';
    this._el.subtitle.style.display = 'none';
  },

  showPhaseTitle(text, color, strokeColor = '') {
    const el = this._el.logo;
    el.textContent = text;
    el.style.color = color;
    el.style.webkitTextStroke = strokeColor ? `2px ${strokeColor}` : '0';
    el.style.textShadow = `0 0 22px ${color}66`;
    el.style.opacity = '1';
  },

  showNarration() {
    const el = this._el.narration;
    el.style.display = '';
    el.style.opacity = '1';
  },

  hideNarration(onDone) {
    const el = this._el.narration;
    el.style.opacity = '0';
    setTimeout(() => { el.style.display = 'none'; onDone?.(); }, 400);
  },

  showGameTutorial(container, icon, lines, onReady) {
    const dialog = document.createElement('div');
    dialog.className = 'nave-intervention';
    dialog.innerHTML = `
      <div class="nave-leslie-msg">
        <div class="nave-leslie-icon">${icon}</div>
        ${lines.map(l => `<span>${l}</span>`).join('')}
      </div>
      <div class="nave-love-opts">
        <button>¡Entendido! ✦</button>
      </div>
    `;
    container.appendChild(dialog);
    requestAnimationFrame(() => requestAnimationFrame(() => dialog.classList.add('shown')));
    dialog.querySelector('button').addEventListener('click', () => {
      dialog.classList.remove('shown');
      setTimeout(() => { dialog.remove(); onReady(); }, 400);
    });
  }
};

const GameState = {
  INTRO:      'intro',
  QUIZ:       'quiz',
  LOVE:       'love_challenges',
  MINIGAMES:  'minigames',
  CREDITS:    'credits',
  REVEAL:     'reveal',
  FINALE:     'finale'
};

const Phases = {

  [GameState.INTRO]: {
    tag:   'Despegue',
    music: 'src/Gusty Garden Galaxy - Super Mario Galaxy.mp3',
    scenes: [
      `Bienvenido, Luis Ángel, a esta nueva aventura galáctica.\n\nEstás invitado a un evento cósmico lleno de melodía en una de nuestras zonas espaciales más espléndidas...`,
      `Te encuentras en el umbral de una región estelar única, un santuario donde las constelaciones vibran en armonía. Este lugar está imbuido de ritmos y sonidos mágicos.`,
      `Pero antes de alcanzar tu destino, deberás demostrar que el poder de las estrellas reside de verdad dentro de tu corazón.`,
      `El universo no entrega sus secretos fácilmente. Te esperan preguntas que desafiarán tu ingenio y retos que medirán la profundidad de tu valentía... y quizás, solo quizás, también la fuerza de tu amor.`,
      `Cada estrella que conquistes en este viaje te acercará a la galaxia más brillante de todas. Leslie te estará esperando del otro lado — como siempre, con una sonrisa y una sorpresa entre las manos solo para ti.\n\n¿Estás listo, cosmonauta?`
    ],
    _scene: 0,
    _timeouts: [],

    onEnter() {
      this._timeouts = [];
      this._scene = 0;
      UI.setPhaseTag(this.tag);
      AudioManager.play(this.music);
      // Edita estos números para cambiar el retraso (en milisegundos)
      this._timeouts.push(setTimeout(() => UI.fadeInLogo(), 500));
      this._timeouts.push(setTimeout(() => UI.fadeInSubtitle(), 4500));
      this._timeouts.push(setTimeout(() => { UI.showTextBox(); this._showScene(); }, 10000));
    },

    onExit() {
      this._timeouts.forEach(clearTimeout);
      this._timeouts = [];
    },

    _showScene() {
      const isLastScene = this._scene === this.scenes.length - 1;

      TypeWriter.write(UI.getNarration(), this.scenes[this._scene], 24, () => {
        if (isLastScene) {
          // Si es la última escena, mostramos directamente el botón dorado "¡Estoy listo!"
          UI.showStarBar();
          
          const startTransition = () => {
            UI.hideBtn();
            UI.hideNarration();
            UI.hideTextBox();
            AudioManager.fadeOut(1800);
            FXManager.play(() => Game.go(GameState.QUIZ));
          };

          UI.showBtn('¡Estoy listo! ★', startTransition, 'btn-final-star');
        } else {
          UI.showBtn('Continuar ›', () => this._next());
        }
      });
    },

    _next() {
      UI.hideBtn();
      this._scene++;
      this._showScene();
    }
  },

  [GameState.QUIZ]: {
    tag:   'Fase II · Quiz Galáctico',
    music: 'src/Good Egg Galaxy - Super Mario Galaxy.mp3',
    // Para agregar preguntas de la pareja: copia un bloque { text, options, correct }
    // "correct" es el índice de la respuesta correcta (0–3)
    questions: [
      {
        text:    '¿Cómo se llama la guardiana del Observatorio Cometa?',
        options: ['Princesa Peach', 'Daisy', 'Rosalina', 'Zelda'],
        correct: 2
      },
      {
        text:    '¿Qué criatura estrella acompaña a Mario en su viaje galáctico?',
        options: ['Yoshi', 'Koopa', 'Luma', 'Toad'],
        correct: 2
      },
      {
        text:    '¿Cómo se llama la base espacial donde vive Rosalina?',
        options: ['Nave Estelar', 'Observatorio Cometa', 'Torre Galáctica', 'Estación Arcoíris'],
        correct: 1
      },
      {
        text:    '¿Cuál es el nombre del villano principal de Super Mario Galaxy?',
        options: ['Kamek', 'Wario', 'Bowser', 'Bowser Jr.'],
        correct: 2
      },
      {
        text:    '¿Qué tipo de estrella debe recolectar Mario para avanzar en su viaje?',
        options: ['Estrella Dorada', 'Estrella Cósmica', 'Estrella Arcoíris', 'Estrella de Poder'],
        correct: 3
      }
    ],
    _current: 0,
    _btns: [],

    onEnter() {
      this._current = 0;
      UI.setPhaseTag('');
      UI._el.narration.innerHTML = ''; // Vaciar narración para que no ocupe espacio
      UI._el.narration.style.display = 'none'; // Ocultar inmediatamente
      UI.hideSubtitle();
      UI.showPhaseTitle('QUIZ GALÁCTICO', '#aad4f5');
      AudioManager.play(this.music);
      UI.hideBtn();
      this._startQuestions();
    },

    _startQuestions() {
      UI.hideBtn();
      UI.showQuiz();
      UI.showTextBoxGold();
      this._showQuestion();
    },

    _showQuestion() {
      const q  = this.questions[this._current];
      const el = UI._el;
      el.quizCounter.textContent  = `Pregunta ${this._current + 1} de ${this.questions.length}`;
      el.quizQuestion.textContent = q.text;
      el.quizFeedback.textContent = '';
      el.quizOptions.style.pointerEvents = '';
      el.quizOptions.innerHTML = '';
      this._btns = q.options.map((opt, i) => {
        const btn = document.createElement('button');
        btn.className = 'quiz-option';
        btn.textContent = opt;
        btn.onclick = () => this._answer(i);
        el.quizOptions.appendChild(btn);
        return btn;
      });
    },

    _answer(idx) {
      const q       = this.questions[this._current];
      const correct = idx === q.correct;
      UI._el.quizOptions.style.pointerEvents = 'none';
      this._btns[idx].classList.add(correct ? 'correct' : 'wrong');
      if (correct) {
        this._btns[idx].textContent += ' ★';
        UI._el.quizFeedback.textContent = '¡Estrella conquistada! ★';
        Game.addStar();
      } else {
        this._btns[q.correct].classList.add('correct');
        UI._el.quizFeedback.textContent = '¡Casi! La respuesta correcta brilla en verde.';
      }
      setTimeout(() => {
        this._current++;
        if (this._current < this.questions.length) {
          this._showQuestion();
        } else {
          Game.go(GameState.LOVE);
        }
      }, 1600);
    },

    onExit() { UI.hideQuiz(); UI.showNarration(); }
  },

  [GameState.LOVE]: {
    tag:  '✦ Reto de Amor ✦',
    _step: 0,
    _birthdayAttempts: 0,
    _secretStars: 0,

    _questions: [
      {
        id: 'birthday',
        text: '¿Cuál es mi fecha de nacimiento?',
        opts1: ['1996-09-14', '1997-04-27', '1997-11-30', '1996-03-22'],
        opts2: ['1997-04-27', '1996-05-18', '1997-08-05', '1997-04-27'],
        correct: '1997-04-27',
      },
      {
        id: 'food',
        text: '¿Cuál es mi comida favorita?',
        options: ['Hamburguesas', 'Tacos', 'Sushi', 'Pizza'],
        correct: 1
      },
      {
        id: 'color',
        text: '¿Cuál es mi color favorito?',
        options: ['Rosa', 'Azul', 'Naranja', 'Negro'],
        correct: 1
      }
    ],

    onEnter() {
      this._step = 0;
      this._birthdayAttempts = 0;
      this._secretStars = 0;
      UI.setPhaseTag('');
      UI.showPhaseTitle('RETO DE AMOR ♥', '#ff8fb0');
      UI.hideQuiz();
      UI.showNarration();
      TypeWriter.write(
        UI.getNarration(),
        `Muy bien, cosmonauta... el quiz ya terminó.\n\nPero espera — hay algo más.\n\nAntes de continuar tu viaje, tengo unas preguntitas... personales. 👀\n\nEstas no suman estrellas. O al menos... eso crees tú. 😏`,
        22,
        () => UI.showBtn('¡Acepto el reto! ♥', () => this._startLove())
      );
    },

    _startLove() {
      UI.hideBtn();
      UI.hideNarration(() => { UI.showQuiz(); this._showQuestion(); });
    },

    _showQuestion() {
      const q  = this._questions[this._step];
      const el = UI._el;
      el.quizCounter.textContent  = `Pregunta ${this._step + 1} de ${this._questions.length}`;
      el.quizFeedback.textContent = '';
      el.quizOptions.style.pointerEvents = '';
      el.quizOptions.innerHTML = '';

      if (q.id === 'birthday') {
        el.quizQuestion.textContent = q.text;
        const opts = this._birthdayAttempts === 0 ? q.opts1 : q.opts2;
        opts.forEach(opt => {
          const btn = document.createElement('button');
          btn.className = 'quiz-option';
          btn.textContent = opt;
          btn.onclick = () => this._answerBirthday(opt);
          el.quizOptions.appendChild(btn);
        });
      } else {
        el.quizQuestion.textContent = q.text;
        q.options.forEach((opt, i) => {
          const btn = document.createElement('button');
          btn.className = 'quiz-option';
          btn.textContent = opt;
          btn.onclick = () => this._answerGeneral(i);
          el.quizOptions.appendChild(btn);
        });
      }
    },

    _answerBirthday(value) {
      const q   = this._questions[0];
      const correct = value === q.correct;
      UI._el.quizOptions.style.pointerEvents = 'none';

      // Marcar el botón clickeado
      [...UI._el.quizOptions.children].forEach(btn => {
        if (btn.textContent === value) btn.classList.add(correct ? 'correct' : 'wrong');
        if (!correct && btn.textContent === q.correct) btn.classList.add('correct');
      });

      if (correct) {
        this._secretStars++;
        UI._el.quizFeedback.textContent = 'Esa estuvo fácil 😏';
        setTimeout(() => this._next(), 1800);
      } else if (this._birthdayAttempts === 0) {
        this._birthdayAttempts = 1;
        UI._el.quizFeedback.textContent = '¿Estás seguro...? Tengo fe en ti — ¡una más! 😅';
        setTimeout(() => this._showQuestion(), 2000);
      } else {
        UI._el.quizFeedback.textContent = 'Ay ay ay... era el 27 de abril, ¡como el tuyo! 😂';
        setTimeout(() => this._next(), 2200);
      }
    },

    _answerGeneral(idx) {
      const q       = this._questions[this._step];
      const correct = idx === q.correct;
      UI._el.quizOptions.style.pointerEvents = 'none';
      [...UI._el.quizOptions.children][idx].classList.add(correct ? 'correct' : 'wrong');
      if (!correct) [...UI._el.quizOptions.children][q.correct].classList.add('correct');

      if (correct) {
        this._secretStars++;
        UI._el.quizFeedback.textContent = '¡Correcto! 💛';
      } else {
        UI._el.quizFeedback.textContent = 'Casi... pero ya sé que me quieres igual 💜';
      }
      setTimeout(() => this._next(), 1800);
    },

    _next() {
      this._step++;
      if (this._step < this._questions.length) {
        this._showQuestion();
      } else {
        this._finish();
      }
    },

    _finish() {
      UI.hideQuiz();
      UI.showNarration();
      const msgs = [
        'No está mal, no está mal... 😏',
        '¡No estuvo nada mal, cosmonauta! 🌟',
        '¡Perfecto! Claramente me conoces bien 💛'
      ];
      const msg = msgs[Math.min(this._secretStars, 2)];
      TypeWriter.write(
        UI.getNarration(),
        `${msg}\n\nAhora prepárate... porque el verdadero reto está a punto de comenzar.\n\nEl universo te llama hacia una nueva galaxia. ¿Estás listo para el viaje?`,
        22,
        () => UI.showBtn('¡Vamos allá! ✦', () => {
          AudioManager.fadeOut(1200);
          FXManager.playWarp(() => Game.go(GameState.MINIGAMES));
        })
      );
    },

    onExit() { UI.hideQuiz(); UI.showNarration(); }
  },

  [GameState.MINIGAMES]: {
    tag:   'Fase III · Retos Galácticos',
    music: 'src/Honeyhive Galaxy - Super Mario Galaxy.mp3',
    _challengeWasTriggered: false,

    onEnter() {
      UI.setPhaseTag('');
      UI.showPhaseTitle('Retos Galácticos ✦', '#f7c948', '#5a3200');
      AudioManager.play(this.music, 0.8);
      UI.showTextBoxGold();
      UI.showNarration();
      TypeWriter.write(
        UI.getNarration(),
        `¡Bienvenido a la nueva galaxia, cosmonauta!\n\nEl universo tiene tres retos preparados para ti.\n\nEl primero requiere algo más que velocidad... requiere corazón. ✦`,
        22,
        () => UI.showBtn('¡Acepto el reto! ✦', () => this._startConstellation())
      );
    },

    _startConstellation() {
      UI.hideLogo();
      UI.hideSubtitle();
      UI.hideBtn();
      UI.hideTextBox();
      ConstellationGame.start(() => this._afterConstellation());
    },

    _afterConstellation() {
      UI.showTextBoxGold();
      UI.showNarration();
      TypeWriter.write(
        UI.getNarration(),
        `¡La Constelación del Amor brilla ahora en el cielo! ♥\n\nPero el universo tiene un segundo reto... uno mucho más caótico.\n\nLas Lumas andan sueltas y necesitan que las atrapes. ¡20 segundos!`,
        22,
        () => UI.showBtn('¡A atrapar Lumas! ★', () => this._startLumas())
      );
    },

    _startLumas() {
      this._challengeWasTriggered = false;
      UI.hideBtn();
      UI.hideTextBox();
      LumaGame.start((caught, retoCumplido) => {
        this._challengeWasTriggered = LumaGame._challengeTriggered;
        this._bridgeToNave(caught, retoCumplido);
      });
    },

    _bridgeToNave(caught, retoCumplido) {
      UI.showTextBoxGold();
      UI.showNarration();

      let lumaMsg;
      if (retoCumplido) {
        lumaMsg = `¡Luis Ángel es todo un cazador de estrellas! ¡Estoy impresionada! 🤯\n${caught} estrellas — eres una anomalía cósmica.`;
      } else if (this._challengeWasTriggered) {
        lumaMsg = `No te preocupes... ese reto no es para cualquiera. 💛\n¡Pero mira: ${caught} estrellas! Eso sí es ser cosmonauta.`;
      } else if (caught <= 3) {
        lumaMsg = `Solo ${caught}... las Lumas son traviesas, ¿eh? 😄`;
      } else if (caught <= 9) {
        lumaMsg = `¡${caught} Lumas! Nada mal, cosmonauta. 🌟`;
      } else if (caught <= 16) {
        lumaMsg = `¡${caught} Lumas! ¡Impresionante! Las estrellas están de tu lado. ✦`;
      } else {
        lumaMsg = `¡¡${caught} LUMAS!! ¡Eres una leyenda galáctica! 🌌`;
      }

      TypeWriter.write(
        UI.getNarration(),
        `${lumaMsg}\n\nPero el universo aún no termina contigo...\n\nTu nave debe atravesar un campo de meteoros. Y esta vez tendrás que pedir ayuda. ¿Puedes con eso?`,
        22,
        () => UI.showBtn('¡A la nave! 🚀', () => this._startNave())
      );
    },

    _startNave() {
      UI.hideBtn();
      UI.hideTextBox();
      NaveGame.start(() => this._afterNave());
    },

    _afterNave() {
      AudioManager.fadeOut(800, () => AudioManager.play('src/Final Grand Star - Super Mario Galaxy.mp3', 0.85, false));
      FXManager.playGrandStar(() => this._showGrandStar());
    },

    _showGrandStar() {
      const overlay = document.createElement('div');
      overlay.className = 'grand-star-overlay';
      overlay.innerHTML = `
        <div class="grand-star-icon">⭐</div>
        <div class="grand-star-title">FINAL GRAND STAR</div>
        <div class="grand-star-sub">Has superado los tres retos galácticos</div>
      `;
      document.body.appendChild(overlay);
      requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('shown')));

      setTimeout(() => {
        overlay.classList.add('hiding');
        setTimeout(() => {
          overlay.remove();
          UI.showTextBoxGold();
          UI.showNarration();
          TypeWriter.write(
            UI.getNarration(),
            `¡Lo lograste, cosmonauta! 🚀✦\n\nSobreviviste los meteoros, rescataste Lumas y demostraste que el amor es la fuerza más poderosa del universo.\n\nEl viaje casi termina... y lo mejor aún está por venir.`,
            22,
            () => UI.showBtn('Continuar ›', () => Game.go(GameState.CREDITS))
          );
        }, 700);
      }, 5500);
    },

    onExit() { LumaGame.stop(); ConstellationGame.stop(); NaveGame.stop(); }
  },

  [GameState.CREDITS]: {
    tag:   'Fase V · Créditos',
    music: 'src/Dawn A New Morning - Super Mario Galaxy.mp3',
    _wrap: null,
    _timeouts: [],

    _rows: [
      { role: 'Música',                               name: 'Leslie Peraza' },
      { role: 'Diseño visual',                        name: 'Leslie Peraza' },
      { role: 'Dirección creativa',                   name: 'Leslie Peraza' },
      { role: 'Guion y narrativa',                    name: 'Leslie Peraza' },
      { role: 'Los meteoros (a propósito difíciles)', name: 'Leslie Peraza' },
      { role: 'Producción general',                   name: 'Leslie Peraza' },
      { role: 'El quiz personal',                     name: 'Leslie Peraza 😏' },
      { role: 'Ideas a deshoras',                     name: 'Leslie Peraza' },
      { role: 'Programación',                         name: 'Claude Sonnet (bajo supervisión estricta)' },
      { role: 'Efectos especiales',                   name: 'Claude Sonnet (colaborador técnico)' },
      { role: 'Inspiración',                          name: 'Super Mario Galaxy · Nintendo' },
      { role: 'Agradecimientos',                      name: 'Rosalina · las Lumas · el universo' },
    ],

    onEnter() {
      this._timeouts = [];
      UI.setPhaseTag('');
      UI.hideTextBox();
      UI.hideLogo();
      UI.hideSubtitle();
      UI.collapseHeader();
      AudioManager.fadeOut(1200, () => AudioManager.play(this.music, 0.7, false));
      this._build();
    },

    _build() {
      const wrap = document.createElement('div');
      wrap.className = 'credits-wrap';
      this._wrap = wrap;

      const slot = document.createElement('div');
      slot.className = 'credits-slot';
      wrap.appendChild(slot);

      document.body.appendChild(wrap);
      requestAnimationFrame(() => requestAnimationFrame(() => wrap.classList.add('shown')));

      const FADE = 700;
      const HOLD = 1900;
      const HOLD_DED = 4500;

      const sequence = [
        { type: 'header' },
        ...this._rows.map(r => ({ type: 'entry', role: r.role, name: r.name })),
        { type: 'dedication' }
      ];

      let idx = 0;

      const showNext = () => {
        if (idx >= sequence.length) { endCredits(); return; }
        const item = sequence[idx++];
        const hold = item.type === 'dedication' ? HOLD_DED : HOLD;

        if (item.type === 'header') {
          slot.innerHTML = `<div class="credits-header-item">★ GALAXIA LESLIE ★</div>`;
        } else if (item.type === 'entry') {
          slot.innerHTML = `
            <div class="credits-entry-item">
              <div class="credits-role-text">${item.role}</div>
              <div class="credits-name-text">${item.name}</div>
            </div>`;
        } else {
          slot.innerHTML = `<div class="credits-ded-item">Para Luis Ángel —<br>el cosmonauta favorito del cosmos ✦</div>`;
        }

        slot.classList.remove('visible');
        void slot.offsetWidth;
        slot.classList.add('visible');

        const t1 = setTimeout(() => {
          slot.classList.remove('visible');
          const t2 = setTimeout(showNext, FADE);
          this._timeouts.push(t2);
        }, FADE + hold);
        this._timeouts.push(t1);
      };

      const endCredits = () => {
        wrap.classList.add('hiding');
        const t = setTimeout(() => {
          wrap.remove();
          this._wrap = null;
          UI.showTextBoxGold();
          UI.showNarration();
          TypeWriter.write(
            UI.getNarration(),
            `Y ahora...\n\nEl universo tiene una última sorpresa para ti. ✦`,
            22,
            () => UI.showBtn('Continuar ›', () => Game.go(GameState.REVEAL))
          );
        }, 1200);
        this._timeouts.push(t);
      };

      const t0 = setTimeout(showNext, 1500);
      this._timeouts.push(t0);
    },

    onExit() {
      this._timeouts.forEach(clearTimeout);
      this._timeouts = [];
      this._wrap?.remove();
      this._wrap = null;
    }
  },

  [GameState.REVEAL]: {
    tag:   'Fase VI · El Gran Reveal',
    music: 'src/Birth - Super Mario Galaxy.mp3',
    _wrap: null,
    _timeouts: [],

    onEnter() {
      this._timeouts = [];
      UI.setPhaseTag('');
      UI.hideTextBox();
      AudioManager.fadeOut(800, () => AudioManager.playThen(this.music, 'src/Birth - Super Mario Galaxy extract.m4a', 0.8));
      this._build();
    },

    _build() {
      const wrap = document.createElement('div');
      wrap.className = 'reveal-wrap';
      this._wrap = wrap;

      // ── Sección cinemática ──
      const cinematic = document.createElement('div');
      cinematic.className = 'reveal-cinematic';

      const welcome = document.createElement('div');
      welcome.className = 'reveal-welcome';
      welcome.innerHTML = 'Bienvenido Luis Ángel,<br>bienvenido a una nueva galaxia';

      const galaxyName = document.createElement('div');
      galaxyName.className = 'reveal-galaxy-name';
      galaxyName.textContent = '★ GALAXIA LESLIE ★';

      cinematic.appendChild(welcome);
      cinematic.appendChild(galaxyName);

      // ── Sección boleto ──
      const ticketSection = document.createElement('div');
      ticketSection.className = 'reveal-ticket-section';
      this._ticketSection = ticketSection;

      const ticketCard = document.createElement('div');
      ticketCard.className = 'ticket-card';
      ticketCard.innerHTML = `
        <div class="ticket-event">
          <small>⭐ Concierto Sinfónico ⭐</small>
          Súper Mario Galaxy<br>Sinfónico
        </div>
        <div class="ticket-divider"></div>
        <div class="ticket-venue">
          Teatro Pablo de Villavicencio<br>
          <span>Culiacán, Sinaloa</span>
        </div>
        <div class="ticket-date">Sábado 16 de Mayo</div>
        <div class="ticket-time">4:00 PM</div>
        <div class="ticket-divider"></div>
        <div class="ticket-info-row">
          <div class="ticket-info-item">
            <span class="ticket-info-label">Zona</span>
            <span class="ticket-info-value">Mezannine</span>
          </div>
          <div class="ticket-info-item">
            <span class="ticket-info-label">Asiento</span>
            <span class="ticket-info-value">S-21</span>
          </div>
          <div class="ticket-info-item">
            <span class="ticket-info-label">Tipo</span>
            <span class="ticket-info-value">Adulto</span>
          </div>
        </div>
        <div class="ticket-divider"></div>
        <div class="ticket-footer">✦ Un regalo de Leslie ✦</div>
      `;
      ticketSection.appendChild(ticketCard);
      ticketSection.style.display = 'none';

      wrap.appendChild(cinematic);
      wrap.appendChild(ticketSection);
      document.body.appendChild(wrap);
      requestAnimationFrame(() => requestAnimationFrame(() => wrap.classList.add('shown')));

      // Bienvenida
      this._timeouts.push(setTimeout(() => welcome.classList.add('shown'), 2200));

      // Cometas — 2 por oleada, 3 oleadas
      [8000, 8350, 9000, 9400, 10200, 10650, 11650, 12300].forEach(t => this._timeouts.push(setTimeout(() => FXManager.comet(), t)));

      // "GALAXIA LESLIE" tenue → brillante
      this._timeouts.push(setTimeout(() => galaxyName.classList.add('shown'), 12000));
      this._timeouts.push(setTimeout(() => galaxyName.classList.add('bright'), 14500));

      // Transición a boleto
      this._timeouts.push(setTimeout(() => {
        cinematic.classList.add('hiding');
        this._timeouts.push(setTimeout(() => {
          cinematic.style.display = 'none';
          ticketSection.style.display = 'flex';
          requestAnimationFrame(() => requestAnimationFrame(() => {
            ticketSection.classList.add('shown');
            const btn = document.createElement('button');
            btn.className = 'btn-continue visible';
            btn.innerHTML = '<span>Ver mensaje de Leslie ✦</span>';
            ticketSection.appendChild(btn);
            requestAnimationFrame(() => btn.classList.add('shown'));
            btn.onclick = () => this._showMessage();
          }));
        }, 1000));
      }, 22000));
    },

    _showMessage() {
      const section = this._ticketSection;
      section.querySelector('.btn-continue')?.remove();

      // Paso 1: boleto se encoge suavemente a su tamaño final (transición CSS)
      section.classList.add('will-split');

      // Paso 2: tras la transición, cambiar a fila y revelar mensaje (FLIP para slide suave)
      this._timeouts.push(setTimeout(() => {
        const card = section.querySelector('.ticket-card');

        // FIRST: posición actual del boleto (ya encogido por will-split)
        const before = card.getBoundingClientRect();

        // Cambiar layout — el boleto salta a su posición final
        section.classList.add('split');
        this._wrap?.classList.add('scrolling');

        // LAST: nueva posición tras el cambio de layout
        const after = card.getBoundingClientRect();

        // INVERT: poner el boleto visualmente donde estaba
        const dx = before.left - after.left;
        const dy = before.top  - after.top;
        card.style.transition = 'none';
        card.style.transform  = `translate(${dx}px, ${dy}px)`;

        // PLAY: animar hacia la posición real
        requestAnimationFrame(() => requestAnimationFrame(() => {
          card.style.transition = 'transform 0.7s cubic-bezier(0.4, 0, 0.2, 1)';
          card.style.transform  = '';
        }));

        // Limpiar estilos inline cuando termine la animación
        card.addEventListener('transitionend', () => {
          card.style.transition = '';
        }, { once: true });

        const msgCol = document.createElement('div');
        msgCol.className = 'reveal-msg-col';

        const msgText = document.createElement('div');
        msgText.className = 'reveal-message-text';
        msgCol.appendChild(msgText);
        section.appendChild(msgCol);

        this._timeouts.push(setTimeout(() => msgCol.classList.add('shown'), 1000));

        TypeWriter.write(
          msgText,
          `Eres un cosmonauta muy persistente. Tu curiosidad te ha llevado a conocer grandes galaxias como la mía. Y por llegar hasta acá, a la galaxia Leslie, quiero recompensar tu gran esfuerzo con este obsequio, en este día, que es tu cumpleaños número 31. Es un honor para mí, invitarte a un evento cósmico y mágico muy especial, lleno de vibraciones estelares: a una sinfonía musical de Super Mario Galaxy. El lugar y la hora se encuentran en el boleto, tu pase a esta experiencia fantástica te espera pronto.\n\nHas mostrado valentía, fuerza, determinación y entrega, te lo mereces. Espero disfrutes cada nota que entre por tus sentidos, cada melodía, cada ritmo, cada sonido...\n\nY espero estar a tu lado en ese momento para compartir juntos.\n\nTenemos una cita llena de sonidos vibrantes y mágicos.\n\n- Con amor, Leslie 💜`,
          22,
          () => {
            const btn = document.createElement('button');
            btn.className = 'btn-continue visible';
            btn.style.marginTop = '1.5rem';
            btn.innerHTML = '<span>Continuar ›</span>';
            msgCol.appendChild(btn);
            requestAnimationFrame(() => requestAnimationFrame(() => btn.classList.add('shown')));
            btn.onclick = () => Game.go(GameState.FINALE);
          }
        );
      }, 600));
    },

    onExit() {
      this._timeouts.forEach(clearTimeout);
      this._timeouts = [];
      this._wrap?.remove();
      this._wrap = null;
      this._ticketSection = null;
    }
  },

  [GameState.FINALE]: {
    tag:   'Fase VII · Fin',
    music: 'src/Family - Super Mario Galaxy.mp3',
    _wrap: null,
    _timeouts: [],

    onEnter() {
      this._timeouts = [];
      UI.setPhaseTag('');
      UI.hideTextBox();
      AudioManager.swap(this.music, 0.7);
      this._build();
    },

    _build() {
      const wrap = document.createElement('div');
      wrap.className = 'finale-wrap';
      this._wrap = wrap;

      const greeting = document.createElement('div');
      greeting.className = 'finale-greeting';
      greeting.textContent = 'Feliz cumpleaños, Luis Ángel 💙';

      const quote = document.createElement('div');
      quote.className = 'finale-quote';
      quote.textContent = 'El amor es la única cosa que trasciende las dimensiones del tiempo y del espacio';

      const whisper = document.createElement('div');
      whisper.className = 'finale-whisper';
      whisper.textContent = 'Gracias por estar aquí';

      const teAmo = document.createElement('div');
      teAmo.className = 'finale-teamo';
      teAmo.textContent = 'Te Amo';

      wrap.appendChild(greeting);
      wrap.appendChild(quote);
      wrap.appendChild(whisper);
      wrap.appendChild(teAmo);
      document.body.appendChild(wrap);

      requestAnimationFrame(() => requestAnimationFrame(() => wrap.classList.add('shown')));

      // Feliz cumpleaños — pulsa y brilla suavemente ~10s antes del siguiente elemento
      this._timeouts.push(setTimeout(() => greeting.classList.add('shown'), 1200));

      // La frase — aparece como un susurro del cosmos
      this._timeouts.push(setTimeout(() => quote.classList.add('shown'), 11500));

      // El cierre — como un eco muy lejano
      this._timeouts.push(setTimeout(() => whisper.classList.add('shown'), 18000));

      // Te Amo — aparece suave y tierno al final
      this._timeouts.push(setTimeout(() => teAmo.classList.add('shown'), 24000));
    },

    onExit() {
      this._timeouts.forEach(clearTimeout);
      this._timeouts = [];
      this._wrap?.remove();
      this._wrap = null;
    }
  }
};

const ConstellationGame = {
  _container: null,
  _canvas:    null,
  _ctx:       null,
  _stars:     [],
  _decoys:    [],
  _next:      0,
  _frozen:    false,
  _animId:    null,

  _positions: [
    { fx: 0.28, fy: 0.40 },
    { fx: 0.50, fy: 0.22 },
    { fx: 0.72, fy: 0.40 },
    { fx: 0.64, fy: 0.67 },
    { fx: 0.36, fy: 0.67 },
  ],

  init() { this._container = document.getElementById('lumaGame'); },

  start(onEnd) {
    this._next   = 0;
    this._frozen = false;
    this._stars  = [];
    this._decoys = [];
    this._container.innerHTML = '';
    this._container.classList.add('active');
    this._showTutorial(
      '✦',
      [
        'Conecta las <b style="color:#f7c948">estrellas numeradas</b> en orden, del 1 al 5.',
        'Toca el <b style="color:#f7c948">1</b>, luego el <b style="color:#f7c948">2</b>... hasta cerrar la constelación.',
        '¡Ojo con las <b style="color:#ffa878">impostoras ★</b> — te congelan si las tocas!',
      ],
      () => this._beginGame(onEnd)
    );
  },

  _showTutorial(icon, lines, onReady) {
    const dialog = document.createElement('div');
    dialog.className = 'nave-intervention';
    dialog.innerHTML = `
      <div class="nave-leslie-msg">
        <div class="nave-leslie-icon">${icon}</div>
        ${lines.map(l => `<span>${l}</span>`).join('')}
      </div>
      <div class="nave-love-opts">
        <button>¡Entendido! ✦</button>
      </div>
    `;
    this._container.appendChild(dialog);
    requestAnimationFrame(() => requestAnimationFrame(() => dialog.classList.add('shown')));
    dialog.querySelector('button').addEventListener('click', () => {
      dialog.classList.remove('shown');
      setTimeout(() => { dialog.remove(); onReady(); }, 400);
    });
  },

  _beginGame(onEnd) {
    const W = window.innerWidth, H = window.innerHeight;

    this._canvas = document.createElement('canvas');
    this._canvas.width  = W;
    this._canvas.height = H;
    this._canvas.style.cssText = 'position:absolute;inset:0;pointer-events:none;';
    this._ctx = this._canvas.getContext('2d');
    this._container.appendChild(this._canvas);

    const hint = document.createElement('div');
    hint.className   = 'const-hint';
    hint.textContent = '¡Conecta las estrellas en orden! ✦  (¡ojo con las impostoras!)';
    this._container.appendChild(hint);

    // Estrellas numeradas con movimiento suave
    this._stars = this._positions.map((pos, i) => {
      const x = pos.fx * W, y = pos.fy * H;
      const el = document.createElement('div');
      el.className = 'const-star';
      el.style.left = `${x}px`;
      el.style.top  = `${y}px`;
      const num = document.createElement('span');
      num.className   = 'const-number';
      num.textContent = i + 1;
      el.appendChild(num);
      const star = {
        el, x, y, i, connected: false,
        vx: (Math.random() - 0.5) * 0.7,
        vy: (Math.random() - 0.5) * 0.7,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.014 + Math.random() * 0.008,
      };
      el.addEventListener('click', () => this._clickStar(star, onEnd));
      this._container.appendChild(el);
      return star;
    });

    // Estrellas impostoras (3) con movimiento más nervioso
    this._decoys = this._placeDecoys(W, H).map(pos => {
      const el = document.createElement('div');
      el.className = 'const-star const-decoy';
      el.style.left = `${pos.x}px`;
      el.style.top  = `${pos.y}px`;
      const sym = document.createElement('span');
      sym.className   = 'const-number';
      sym.textContent = '★';
      el.appendChild(sym);
      const decoy = {
        el, x: pos.x, y: pos.y,
        vx: (Math.random() - 0.5) * 1.1,
        vy: (Math.random() - 0.5) * 1.1,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.02 + Math.random() * 0.012,
      };
      el.addEventListener('click', () => this._clickDecoy());
      this._container.appendChild(el);
      return decoy;
    });

    this._loop(W, H);
  },

  _placeDecoys(W, H) {
    const result = [], taken = this._positions.map(p => ({ x: p.fx * W, y: p.fy * H }));
    let tries = 0;
    while (result.length < 3 && tries++ < 200) {
      const x = 70 + Math.random() * (W - 140);
      const y = 70 + Math.random() * (H - 140);
      if ([...taken, ...result].every(p => Math.hypot(p.x - x, p.y - y) > 110)) {
        result.push({ x, y });
        taken.push({ x, y });
      }
    }
    return result;
  },

  _clickStar(star, onEnd) {
    if (this._frozen || star.connected) return;
    if (star.i !== this._next) {
      star.el.classList.add('wrong');
      setTimeout(() => star.el.classList.remove('wrong'), 450);
      return;
    }
    star.connected = true;
    star.el.classList.add('connected');
    star.el.style.pointerEvents = 'none';

    if (this._next > 0) {
      const prev = this._stars[this._next - 1];
      this._drawLine(prev.x, prev.y, star.x, star.y);
    }
    this._next++;

    if (this._next === this._stars.length) {
      this._drawLine(star.x, star.y, this._stars[0].x, this._stars[0].y);
      cancelAnimationFrame(this._animId);
      setTimeout(() => this._complete(onEnd), 500);
    }
  },

  _clickDecoy() {
    if (this._frozen) return;
    this._frozen = true;

    // Congelar y mostrar rojo en todas las no-conectadas
    [...this._stars.filter(s => !s.connected), ...this._decoys].forEach(obj => {
      obj.el.classList.add('wrong');
      obj.el.style.pointerEvents = 'none';
    });

    setTimeout(() => {
      this._frozen = false;
      this._stars.filter(s => !s.connected).forEach(s => {
        s.el.classList.remove('wrong');
        s.el.style.pointerEvents = '';
      });
      this._decoys.forEach(d => {
        d.el.classList.remove('wrong');
        d.el.style.pointerEvents = '';
      });
    }, 1500);
  },

  _drawLine(x1, y1, x2, y2) {
    const ctx = this._ctx;
    ctx.save();
    ctx.strokeStyle = 'rgba(247,201,72,0.88)';
    ctx.lineWidth   = 2;
    ctx.shadowColor = '#f7c948';
    ctx.shadowBlur  = 10;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
  },

  _loop(W, H) {
    const m = 28;
    [...this._stars.filter(s => !s.connected), ...this._decoys].forEach(obj => {
      obj.wobble += obj.wobbleSpeed;
      obj.x += obj.vx;
      obj.y += obj.vy + Math.sin(obj.wobble) * 0.28;

      if (obj.x < m)     { obj.x = m;     obj.vx =  Math.abs(obj.vx); }
      if (obj.x > W - m) { obj.x = W - m; obj.vx = -Math.abs(obj.vx); }
      if (obj.y < m)     { obj.y = m;     obj.vy =  Math.abs(obj.vy); }
      if (obj.y > H - m) { obj.y = H - m; obj.vy = -Math.abs(obj.vy); }

      obj.el.style.left = `${obj.x}px`;
      obj.el.style.top  = `${obj.y}px`;
    });
    this._animId = requestAnimationFrame(() => this._loop(W, H));
  },

  _complete(onEnd) {
    Game.addStar();
    const W = window.innerWidth, H = window.innerHeight;
    const heart = document.createElement('div');
    heart.className   = 'const-complete';
    heart.textContent = '♥';
    heart.style.left  = `${W / 2}px`;
    heart.style.top   = `${H / 2}px`;
    this._container.appendChild(heart);
    setTimeout(() => {
      this._container.classList.remove('active');
      this._container.innerHTML = '';
      onEnd?.();
    }, 2200);
  },

  stop() {
    cancelAnimationFrame(this._animId);
    this._container.classList.remove('active');
    this._container.innerHTML = '';
  }
};

const LumaGame = {
  _lumas:              [],
  _animId:             null,
  _timer:              null,
  _timeLeft:           20,
  _caught:             0,
  _container:          null,
  _timerEl:            null,
  _challengeTriggered: false,
  _onEnd:              null,

  init() {
    this._container = document.getElementById('lumaGame');
  },

  _colors: [
    { bg: '#f7c948', glow: '#f7c948' },
    { bg: '#6ec6ff', glow: '#5aadff' },
    { bg: '#ff8fb0', glow: '#ff6a96' },
    { bg: '#7fffb8', glow: '#50e890' },
    { bg: '#c8a0ff', glow: '#a870ff' },
    { bg: '#ffa570', glow: '#ff8040' },
  ],

  // fast=true → modo reto (velocidad x2.5)
  _spawnLuma(fast = false) {
    const W = window.innerWidth, H = window.innerHeight;
    const color  = this._colors[Math.floor(Math.random() * this._colors.length)];
    const size   = 55 + Math.random() * 20; // Estrellas más grandes (fáciles de tocar)
    const margin = size * 1.2; // Aumentar un poco el margen para que no se peguen tanto a los bordes
    const spd    = fast ? 2.5 + Math.random() * 1.5 : 0.5 + Math.random() * 0.6; // Velocidad mucho más lenta

    // Wrapper: área de clic completa (sin clip-path)
    const wrapper = document.createElement('div');
    wrapper.className = 'luma-orb';
    wrapper.style.width  = `${size}px`;
    wrapper.style.height = `${size}px`;

    // Estrella visual: solo decorativa, no captura clics
    const star = document.createElement('div');
    star.className = 'luma-star-shape';
    star.style.background = `radial-gradient(circle at 38% 28%, #ffffffcc 0%, ${color.bg} 50%, ${color.bg}88 100%)`;
    star.style.filter     = `drop-shadow(0 0 9px ${color.glow}) drop-shadow(0 0 3px #fff4)`; // Mantener el brillo
    wrapper.appendChild(star);

    const luma = {
      el: wrapper,
      x:  margin + Math.random() * (W - margin * 2),
      y:  margin + Math.random() * (H - margin * 2),
      vx: (Math.random() < 0.5 ? 1 : -1) * spd,
      vy: (Math.random() < 0.5 ? 1 : -1) * spd * (0.5 + Math.random() * 0.5), // Mantener la variación en Y
      size,
      wobble:      Math.random() * Math.PI * 2,
      wobbleSpeed: 0.01 + Math.random() * 0.01, // Movimiento más suave y menos nervioso
      alive: true,
    };

    wrapper.addEventListener('click', () => this._catchLuma(luma));
    this._container.appendChild(wrapper);
    this._lumas.push(luma);
  },

  _catchLuma(luma) {
    if (!luma.alive) return;
    luma.alive = false;
    luma.el.classList.add('caught');
    setTimeout(() => luma.el.remove(), 200);
    this._lumas = this._lumas.filter(l => l !== luma);
    this._caught++;
    Game.addStar();

    // Verificar modo reto: todas atrapadas
    if (!this._challengeTriggered && this._lumas.length === 0) {
      if (this._timeLeft > 5) {
        this._triggerChallenge();
      } else {
        // Todas recogidas sin tiempo suficiente para reto — terminar limpio
        clearInterval(this._timer);
        this._timer = null;
        cancelAnimationFrame(this._animId);
        setTimeout(() => {
          this._container.classList.remove('active');
          this._container.innerHTML = '';
          this._onEnd?.(this._caught, false);
        }, 800);
      }
    }
  },

  _triggerChallenge() {
    this._challengeTriggered = true;
    AudioManager.swap('src/Big Bad Bugaboom - Super Mario Galaxy.mp3', 0.8);

    const msg = document.createElement('div');
    msg.className = 'luma-challenge-msg';
    msg.innerHTML = `
      Espera, espera, espera... 🧐<br>
      <span>¿En serio las atrapaste TODAS así de rápido?</span><br>
      <small>Muy bien, cosmonauta... claramente necesitas un reto de verdad.</small><br>
      <small>¡Que vengan MÁS Lumas! 😈</small>
    `;
    this._container.appendChild(msg);

    // Pausar el timer mientras se lee el mensaje
    clearInterval(this._timer);
    this._timer = null;

    setTimeout(() => {
      msg.classList.add('hiding');
      setTimeout(() => {
        msg.remove();
        for (let i = 0; i < 25; i++) {
          setTimeout(() => this._spawnLuma(true), i * 80);
        }
        // Reiniciar el timer a 20s para la ronda de reto
        this._timeLeft = 20;
        this._timerEl.textContent = '20';
        this._timerEl.classList.remove('urgent');
        this._resumeTimer();
      }, 400);
    }, 8000);
  },

  _resumeTimer() {
    this._timer = setInterval(() => {
      this._timeLeft--;
      this._timerEl.textContent = this._timeLeft;
      if (this._timeLeft <= 5) this._timerEl.classList.add('urgent');
      if (this._timeLeft <= 0) {
        clearInterval(this._timer);
        this._timer = null;
        cancelAnimationFrame(this._animId);
        setTimeout(() => {
          this._container.classList.remove('active');
          this._container.innerHTML = '';
          const retoCumplido = this._challengeTriggered && this._lumas.length === 0;
          this._onEnd?.(this._caught, retoCumplido);
        }, 1000);
      }
    }, 1000);
  },

  _loop() {
    const W = window.innerWidth, H = window.innerHeight;
    this._lumas.forEach(l => {
      if (!l.alive) return;
      l.wobble += l.wobbleSpeed;
      l.x += l.vx;
      l.y += l.vy + Math.sin(l.wobble) * 0.5;

      const m = l.size / 2;
      if (l.x < m)     { l.x = m;     l.vx =  Math.abs(l.vx); }
      if (l.x > W - m) { l.x = W - m; l.vx = -Math.abs(l.vx); }
      if (l.y < m)     { l.y = m;     l.vy =  Math.abs(l.vy); }
      if (l.y > H - m) { l.y = H - m; l.vy = -Math.abs(l.vy); }

      l.el.style.left = `${l.x - m}px`;
      l.el.style.top  = `${l.y - m}px`;
    });
    this._animId = requestAnimationFrame(() => this._loop());
  },

  start(onEnd) {
    this._caught              = 0;
    this._timeLeft            = 20;
    this._lumas               = [];
    this._challengeTriggered  = false;
    this._onEnd               = onEnd;
    this._container.innerHTML = '';
    this._container.classList.add('active');
    this._showTutorial(
      '★',
      [
        '¡Aparecen <b style="color:#f7c948">20 Lumas</b> flotando por la pantalla!',
        '<b style="color:#f7c948">Tócalas</b> para atraparlas — tienes <b style="color:#f7c948">20 segundos</b>.',
        '¡Si atrapas todas rápido... viene un reto extra! 😈',
      ],
      () => this._beginGame()
    );
  },

  _showTutorial(icon, lines, onReady) {
    const dialog = document.createElement('div');
    dialog.className = 'nave-intervention';
    dialog.innerHTML = `
      <div class="nave-leslie-msg">
        <div class="nave-leslie-icon">${icon}</div>
        ${lines.map(l => `<span>${l}</span>`).join('')}
      </div>
      <div class="nave-love-opts">
        <button>¡Entendido! ✦</button>
      </div>
    `;
    this._container.appendChild(dialog);
    requestAnimationFrame(() => requestAnimationFrame(() => dialog.classList.add('shown')));
    dialog.querySelector('button').addEventListener('click', () => {
      dialog.classList.remove('shown');
      setTimeout(() => { dialog.remove(); onReady(); }, 400);
    });
  },

  _beginGame() {
    this._timerEl = document.createElement('div');
    this._timerEl.className   = 'luma-timer';
    this._timerEl.textContent = '20';
    this._container.appendChild(this._timerEl);

    const hint = document.createElement('div');
    hint.className   = 'luma-hint';
    hint.textContent = '¡Toca las Lumas para atraparlas!';
    this._container.appendChild(hint);

    for (let i = 0; i < 20; i++) this._spawnLuma();
    this._loop();
    this._resumeTimer();
  },

  stop() {
    clearInterval(this._timer);
    cancelAnimationFrame(this._animId);
    this._container.classList.remove('active');
    this._container.innerHTML = '';
  }
};

const NaveGame = {
  GAME_ZONE: 0.72,

  _container:      null,
  _canvas:         null,
  _ctx:            null,
  _shipEl:         null,
  _hpBarInner:     null,
  _timerEl:        null,
  _ctrlZoneEl:     null,
  _ctrlIndicatorEl:null,
  _paused:         false,
  _safetyTimeout:  null,
  _animId:         null,
  _meteorTimeout:  null,
  _shootInterval:  null,
  _lumaInt:        null,
  _gameInt:        null,
  _onEnd:          null,
  _startTime:      0,
  _timeLeft:       60,
  _lumasTutorialShown: false,
  _ptrId:          null,
  _ptrDownHandler: null,
  _ptrHandler:     null,
  _ptrUpHandler:   null,

  _ship:      { x: 0, hp: 100, size: 28 },
  _meteors:   [],
  _bullets:   [],
  _lumaOrbs:  [],
  _warpStars: [],
  _lumaCount: 0,
  _interventions: 0,

  init() { this._container = document.getElementById('lumaGame'); },

  start(onEnd) {
    this._onEnd              = onEnd;
    this._ship.hp            = 100;
    this._lumaCount          = 0;
    this._interventions      = 0;
    this._paused             = false;
    this._safetyTimeout      = null;
    this._lumasTutorialShown = false;
    this._ptrId              = null;
    this._meteors            = [];
    this._bullets            = [];
    this._lumaOrbs           = [];
    this._warpStars          = [];
    this._container.innerHTML = '';
    this._container.classList.add('active');
    this._ship.x = window.innerWidth / 2;

    this._showTutorial(
      '🚀',
      [
        '<b style="color:#f7c948">Desliza horizontalmente</b> en la zona inferior para mover la nave.',
        'La nave <b style="color:#f7c948">dispara sola</b> — destruye los meteoros antes de que te alcancen.',
        'Si pierdes vida aparecerán <b style="color:#f7c948">Lumas</b> — ¡dispara 2 para pedir rescate! 💙',
      ],
      () => this._beginGame()
    );
  },

  _showTutorial(icon, lines, onReady) {
    const dialog = document.createElement('div');
    dialog.className = 'nave-intervention';
    dialog.innerHTML = `
      <div class="nave-leslie-msg">
        <div class="nave-leslie-icon">${icon}</div>
        ${lines.map(l => `<span>${l}</span>`).join('')}
      </div>
      <div class="nave-love-opts"><button>¡Entendido! ✦</button></div>
    `;
    this._container.appendChild(dialog);
    requestAnimationFrame(() => requestAnimationFrame(() => dialog.classList.add('shown')));
    dialog.querySelector('button').addEventListener('click', () => {
      dialog.classList.remove('shown');
      setTimeout(() => { dialog.remove(); onReady(); }, 400);
    });
  },

  _beginGame() {
    this._ship.x = window.innerWidth / 2;
    this._startTime = Date.now();
    this._buildUI();
    this._initWarpStars();
    this._bindControls();
    this._scheduleMeteor();
    this._shootInterval = setInterval(() => { if (!this._paused) this._shootBullet(); }, 500);
    this._lumaInt = setInterval(() => {
      if (!this._paused && this._ship.hp < 50 && this._lumaOrbs.length < 3) this._spawnLumaOrb();
    }, 1200);
    this._startGameTimer();
    this._loop();
  },

  _buildUI() {
    this._canvas = document.createElement('canvas');
    this._canvas.className = 'nave-canvas';
    this._canvas.width  = window.innerWidth;
    this._canvas.height = window.innerHeight;
    this._ctx = this._canvas.getContext('2d');
    this._container.appendChild(this._canvas);

    const hpWrap = document.createElement('div');
    hpWrap.className = 'nave-hp-wrap';
    hpWrap.innerHTML = '<span class="nave-hp-label">❤️</span>';
    const hpOuter = document.createElement('div');
    hpOuter.className = 'nave-hp-outer';
    this._hpBarInner = document.createElement('div');
    this._hpBarInner.className = 'nave-hp-inner';
    hpOuter.appendChild(this._hpBarInner);
    hpWrap.appendChild(hpOuter);
    this._container.appendChild(hpWrap);

    this._timerEl = document.createElement('div');
    this._timerEl.className   = 'nave-timer';
    this._timerEl.textContent = '⏱ 60';
    this._container.appendChild(this._timerEl);

    this._shipEl = document.createElement('div');
    this._shipEl.className   = 'nave-ship';
    this._shipEl.textContent = '🚀';
    this._container.appendChild(this._shipEl);

    this._ctrlZoneEl = document.createElement('div');
    this._ctrlZoneEl.className = 'nave-control-zone';
    this._ctrlZoneEl.innerHTML = '<div class="nave-control-hint">← desliza para mover →</div>';
    this._ctrlIndicatorEl = document.createElement('div');
    this._ctrlIndicatorEl.className = 'nave-control-indicator';
    this._ctrlZoneEl.appendChild(this._ctrlIndicatorEl);
    this._container.appendChild(this._ctrlZoneEl);

    this._updateHP();
    this._renderShip();
  },

  _initWarpStars() {
    const W = window.innerWidth, H = window.innerHeight;
    this._warpStars = Array.from({ length: 140 }, () => {
      const s = {
        x:  (Math.random() - 0.5) * W * 3,
        y:  (Math.random() - 0.5) * H * this.GAME_ZONE * 3,
        z:  Math.random() * 0.9 + 0.1,
        pz: 0,
      };
      s.pz = s.z;
      return s;
    });
  },

  _bindControls() {
    this._ptrDownHandler = e => {
      if (this._ptrId !== null) return;
      this._ptrId          = e.pointerId;
      this._anchorClientX  = e.clientX;
      this._anchorShipX    = this._ship.x;
      this._ctrlZoneEl.setPointerCapture(e.pointerId);
      this._showCtrlIndicator(e.clientX);
    };
    this._ptrHandler = e => {
      if (this._paused || e.pointerId !== this._ptrId) return;
      const delta = e.clientX - this._anchorClientX;
      const W     = window.innerWidth;
      this._ship.x = Math.max(this._ship.size, Math.min(W - this._ship.size, this._anchorShipX + delta));
      this._showCtrlIndicator(e.clientX);
    };
    this._ptrUpHandler = e => {
      if (e.pointerId !== this._ptrId) return;
      this._ptrId = null;
      this._ctrlIndicatorEl?.classList.remove('active');
    };
    this._ctrlZoneEl.addEventListener('pointerdown',   this._ptrDownHandler);
    this._ctrlZoneEl.addEventListener('pointermove',   this._ptrHandler);
    this._ctrlZoneEl.addEventListener('pointerup',     this._ptrUpHandler);
    this._ctrlZoneEl.addEventListener('pointercancel', this._ptrUpHandler);
  },

  _showCtrlIndicator(clientX) {
    if (!this._ctrlIndicatorEl) return;
    this._ctrlIndicatorEl.classList.add('active');
    this._ctrlIndicatorEl.style.left = `${clientX}px`;
  },

  _unbindControls() {
    this._ctrlZoneEl?.removeEventListener('pointerdown',   this._ptrDownHandler);
    this._ctrlZoneEl?.removeEventListener('pointermove',   this._ptrHandler);
    this._ctrlZoneEl?.removeEventListener('pointerup',     this._ptrUpHandler);
    this._ctrlZoneEl?.removeEventListener('pointercancel', this._ptrUpHandler);
  },

  _getStage() {
    const elapsed = (Date.now() - this._startTime) / 1000;
    // Antes del s35: presión suave que sube de 0 a 2 (el jugador sí recibe daño)
    if (elapsed < 35) return Math.min(Math.floor(elapsed / 12), 2);
    // Del s35 en adelante: escalada brutal, 3→8 cada 4 segundos
    return Math.min(3 + Math.floor((elapsed - 35) / 4), 8);
  },

  _scheduleMeteor() {
    const stage     = this._getStage();
    //                  0     1     2     3    4    5    6    7    8
    const intervals = [1300, 1050, 820,  550, 380, 260, 190, 140, 100];
    this._meteorTimeout = setTimeout(() => {
      if (!this._paused) this._spawnMeteor();
      this._scheduleMeteor();
    }, intervals[stage]);
  },

  _spawnSingleMeteor(stage) {
    const W    = window.innerWidth;
    const x    = 30 + Math.random() * (W - 60);
    const spd  = (3.2 + stage * 0.65) + Math.random() * 2;
    const vx   = (Math.random() - 0.5) * 2.2;
    const size = 14 + Math.random() * 10 + Math.min(stage, 5) * 1.2;
    const el = document.createElement('div');
    el.className    = 'nave-meteor';
    el.style.width  = `${size}px`;
    el.style.height = `${size}px`;
    this._container.appendChild(el);
    this._meteors.push({ el, x, y: -size, size, vx, vy: spd, alive: true });
  },

  _spawnMeteor() {
    const stage   = this._getStage();
    const elapsed = (Date.now() - this._startTime) / 1000;

    this._spawnSingleMeteor(stage);

    if (elapsed >= 25 && elapsed < 43) {
      // Ventana 30-43s: triple forzado
      this._spawnSingleMeteor(stage);
      this._spawnSingleMeteor(stage);
    } else if (elapsed >= 43) {
      // S43+: escalada máxima por stage
      if (stage >= 4 && Math.random() < 0.55) this._spawnSingleMeteor(stage);
      if (stage >= 6 && Math.random() < 0.45) this._spawnSingleMeteor(stage);
      if (stage >= 8 && Math.random() < 0.5)  this._spawnSingleMeteor(stage);
    }
  },


  _shootBullet() {
    const shipY = this._getShipY();
    this._bullets.push({ x: this._ship.x, y: shipY - 20, alive: true });
  },

  _getShipY() {
    return window.innerHeight * this.GAME_ZONE * 0.82;
  },

  _spawnLumaOrb() {
    const W = window.innerWidth, H = window.innerHeight;
    const gameH = H * this.GAME_ZONE;
    const colors = [
      { bg: '#f7c948', glow: '#f7c948' }, { bg: '#6ec6ff', glow: '#5aadff' },
      { bg: '#7fffb8', glow: '#50e890' }, { bg: '#c8a0ff', glow: '#a870ff' },
    ];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const size  = 52;

    const wrapper = document.createElement('div');
    wrapper.className    = 'luma-orb';
    wrapper.style.width  = `${size}px`;
    wrapper.style.height = `${size}px`;

    const star = document.createElement('div');
    star.className        = 'luma-star-shape';
    star.style.background = `radial-gradient(circle at 38% 28%, #ffffffcc 0%, ${color.bg} 50%, ${color.bg}88 100%)`;
    star.style.filter     = `drop-shadow(0 0 7px ${color.glow}) drop-shadow(0 0 3px #fff4)`;
    wrapper.appendChild(star);

    const orb = {
      el: wrapper, size,
      x:  60 + Math.random() * (W - 120),
      y:  60 + Math.random() * (gameH - 140),
      vx: (Math.random() - 0.5) * 1.4,
      vy: (Math.random() - 0.5) * 1.4,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.016 + Math.random() * 0.01,
      alive: true,
    };
    wrapper.style.left = `${orb.x}px`;
    wrapper.style.top  = `${orb.y}px`;
    this._container.appendChild(wrapper);
    this._lumaOrbs.push(orb);
  },

  _catchLumaOrb(orb) {
    if (!orb.alive || this._paused) return;
    orb.alive = false;
    orb.el.classList.add('caught');
    setTimeout(() => orb.el.remove(), 200);
    this._lumaOrbs = this._lumaOrbs.filter(l => l !== orb);
    this._lumaCount++;
    if (this._lumaCount >= 2) this._triggerIntervention();
  },

  _showLumasTutorial() {
    this._paused = true;
    const dialog = document.createElement('div');
    dialog.className = 'nave-intervention';
    dialog.innerHTML = `
      <div class="nave-leslie-msg">
        <div class="nave-leslie-icon">✦</div>
        ¡Espera! ¿Ves esas estrellas de colores que flotan?<br>
        <span>Son las <strong style="color:#f7c948">Lumas</strong> — ¡dispárales con la nave!</span><br>
        <span>Si impactas <strong style="color:#f7c948">2...</strong> alguien especial vendrá a rescatarte. 💙</span>
      </div>
      <div class="nave-love-opts">
        <button id="naveTutorialBtn">¡Entendido! ✦</button>
      </div>
    `;
    this._container.appendChild(dialog);
    requestAnimationFrame(() => requestAnimationFrame(() => dialog.classList.add('shown')));
    dialog.querySelector('#naveTutorialBtn').addEventListener('click', () => {
      dialog.classList.remove('shown');
      setTimeout(() => { dialog.remove(); this._paused = false; if (this._lumaOrbs.length < 3) this._spawnLumaOrb(); }, 400);
    });
  },

  _triggerIntervention() {
    this._paused    = true;
    this._lumaCount = 0;
    this._interventions++;
    this._lumaOrbs.forEach(l => l.el.remove());
    this._lumaOrbs = [];

    const dialog = document.createElement('div');
    dialog.className = 'nave-intervention';
    dialog.innerHTML = `
      <div class="nave-leslie-msg">
        <div class="nave-leslie-icon">💙</div>
        Vaya... parece que necesitas ayuda.<br>
        <span>Pero tienes que responder algo primero:</span><br>
        <strong>¿Amas a Leslie con todo tu corazón?</strong>
      </div>
      <div class="nave-love-opts" id="naveLoveOpts">
        <button data-val="0">La quiero y amo mucho 💛</button>
        <button data-val="1">La quiero y amo muchísimo ✨</button>
        <button data-val="2">Me ha hechizado en cuerpo y alma y la amo la amo la amo infinitamente 💥</button>
      </div>
      <div class="nave-love-feedback" id="naveLoveFeedback"></div>
    `;
    this._container.appendChild(dialog);
    requestAnimationFrame(() => requestAnimationFrame(() => dialog.classList.add('shown')));
    dialog.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => this._answerLove(parseInt(btn.dataset.val), dialog));
    });
  },

  _answerLove(val, dialog) {
    const responses = [
      { hp: 40,  msg: 'Aww... gracias. ¿Pero no puedes quererme un poquito más? 😏\n¡Toma algo de vida y a seguir adelante!' },
      { hp: 70,  msg: '¡Eso ya me gusta más! ✨\nLas estrellas lo escucharon — ¡recargado al 70%!' },
      { hp: 100, msg: '¡¡PERFECTO!! El universo entero lo sabe ahora. 💥\n¡Vida COMPLETA! ¡A sobrevivir, cosmonauta!' },
    ];
    const r = responses[val];
    dialog.querySelector('.nave-leslie-msg').style.display = 'none';
    dialog.querySelector('#naveLoveOpts').style.display    = 'none';
    dialog.querySelector('#naveLoveFeedback').textContent  = r.msg;
    this._ship.hp = r.hp;
    this._updateHP();
    setTimeout(() => {
      dialog.classList.remove('shown');
      setTimeout(() => { dialog.remove(); this._paused = false; }, 400);
    }, 2800);
  },

  _checkSafetyNet() {
    if (this._ship.hp <= 14 && !this._safetyTimeout && !this._paused) {
      this._ship.hp = 25;
      this._updateHP();
      this._safetyTimeout = setTimeout(() => { this._safetyTimeout = null; }, 9000);
      const msg = document.createElement('div');
      msg.className   = 'nave-safety-msg';
      msg.textContent = '💙 ¡El amor de Leslie no te deja rendirte!';
      this._container.appendChild(msg);
      requestAnimationFrame(() => requestAnimationFrame(() => msg.classList.add('shown')));
      setTimeout(() => { msg.classList.remove('shown'); setTimeout(() => msg.remove(), 500); }, 2400);
    }
  },

  _hitShip(damage) {
    if (this._paused) return;
    const prevHp  = this._ship.hp;
    this._ship.hp = Math.max(1, this._ship.hp - damage);
    this._updateHP();
    this._shipEl.classList.add('ship-hit');
    setTimeout(() => this._shipEl.classList.remove('ship-hit'), 360);
    if (prevHp >= 50 && this._ship.hp < 50 && !this._lumasTutorialShown) {
      this._lumasTutorialShown = true;
      this._showLumasTutorial();
    }
  },

  _updateHP() {
    const p = this._ship.hp;
    this._hpBarInner.style.width      = `${p}%`;
    this._hpBarInner.style.background = p > 50 ? '#50e890' : p > 25 ? '#f7c948' : '#ff6b6b';
    this._hpBarInner.style.boxShadow  = p > 50 ? '0 0 8px rgba(80,232,144,0.5)' : p > 25 ? '0 0 8px rgba(247,201,72,0.5)' : '0 0 8px rgba(255,107,107,0.5)';
  },

  _renderShip() {
    const W = window.innerWidth;
    this._ship.x = Math.max(this._ship.size, Math.min(W - this._ship.size, this._ship.x));
    this._shipEl.style.left = `${this._ship.x}px`;
    this._shipEl.style.top  = `${this._getShipY()}px`;
  },

  _drawWarpStars(W, H) {
    const ctx   = this._ctx;
    const gameH = H * this.GAME_ZONE;
    const cx    = W / 2;
    const cy    = gameH / 2;
    ctx.clearRect(0, 0, W, H);
    this._warpStars.forEach(s => {
      s.pz = s.z;
      s.z -= 0.014;
      if (s.z <= 0.01) {
        s.x  = (Math.random() - 0.5) * W * 3;
        s.y  = (Math.random() - 0.5) * gameH * 3;
        s.z  = 1;
        s.pz = 1;
        return;
      }
      const sx = (s.x / s.z) + cx;
      const sy = (s.y / s.z) + cy;
      if (sx < 0 || sx > W || sy < 0 || sy > gameH) return;
      const px  = (s.x / s.pz) + cx;
      const py  = (s.y / s.pz) + cy;
      const bri = Math.floor((1 - s.z) * 255);
      const alp = Math.min(1, (1 - s.z) * 1.4);
      ctx.strokeStyle = `rgba(${bri},${bri},${Math.min(255, bri + 60)},${alp})`;
      ctx.lineWidth   = Math.max(0.3, (1 - s.z) * 1.1);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(sx, sy);
      ctx.stroke();
    });
  },

  _drawBullets() {
    const ctx = this._ctx;
    this._bullets = this._bullets.filter(b => {
      if (!b.alive) return false;
      b.y -= 12;
      if (b.y < -20) return false;

      for (const m of this._meteors) {
        if (!m.alive) continue;
        if (Math.hypot(b.x - m.x, b.y - m.y) < m.size / 2 + 5) {
          b.alive = false;
          m.alive = false;
          m.el.classList.add('meteor-hit');
          setTimeout(() => m.el.remove(), 300);
          return false;
        }
      }

      if (this._ship.hp < 50) {
        for (const orb of this._lumaOrbs) {
          if (!orb.alive) continue;
          if (Math.hypot(b.x - (orb.x + orb.size / 2), b.y - (orb.y + orb.size / 2)) < orb.size / 2 + 6) {
            b.alive = false;
            this._catchLumaOrb(orb);
            return false;
          }
        }
      }

      ctx.save();
      ctx.shadowColor = '#aad4f5';
      ctx.shadowBlur  = 10;
      ctx.fillStyle   = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(b.x, b.y, 2.5, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return true;
    });
  },

  _loop() {
    if (!this._paused) {
      const W = window.innerWidth, H = window.innerHeight;
      const shipY = this._getShipY();

      this._drawWarpStars(W, H);
      this._drawBullets();

      this._meteors = this._meteors.filter(m => {
        if (!m.alive) return false;
        m.x += m.vx; m.y += m.vy;
        m.el.style.left = `${m.x - m.size / 2}px`;
        m.el.style.top  = `${m.y - m.size / 2}px`;
        if (m.y > H + 60) { m.el.remove(); return false; }
        if (Math.hypot(m.x - this._ship.x, m.y - shipY) < m.size / 2 + this._ship.size * 0.45) {
          m.alive = false;
          m.el.classList.add('meteor-hit');
          setTimeout(() => m.el.remove(), 300);
          this._hitShip(22);
          return false;
        }
        return true;
      });

      this._lumaOrbs.forEach(orb => {
        if (!orb.alive) return;
        orb.wobble += orb.wobbleSpeed;
        orb.x += orb.vx;
        orb.y += orb.vy + Math.sin(orb.wobble) * 0.35;
        const gameH  = H * this.GAME_ZONE;
        const margin = 50;
        if (orb.x < margin)         { orb.x = margin;         orb.vx =  Math.abs(orb.vx); }
        if (orb.x > W - margin)     { orb.x = W - margin;     orb.vx = -Math.abs(orb.vx); }
        if (orb.y < margin)         { orb.y = margin;          orb.vy =  Math.abs(orb.vy); }
        if (orb.y > gameH - margin) { orb.y = gameH - margin;  orb.vy = -Math.abs(orb.vy); }
        orb.el.style.left = `${orb.x}px`;
        orb.el.style.top  = `${orb.y}px`;
      });

      this._renderShip();
      this._checkSafetyNet();
    }
    this._animId = requestAnimationFrame(() => this._loop());
  },

  _startGameTimer() {
    this._timeLeft = 60;
    this._gameInt  = setInterval(() => {
      if (this._paused) return;
      this._timeLeft--;
      this._timerEl.textContent = `⏱ ${this._timeLeft}`;
      if (this._timeLeft <= 15) this._timerEl.classList.add('urgent');
      if (this._timeLeft <= 0) {
        clearInterval(this._gameInt);
        this._gameInt = null;
        this._showSurvivalMsg();
      }
    }, 1000);
  },

  _showSurvivalMsg() {
    this._paused = true;
    clearTimeout(this._meteorTimeout);
    clearInterval(this._lumaInt);
    clearInterval(this._shootInterval);
    cancelAnimationFrame(this._animId);
    this._lumaOrbs.forEach(l => l.el.remove());
    this._lumaOrbs = [];
    const dialog = document.createElement('div');
    dialog.className = 'nave-intervention';
    dialog.innerHTML = `
      <div class="nave-leslie-msg">
        <div class="nave-leslie-icon">🚀✦</div>
        <strong>¡¡SOBREVIVISTE!!</strong><br>
        <span>Un minuto de meteoros y aquí sigues en pie.</span><br>
        <span>Rosalina, las Lumas y yo estamos muy orgullosas de ti. 💙</span>
      </div>
    `;
    this._container.appendChild(dialog);
    requestAnimationFrame(() => requestAnimationFrame(() => dialog.classList.add('shown')));
    setTimeout(() => {
      dialog.classList.remove('shown');
      setTimeout(() => { dialog.remove(); this._finish(); }, 400);
    }, 4000);
  },

  _finish() {
    clearTimeout(this._meteorTimeout);
    clearInterval(this._lumaInt);
    clearInterval(this._gameInt);
    clearInterval(this._shootInterval);
    clearTimeout(this._safetyTimeout);
    cancelAnimationFrame(this._animId);
    this._unbindControls();
    setTimeout(() => {
      this._container.classList.remove('active');
      this._container.innerHTML = '';
      this._onEnd?.();
    }, 400);
  },

  stop() {
    clearTimeout(this._meteorTimeout);
    clearInterval(this._lumaInt);
    clearInterval(this._gameInt);
    clearInterval(this._shootInterval);
    clearTimeout(this._safetyTimeout);
    cancelAnimationFrame(this._animId);
    this._unbindControls();
    this._container.classList.remove('active');
    this._container.innerHTML = '';
  }
};

// Nuevo objeto para la precarga de assets
const AssetLoader = {
  _assetsToLoad: [],
  _loadedCount: 0,
  _totalCount: 0,

  addAudio(src) {
    this._assetsToLoad.push({ type: 'audio', src: src });
  },

  // Puedes añadir métodos para otros tipos de assets si los necesitas
  // addImage(src) {
  //   this._assetsToLoad.push({ type: 'image', src: src });
  // },

  loadAll() {
    return new Promise(resolve => {
      this._totalCount = this._assetsToLoad.length;
      if (this._totalCount === 0) {
        resolve();
        return;
      }

      this._loadedCount = 0;
      this._assetsToLoad.forEach(asset => {
        if (asset.type === 'audio') {
          const audio = new Audio();
          audio.src = asset.src;
          audio.preload = 'auto'; // Asegura que el navegador intente precargar
          audio.addEventListener('canplaythrough', () => {
            this._assetLoaded();
          }, { once: true });
          audio.addEventListener('error', (e) => {
            console.error(`Error al cargar audio: ${asset.src}`, e);
            this._assetLoaded(); // Contar como cargado para no bloquear el inicio
          }, { once: true });
          audio.load(); // Iniciar la carga
        }
        // Aquí iría la lógica para cargar imágenes si las hubiera
        // else if (asset.type === 'image') { ... }
      });

      // Pequeño intervalo para verificar si todos los assets han cargado
      const checkInterval = setInterval(() => {
        if (this._loadedCount >= this._totalCount) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  },

  _assetLoaded() { this._loadedCount++; }
};

const Game = {
  state: null,
  stars: 0,

  start() {
    UI.init();
    StarsCanvas.init();
    FXManager.init();
    LumaGame.init();
    ConstellationGame.init();
    NaveGame.init();

    // 1. Añadir todos los audios al AssetLoader
    AssetLoader.addAudio('src/Gusty Garden Galaxy - Super Mario Galaxy.mp3');
    AssetLoader.addAudio('src/Good Egg Galaxy - Super Mario Galaxy.mp3');
    AssetLoader.addAudio('src/Honeyhive Galaxy - Super Mario Galaxy.mp3');
    AssetLoader.addAudio('src/Big Bad Bugaboom - Super Mario Galaxy.mp3');
    AssetLoader.addAudio('src/Final Grand Star - Super Mario Galaxy.mp3');
    AssetLoader.addAudio('src/Dawn A New Morning - Super Mario Galaxy.mp3');
    AssetLoader.addAudio('src/Birth - Super Mario Galaxy.mp3');
    AssetLoader.addAudio('src/Birth - Super Mario Galaxy extract.m4a');
    AssetLoader.addAudio('src/Family - Super Mario Galaxy.mp3');

    // 2. Mostrar mensaje de carga y ocultar botón de inicio
    const btnStart = document.getElementById('btnStart');
    const loadingMessage = document.getElementById('loadingMessage');
    btnStart.style.display = 'none';
    loadingMessage.style.display = 'block';

    // 3. Iniciar la precarga y, al finalizar, mostrar el botón de inicio
    AssetLoader.loadAll().then(() => {
      loadingMessage.style.display = 'none';
      btnStart.style.display = 'block';
      btnStart.onclick = () => {
        // Intentar bloquear orientación a horizontal si el navegador lo permite
        if (screen.orientation && screen.orientation.lock) {
          screen.orientation.lock('landscape').catch(() => {});
        }

        // Solicitar pantalla completa para mejorar la inmersión en móvil
        const docEl = document.documentElement;
        if (docEl.requestFullscreen) {
          docEl.requestFullscreen();
        } else if (docEl.webkitRequestFullscreen) { // Soporte para Safari/iOS
          docEl.webkitRequestFullscreen();
        }

        const overlay = UI._el.startOverlay;
        overlay.classList.add('fade-out');
        setTimeout(() => { overlay.style.display = 'none'; }, 800);
        this.go(GameState.INTRO);
      };
    });
  },

  go(newState) {
    TypeWriter.skip();
    Phases[this.state]?.onExit?.();
    this.state = newState;
    Phases[newState].onEnter();
  },

  skipTo(state) {
    // Ocultar overlay de carga/inicio
    const overlay = document.getElementById('startOverlay');
    if (overlay) overlay.style.display = 'none';
    
    // Nota: UI.init() etc ya corren en window.load via Game.start(), no hace falta re-inicializarlos
    
    // Asegurar visibilidad de elementos base que el Intro suele activar
    UI.showStarBar();
    UI.showTextBox();
    UI.fadeInLogo();
    UI.fadeInSubtitle();

    this.go(state);
  },

  addStar() {
    this.stars++;
    UI.updateStarBar(this.stars);
  }
};

window.addEventListener('load', () => Game.start());
