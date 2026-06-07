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
    alert("پارسا تهامی پور در حال حل مشکل است لطفا شکیبا باشید👨‍💻")
    
     
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

  const url = "https://docs.google.com/spreadsheets/d/1kFAxBtSGbAEcJKumSnYhR2YG4_1RMqQBompriUQ7NwU/gviz/tq?tqx=out:csv&gid=0";

  const res = await fetch(url);
  const text = await res.text();

  const rows = text.split("\n");

  let html = "";

  for (let i = 1; i < rows.length; i++) {

    const cols = rows[i].split(",");

    const title = cols[0];
    const desc = cols[1];

    if (title && title !== "title") {
      html += `
        <div style="border:1px solid #ccc;padding:10px;margin:10px;">
          <h3>${title}</h3>
          <p>${desc}</p>
        </div>
      `;
    }
  }

  document.getElementById("news").innerHTML = html;
}

loadNews();
