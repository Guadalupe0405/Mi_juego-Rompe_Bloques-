// Obtenemos el canvas y su contexto para dibujar
const cv = document.getElementById('game');
const ctx = cv.getContext('2d');

// Referencias a elementos del DOM para actualizar la interfaz
const scoreEl = document.getElementById('score');
const highEl = document.getElementById('high');
const livesEl = document.getElementById('livesCount');
const startBtn = document.getElementById('startBtn');

// Dimensiones del canvas
let width = cv.width, height = cv.height;

/*ESTADO DEL JUEGO*/
let score = 0; // Puntaje actual

// Recuperamos el récord guardado en localStorage (o 0 si no existe)
let highScore = localStorage.getItem('breakoutHigh') ? Number(localStorage.getItem('breakoutHigh')) : 0;
highEl.textContent = highScore;

let lives = 3; // Vidas iniciales
let running = false; // Indica si el juego está en marcha

/* LA PALETA*/
// La barra que controla el jugador
let paddle = { 
  w: 100,              // ancho
  h: 12,               // alto
  x: (width-100)/2,    // posición inicial centrada
  y: height-30,        // cerca del fondo
  speed: 10            // velocidad de movimiento
};

//LA PELOTA
let ball = { 
  r: 8,           // radio
  x: width/2,     // posición inicial en el centro
  y: height/2, 
  vx: 3,          // velocidad horizontal
  vy: -3          // velocidad vertical (negativa = hacia arriba)
};

/*LOS LADRILLOS */
let bricks = [];
const rows = 5, cols = 8; // Matriz de 5 filas x 8 columnas
const offsetTop = 40;     // Margen superior
const offsetLeft = 20;    // Margen izquierdo
const brickPadding = 6;   // Espacio entre ladrillos

// Calculamos el ancho de cada ladrillo para que quepan todos
const totalBrickWidth = width - 2*offsetLeft - (cols-1)*brickPadding;
const brickW = Math.floor(totalBrickWidth / cols);
const brickH = 20; // Alto de cada ladrillo

//AUDIO
// Usamos Web Audio API para generar sonidos sin archivos externos
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// Función para reproducir un "beep" con frecuencia y duración específicas
const playBeep = (freq, dur) => {
  const o = audioCtx.createOscillator(); // Genera el tono
  const g = audioCtx.createGain();       // Controla el volumen
  
  o.connect(g); 
  g.connect(audioCtx.destination);
  
  o.type = 'sine'; //sonido suave
  o.frequency.value = freq;
  
  // Hacemos un fade in/out rápido para evitar clics
  g.gain.setValueAtTime(0.0001, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.08, audioCtx.currentTime + 0.01);
  
  o.start();
  
  g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
  o.stop(audioCtx.currentTime + dur + 0.02);
};

//CREAR LA MATRIZ DE LADRILLOS
const resetBricks = () => {
  bricks = [];
  let y = offsetTop;
  
  // Recorremos cada fila
  for (let r = 0; r < rows; r++) {
    let row = [];
    
    // Y cada columna dentro de la fila
    for (let c = 0; c < cols; c++) {
      let x = offsetLeft + c*(brickW + brickPadding);
      
      // Creamos cada ladrillo con su posición y estado
      row.push({ 
        x: x, 
        y: y, 
        w: brickW, 
        h: brickH, 
        alive: true,  // Si está vivo o ya fue destruido
        hits: 1       // Golpes necesarios para destruirlo
      });
    }
    
    bricks.push(row);
    y += brickH + brickPadding; // Siguiente fila más abajo
  }
};

// Inicializamos los ladrillos al cargar
resetBricks();

//FUNCIÓN DE DIBUJADO 
const draw = () => {
  // Limpiamos el canvas
  ctx.clearRect(0, 0, width, height);
  
  // Fondo suave con degradado pastel
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, '#fef9f3');
  bgGrad.addColorStop(1, '#fdf4f5');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  //DIBUJAMOS LOS LADRILLOS 
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const b = bricks[r][c];
      
      // Solo dibujamos si el ladrillo sigue vivo
      if (!b || !b.alive) continue;
      
      // Gradiente diferente por fila para crear un efecto arcoíris pastel
      let grad;
      if (r === 0) {
        grad = ctx.createLinearGradient(b.x, b.y, b.x+b.w, b.y+b.h);
        grad.addColorStop(0, '#ffb3d9'); // Rosa chicle
        grad.addColorStop(1, '#ffc6e3');
      } else if (r === 1) {
        grad = ctx.createLinearGradient(b.x, b.y, b.x+b.w, b.y+b.h);
        grad.addColorStop(0, '#c7b3ff'); // Lavanda
        grad.addColorStop(1, '#dac6ff');
      } else if (r === 2) {
        grad = ctx.createLinearGradient(b.x, b.y, b.x+b.w, b.y+b.h);
        grad.addColorStop(0, '#b3d9ff'); // Azul cielo
        grad.addColorStop(1, '#c6e3ff');
      } else if (r === 3) {
        grad = ctx.createLinearGradient(b.x, b.y, b.x+b.w, b.y+b.h);
        grad.addColorStop(0, '#b3ffcc'); // Menta
        grad.addColorStop(1, '#c6ffe3');
      } else {
        grad = ctx.createLinearGradient(b.x, b.y, b.x+b.w, b.y+b.h);
        grad.addColorStop(0, '#ffffb3'); // Amarillo pastel
        grad.addColorStop(1, '#ffffc6');
      }
      
      ctx.fillStyle = grad;
      roundRect(ctx, b.x, b.y, b.w, b.h, 6, true, false);
      
      // Borde sutil para definir cada ladrillo
      ctx.strokeStyle = 'rgba(155, 122, 184, 0.3)';
      ctx.lineWidth = 2;
      ctx.strokeRect(b.x, b.y, b.w, b.h);
    }
  }

  // === DIBUJAMOS LA PALETA ===
  const paddleGrad = ctx.createLinearGradient(paddle.x, paddle.y, paddle.x+paddle.w, paddle.y+paddle.h);
  paddleGrad.addColorStop(0, '#f7b7d2'); // Rosa suave
  paddleGrad.addColorStop(1, '#d89bc7'); // Rosa más intenso
  ctx.fillStyle = paddleGrad;
  roundRect(ctx, paddle.x, paddle.y, paddle.w, paddle.h, 6, true, false);
  
  // Brillo en la paleta
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 2;
  roundRect(ctx, paddle.x, paddle.y, paddle.w, paddle.h, 6, false, true);

  // DIBUJAMOS LA PELOTA
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI*2);
  
  // Gradiente radial para efecto de esfera
  const ballGrad = ctx.createRadialGradient(ball.x-2, ball.y-2, 2, ball.x, ball.y, ball.r);
  ballGrad.addColorStop(0, '#ffe0f0');
  ballGrad.addColorStop(1, '#d89bc7');
  ctx.fillStyle = ballGrad;
  ctx.fill();
  
  // Contorno de la pelota
  ctx.strokeStyle = 'rgba(155, 122, 184, 0.4)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.closePath();

  // TEXTO EN PANTALLA 
  ctx.fillStyle = '#9b7ab8';
  ctx.font = 'bold 14px Quicksand, sans-serif';
  ctx.fillText('Puntaje: ' + score, 10, height - 6);
};

// Dibuja rectángulos con esquinas redondeadas 
const roundRect = (ctxRef, x, y, w, h, r, fill, stroke) => {
  if (typeof r === 'undefined') r = 5;
  
  ctxRef.beginPath();
  ctxRef.moveTo(x + r, y);
  ctxRef.arcTo(x + w, y, x + w, y + h, r);
  ctxRef.arcTo(x + w, y + h, x, y + h, r);
  ctxRef.arcTo(x, y + h, x, y, r);
  ctxRef.arcTo(x, y, x + w, y, r);
  ctxRef.closePath();
  
  if (fill) ctxRef.fill();
  if (stroke) ctxRef.stroke();
};

//ACTUALIZAR LA LÓGICA DEL JUEGO 
const update = () => {
  // Movemos la pelota según su velocidad
  ball.x += ball.vx;
  ball.y += ball.vy;

  //  COLISIÓN CON PAREDES LATERALES Y SUPERIOR 
  if (ball.x + ball.r > width) { 
    ball.x = width - ball.r; 
    ball.vx *= -1; 
    playBeep(520, 0.05); // Sonido rebote
  }
  if (ball.x - ball.r < 0) { 
    ball.x = ball.r; 
    ball.vx *= -1; 
    playBeep(520, 0.05); 
  }
  if (ball.y - ball.r < 0) { 
    ball.y = ball.r; 
    ball.vy *= -1; 
    playBeep(520, 0.05); 
  }

  // COLISIÓN CON LA PALETA 
  if (ball.y + ball.r > paddle.y && 
      ball.y + ball.r < paddle.y + paddle.h && 
      ball.x > paddle.x && 
      ball.x < paddle.x + paddle.w) {
    
    ball.y = paddle.y - ball.r; // Reposicionamos encima de la paleta
    ball.vy *= -1; // Invertimos dirección vertical
    
    // Ajustamos la dirección horizontal según dónde golpee en la paleta
    const hitPos = (ball.x - (paddle.x + paddle.w/2)) / (paddle.w/2);
    ball.vx += hitPos * 1.2; // Más hacia los lados = más ángulo
    
    // Limitamos la velocidad horizontal
    if (Math.abs(ball.vx) > 8) ball.vx = 8 * Math.sign(ball.vx);
    
    playBeep(760, 0.03); // Sonido al golpear la paleta
  }

  // PERDER UNA VIDA (pelota cae al fondo) 
  if (ball.y - ball.r > height) {
    lives -= 1;
    playBeep(200, 0.18); // Sonido triste de perder vida
    
    if (lives <= 0) {
      // Game Over
      running = false;
      
      // Actualizamos récord si es necesario
      if (score > highScore) { 
        highScore = score; 
        localStorage.setItem('breakoutHigh', String(highScore)); 
        highEl.textContent = highScore; 
      }
      
    } else {
      // Reiniciamos posición pero conservamos vidas
      ball.x = width/2; 
      ball.y = height/2; 
      ball.vx = 3 * (Math.random() > 0.5 ? 1 : -1); // Dirección aleatoria
      ball.vy = -3;
      paddle.x = (width - paddle.w) / 2; // Centramos paleta
    }
    
    livesEl.textContent = lives; // Actualizamos display de vidas
  }

  //COLISIÓN CON LADRILLOS 
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const b = bricks[r][c];
      if (!b || !b.alive) continue;
      
      // Detectamos si la pelota toca el ladrillo
      if (ball.x + ball.r > b.x && 
          ball.x - ball.r < b.x + b.w && 
          ball.y + ball.r > b.y && 
          ball.y - ball.r < b.y + b.h) {
        
        b.alive = false; // Destruimos el ladrillo
        score += 10;     // Sumamos puntos
        scoreEl.textContent = score;
        playBeep(920, 0.04); // Sonido alegre
        ball.vy *= -1;       // Rebotamos
      }
    }
  }

  // VERIFICAR SI COMPLETAMOS EL NIVEL 
  let remaining = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (bricks[r][c].alive) remaining++;
    }
  }
  
  // Si no quedan ladrillos, siguiente nivel
  if (remaining === 0) {
    resetBricks();              // Regeneramos ladrillos
    ball.x = width/2; 
    ball.y = height/2;
    ball.vx *= 2;               // Aumentamos dificultad
    ball.vy = -Math.abs(ball.vy) * 2;
    lives = Math.min(5, lives + 1); // una vida extra
    livesEl.textContent = lives;
    playBeep(1200, 0.12);       // Sonido de victoria
  }
};

//CONTROLES DEL TECLADO
let leftDown = false, rightDown = false;

// Detectamos cuando se presionan las teclas
window.onkeydown = e => { 
  if (e.key === 'ArrowLeft') leftDown = true; 
  if (e.key === 'ArrowRight') rightDown = true; 
  if (e.key === ' ') { running = true; } // Barra espaciadora inicia el juego
};

// Detectamos cuando se sueltan las teclas
window.onkeyup = e => { 
  if (e.key === 'ArrowLeft') leftDown = false; 
  if (e.key === 'ArrowRight') rightDown = false; 
};

// BOTÓN DE INICIO/REINICIO
startBtn.addEventListener('click', () => {
  // Reseteamos todo el estado del juego
  score = 0; 
  scoreEl.textContent = score;
  
  lives = 3; 
  livesEl.textContent = lives;
  
  paddle.w = 100; 
  paddle.x = (width - paddle.w) / 2;
  
  ball.x = width/2; 
  ball.y = height/2; 
  ball.vx = 3 * (Math.random() > 0.5 ? 1 : -1); 
  ball.vy = -3;
  
  resetBricks();
  running = true; // Iniciamos el juego
});

//LOOP PRINCIPAL DEL JUEGO 
const loop = () => {
  // Movemos la paleta según las teclas presionadas
  if (leftDown) paddle.x -= paddle.speed;
  if (rightDown) paddle.x += paddle.speed;
  
  // Evitamos que la paleta se salga del canvas
  if (paddle.x < 0) paddle.x = 0;
  if (paddle.x + paddle.w > width) paddle.x = width - paddle.w;
  
  // Actualizamos física solo si el juego está corriendo
  if (running) update();
  
  // Siempre dibujamos (aunque esté pausado)
  draw();
  
  // Solicitamos el siguiente frame (60 FPS aprox)
  requestAnimationFrame(loop);
};

// Iniciamos el loop
loop();