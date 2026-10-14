/* =====================================
   Hadaf Messenger - WebRTC Calls
   تماس صوتی و تصویری هدف
===================================== */

const HADAF_CALLS_API =
  "https://script.google.com/macros/s/AKfycbxS8ovZyYizLupT2aoPFlMHNwb_M9SXkTE-so512Dd9Cg6-b8DGt1timOBxsLcXHcsY/exec";

window.HadafCall = (() => {
  let localStream = null;
  let peerConnection = null;
  let currentCallId = null;
  let currentUserId = null;
  let currentUserEmail = null;
  let currentReceiverId = null;
  let currentReceiverEmail = null;
  let currentConversationId = null;
  let currentCallType = "audio";
  let pollingTimer = null;
  let seenSignals = new Set();
  let receivedCandidates = [];
  let remoteDescriptionReady = false;

  const rtcConfig = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" }
    ]
  };

  /* ---------- API ---------- */

  async function api(action, data = {}) {
    const response = await fetch(HADAF_CALLS_API, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify({
        action,
        ...data
      })
    });

    const text = await response.text();

    let result;

    try {
      result = JSON.parse(text);
    } catch (error) {
      throw new Error(
        "پاسخ API معتبر نیست. وضعیت HTTP: " + response.status
      );
    }

    if (!response.ok || result.ok === false || result.success === false) {
      const details = result.details || result.message || result.error || "";
      throw new Error(
        String(details || "خطا در سرویس تماس") .slice(0, 700)
      );
    }

    return result;
  }

  /* ---------- رابط تماس ---------- */

  function createVideoElements() {
    let box = document.getElementById("hadafCallBox");

    if (!box) {
      box = document.createElement("div");
      box.id = "hadafCallBox";

      box.style.cssText = `
        position:fixed;
        inset:0;
        z-index:999999;
        background:#07090f;
        color:white;
        display:none;
        flex-direction:column;
        align-items:center;
        justify-content:center;
        padding:16px;
        box-sizing:border-box;
        font-family:Arial,sans-serif;
      `;

      box.innerHTML = `
        <h2 id="hadafCallTitle">تماس هدف</h2>

        <video id="hadafRemoteVideo"
          autoplay playsinline
          style="width:100%;max-width:600px;max-height:50vh;
          background:#171923;border-radius:16px;"></video>

        <video id="hadafLocalVideo"
          autoplay playsinline muted
          style="width:110px;height:145px;object-fit:cover;
          position:absolute;top:80px;right:20px;
          background:#252735;border-radius:12px;"></video>

        <p id="hadafCallStatus">در حال آماده‌سازی تماس...</p>

        <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;">
          <button id="hadafMuteButton"
            style="padding:12px;border:0;border-radius:12px;">
            🎙️ قطع میکروفون
          </button>

          <button id="hadafCameraButton"
            style="padding:12px;border:0;border-radius:12px;">
            📷 خاموش کردن دوربین
          </button>

          <button id="hadafHangupButton"
            style="padding:12px 20px;background:#e53935;color:white;
            border:0;border-radius:12px;">
            📵 پایان تماس
          </button>
        </div>
      `;

      document.body.appendChild(box);

      document.getElementById("hadafMuteButton").onclick =
        toggleMicrophone;

      document.getElementById("hadafCameraButton").onclick =
        toggleCamera;

      document.getElementById("hadafHangupButton").onclick =
        endCall;
    }

    return box;
  }

  function showCall(message, type) {
    createVideoElements();

    document.getElementById("hadafCallBox").style.display = "flex";
    document.getElementById("hadafCallStatus").textContent = message;

    const audioOnly = type === "audio";

    document.getElementById("hadafLocalVideo").style.display =
      audioOnly ? "none" : "block";

    document.getElementById("hadafRemoteVideo").style.display =
      audioOnly ? "none" : "block";

    document.getElementById("hadafCameraButton").style.display =
      audioOnly ? "none" : "inline-block";
  }

  function setStatus(message) {
    const element = document.getElementById("hadafCallStatus");
    if (element) element.textContent = message;
  }

  /* ---------- میکروفون و دوربین ---------- */

  async function startMedia(type) {
    if (localStream) {
      const hasVideo = localStream.getVideoTracks().length > 0;

      if (type === "video" && !hasVideo) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
      } else {
        return;
      }
    }

    if (!navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia) {
      throw new Error(
        "دسترسی میکروفون فراهم نیست. سایت باید HTTPS باشد."
      );
    }

    localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: type === "video"
    });

    createVideoElements();

    document.getElementById("hadafLocalVideo").srcObject = localStream;
  }

  /* ---------- WebRTC ---------- */

  function createPeerConnection() {
    if (peerConnection) {
      peerConnection.close();
    }

    remoteDescriptionReady = false;
    receivedCandidates = [];

    peerConnection = new RTCPeerConnection(rtcConfig);

    if (localStream) {
      localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
      });
    }

    peerConnection.ontrack = event => {
      const video = document.getElementById("hadafRemoteVideo");

      if (video && event.streams && event.streams[0]) {
        video.srcObject = event.streams[0];
        video.play().catch(() => {});
      }

      setStatus("صدای طرف مقابل دریافت شد ✅");
    };

    peerConnection.onicecandidate = event => {
      if (event.candidate && currentCallId) {
        sendSignal(
          "ice-candidate",
          event.candidate.toJSON()
        ).catch(error => {
          console.error("ICE send error:", error);
        });
      }
    };

    peerConnection.onconnectionstatechange = () => {
      if (!peerConnection) return;

      const state = peerConnection.connectionState;

      if (state === "connected") {
        setStatus("تماس برقرار است ✅");
      } else if (state === "connecting") {
        setStatus("در حال اتصال...");
      } else if (state === "disconnected") {
        setStatus("اتصال قطع شده؛ در حال بررسی...");
      } else if (state === "failed") {
        setStatus("اتصال برقرار نشد؛ ممکن است سرور TURN لازم باشد.");
      } else if (state === "closed") {
        setStatus("تماس پایان یافت.");
      }
    };

    return peerConnection;
  }

  async function addCandidate(candidate) {
    if (!peerConnection || !candidate) return;

    if (!remoteDescriptionReady) {
      receivedCandidates.push(candidate);
      return;
    }

    try {
      await peerConnection.addIceCandidate(
        new RTCIceCandidate(candidate)
      );
    } catch (error) {
      console.warn("ICE candidate:", error);
    }
  }

  async function flushCandidates() {
    remoteDescriptionReady = true;

    const candidates = receivedCandidates.slice();
    receivedCandidates = [];

    for (const candidate of candidates) {
      await addCandidate(candidate);
    }
  }

  /* ---------- سیگنال‌ها ---------- */

  async function sendSignal(signalType, signalData) {
    if (!currentCallId || !currentUserId) {
      throw new Error("اطلاعات تماس کامل نیست.");
    }

    return api("sendSignal", {
      call_id: currentCallId,
      sender_id: String(currentUserId),
      signal_type: signalType,
      signal: signalData
    });
  }

  async function pollSignals() {
    if (!currentCallId || !currentUserId || !peerConnection) {
      return;
    }

    try {
      const result = await api("getSignals", {
        call_id: currentCallId,
        sender_id: String(currentUserId)
      });

      const signals = result.signals || [];

      for (const signal of signals) {
        if (!signal.id || seenSignals.has(String(signal.id))) {
          continue;
        }

        seenSignals.add(String(signal.id));

        if (String(signal.sender_id) === String(currentUserId)) {
          continue;
        }

        const data = signal.signal || signal.signal_data;

        if (signal.signal_type === "offer") {
          if (peerConnection.signalingState !== "stable") {
            continue;
          }

          await peerConnection.setRemoteDescription(
            new RTCSessionDescription(data)
          );

          await flushCandidates();

          const answer = await peerConnection.createAnswer();

          await peerConnection.setLocalDescription(answer);

          await sendSignal(
            "answer",
            peerConnection.localDescription.toJSON()
          );

          setStatus("پاسخ ارسال شد؛ در حال اتصال...");
        }

        else if (signal.signal_type === "answer") {
          if (peerConnection.signalingState === "have-local-offer") {
            await peerConnection.setRemoteDescription(
              new RTCSessionDescription(data)
            );

            await flushCandidates();

            setStatus("پاسخ دریافت شد؛ در حال اتصال...");
          }
        }

        else if (signal.signal_type === "ice-candidate") {
          await addCandidate(data);
        }
      }
    } catch (error) {
      console.error("خطا در دریافت سیگنال:", error);
    }
  }

  function startPolling() {
    stopPolling();

    pollSignals();

    pollingTimer = setInterval(pollSignals, 1500);
  }

  function stopPolling() {
    if (pollingTimer) {
      clearInterval(pollingTimer);
      pollingTimer = null;
    }
  }

  /* ---------- شروع تماس ---------- */

  async function call(
    receiverId,
    conversationId,
    type = "audio",
    userId,
    userEmail,
    receiverEmail
  ) {
    try {
      if (!receiverId || !conversationId || !userId) {
        throw new Error(
          "شناسه گیرنده، گفت‌وگو و کاربر لازم است."
        );
      }

      if (!userEmail || !receiverEmail) {
        throw new Error(
          "ایمیل تماس‌گیرنده یا گیرنده موجود نیست. باید ایمیل هر دو کاربر را به call() بدهی."
        );
      }

      if (type !== "audio" && type !== "video") {
        throw new Error("نوع تماس باید audio یا video باشد.");
      }

      currentUserId = String(userId);
      currentUserEmail = String(userEmail).trim().toLowerCase();
      currentReceiverId = String(receiverId);
      currentReceiverEmail = String(receiverEmail).trim().toLowerCase();
      currentConversationId = String(conversationId);
      currentCallType = type;

      seenSignals.clear();

      showCall("در حال شروع تماس...", type);

      await startMedia(type);

      const result = await api("createCall", {
        caller_id: currentUserId,
        caller_email: currentUserEmail,
        receiver_id: currentReceiverId,
        receiver_email: currentReceiverEmail,
        conversation_id: currentConversationId,
        type: type
      });

      const callData = result.call || result.data || result;
      currentCallId = callData.id || callData.call_id;

      if (!currentCallId) {
        throw new Error("API شناسه تماس را برنگرداند.");
      }

      createPeerConnection();

      const offer = await peerConnection.createOffer();

      await peerConnection.setLocalDescription(offer);

      await sendSignal(
        "offer",
        peerConnection.localDescription.toJSON()
      );

      setStatus("در انتظار پاسخ طرف مقابل...");

      startPolling();

      return {
        ok: true,
        callId: currentCallId
      };

    } catch (error) {
      console.error("Hadaf call error:", error);

      const message = error.message || String(error);

      await cleanup();

      alert("شروع تماس ناموفق بود: " + message);

      return {
        ok: false,
        error: message
      };
    }
  }

  /* ---------- پاسخ به تماس ---------- */

  async function answer(
    callId,
    userId,
    type = "audio",
    userEmail
  ) {
    try {
      if (!callId || !userId) {
        throw new Error("شناسه تماس و کاربر لازم است.");
      }

      currentCallId = String(callId);
      currentUserId = String(userId);
      currentUserEmail = userEmail || "";
      currentCallType = type;

      seenSignals.clear();

      showCall("در حال پاسخ به تماس...", type);

      await startMedia(type);

      createPeerConnection();

      await api("answerCall", {
        call_id: currentCallId,
        user_id: currentUserId
      });

      startPolling();

      return { ok: true };

    } catch (error) {
      console.error("Hadaf answer error:", error);

      const message = error.message || String(error);

      await cleanup();

      alert("پاسخ به تماس ناموفق بود: " + message);

      return {
        ok: false,
        error: message
      };
    }
  }

  /* ---------- پایان تماس ---------- */

  async function endCall() {
    const callId = currentCallId;
    const userId = currentUserId;

    await cleanup();

    if (callId && userId) {
      try {
        await api("endCall", {
          call_id: callId,
          user_id: userId
        });
      } catch (error) {
        console.error("خطا در پایان تماس:", error);
      }
    }
  }

  async function cleanup() {
    stopPolling();

    if (peerConnection) {
      peerConnection.ontrack = null;
      peerConnection.onicecandidate = null;
      peerConnection.close();
      peerConnection = null;
    }

    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      localStream = null;
    }

    const localVideo = document.getElementById("hadafLocalVideo");
    const remoteVideo = document.getElementById("hadafRemoteVideo");
    const box = document.getElementById("hadafCallBox");

    if (localVideo) localVideo.srcObject = null;
    if (remoteVideo) remoteVideo.srcObject = null;
    if (box) box.style.display = "none";

    currentCallId = null;
    currentUserId = null;
    currentUserEmail = null;
    currentReceiverId = null;
    currentReceiverEmail = null;
    currentConversationId = null;

    seenSignals.clear();
    receivedCandidates = [];
    remoteDescriptionReady = false;
  }

  /* ---------- کنترل میکروفون ---------- */

  function toggleMicrophone() {
    if (!localStream) return;

    const tracks = localStream.getAudioTracks();
    if (!tracks.length) return;

    const enabled = !tracks[0].enabled;

    tracks.forEach(track => {
      track.enabled = enabled;
    });

    document.getElementById("hadafMuteButton").textContent =
      enabled ? "🎙️ قطع میکروفون" : "🔇 روشن کردن میکروفون";
  }

  /* ---------- کنترل دوربین ---------- */

  function toggleCamera() {
    if (!localStream) return;

    const tracks = localStream.getVideoTracks();
    if (!tracks.length) return;

    const enabled = !tracks[0].enabled;

    tracks.forEach(track => {
      track.enabled = enabled;
    });

    document.getElementById("hadafCameraButton").textContent =
      enabled ? "📷 خاموش کردن دوربین" : "📷 روشن کردن دوربین";
  }

  return {
    call,
    answer,
    endCall
  };
})();
