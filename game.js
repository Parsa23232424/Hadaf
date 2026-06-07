let score = 0;
let timeLeft = 20;
let gameTimer;

const target = document.getElementById('target');
const scoreDisplay = document.getElementById('score');
const timeDisplay = document.getElementById('time');
const startBtn = document.getElementById('start-btn');

// تابع جابه‌جا کردن هدف به صورت تصادفی
function moveTarget() {
    const container = document.getElementById('game-container');
    
    // پیدا کردن عرض و طول محیط بازی
    const maxX = container.clientWidth - 60;
    const maxY = container.clientHeight - 60;

    // تولید اعداد تصادفی
    const randomX = Math.floor(Math.random() * maxX);
    const randomY = Math.floor(Math.random() * maxY);

    target.style.left = randomX + 'px';
    target.style.top = randomY + 'px';
}

// وقتی روی هدف کلیک می‌شود
target.addEventListener('click', () => {
    score++;
    scoreDisplay.textContent = score;
    moveTarget(); // بلافاصله به جای جدید برود
});

function startGame() {
    score = 0;
    timeLeft = 20;
    scoreDisplay.textContent = score;
    timeDisplay.textContent = timeLeft;
    startBtn.style.display = 'none';
    target.style.display = 'block';
    
     
    moveTarget();

    // تایمر بازی
    gameTimer = setInterval(() => {
        timeLeft--;
        timeDisplay.textContent = timeLeft;

        if (timeLeft <= 0) {
            clearInterval(gameTimer);
            alert("زمان تمام شد! امتیاز نهایی شما: " + score);
            target.style.display = 'none';
            startBtn.style.display = 'block';
            startBtn.textContent = "▶️";
        }
    }, 1000);
}
async function loadNews() {

  const url = "https://script.google.com/macros/s/AKfycbwsN8_iEVf3ti3_9AufI5Vg3-QyG3TvVBXOWIgsuKoU-JNf7_0MVn02AKSbNMZsp63RYw/exec";

  const res = await fetch(url);
  const data = await res.json();

  let html = "";

  data.forEach(n => {
    html += `
      <div style="border:1px solid #ccc;padding:10px;margin:10px;">
        <h3>${n.title}</h3>
        <p>${n.desc}</p>
      </div>
    `;
  });

  document.getElementById("news").innerHTML = html;
}

loadNews();
