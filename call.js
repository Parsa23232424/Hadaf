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
  let pollingTimer = null;
  let seenSignals = new Set();
  let makingOffer = false;

  const rtcConfig = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" }
    ]
  };

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

    const result = await response.json();

    if (!result.ok) {
      throw new Error(result.error || result.message || "خطا در سرویس تماس");
    }

    return result;
  }

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
        font-family:Arial,sans-serif;
      `;

      box.innerHTML = `
        <h2 id="hadafCallTitle">تماس هدف</h2>

        <video id="hadafRemoteVideo"
          autoplay playsinline
          style="width:100%;max-width:600px;max-height:55vh;
          background:#171923;border-radius:16px;"></video>

        <video id="hadafLocalVideo"
          autoplay playsinline muted
          style="width:120px;height:160px;object-fit:cover;
          position:absolute;top:90px;right:24px;
          background:#252735;border-radius:12px;"></video>

        <p id="hadafCallStatus">در حال آماده‌سازی تماس...</p>

        <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center;">
          <button id="hadafMuteButton"
            style="padding:14px;border:0;border-radius:12px;">
            🎙️ قطع میکروفون
          </button>

          <button id="hadafCameraButton"
            style="padding:14px;border:0;border-radius:12px;">
            📷 خاموش کردن دوربین
          </button>

          <button id="hadafHangupButton"
            style="padding:14px 24px;background:#e53935;color:white;
            border:0;border-radius:12px;">
            📵 پایان تماس
          </button>
        </div>
      `;

      document.body.appendChild(box);

      document.getElementById("hadafMuteButton").onclick = toggleMicrophone;
      document.getElementById("hadafCameraButton").onclick = toggleCamera;
      document.getElementById("hadafHangupButton").onclick = endCall;
    }

    return box;
  }

  function showCall(message) {
    createVideoElements();

    document.getElementById("hadafCallBox").style.display = "flex";
    document.getElementById("hadafCallStatus").textContent = message;
  }

  function setStatus(message) {
    const element = document.getElementById("hadafCallStatus");

    if (element) {
      element.textContent = message;
    }
  }

  async function startMedia(type) {
    if (localStream) return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error(
        "مرورگر اجازه دسترسی به میکروفون یا دوربین را نمی‌دهد. سایت باید HTTPS باشد."
      );
    }

    localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: type === "video"
    });

    createVideoElements();

    document.getElementById("hadafLocalVideo").srcObject = localStream;

    if (type === "audio") {
      document.getElementById("hadafLocalVideo").style.display = "none";
      document.getElementById("hadafRemoteVideo").style.display = "none";
    } else {
      document.getElementById("hadafLocalVideo").style.display = "block";
      document.getElementById("hadafRemoteVideo").style.display = "block";
    }
  }

  function createPeerConnection() {
    if (peerConnection) {
      peerConnection.close();
    }

    peerConnection = new RTCPeerConnection(rtcConfig);

    localStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, localStream);
    });

    peerConnection.ontrack = event => {
      const video = document.getElementById("hadafRemoteVideo");

      if (video) {
        video.srcObject = event.streams[0];
        video.play().catch(() => {});
      }

      setStatus("تماس برقرار است ✅");
    };

    peerConnection.onicecandidate = event => {
      if (event.candidate && currentCallId) {
        sendSignal("ice-candidate", event.candidate.toJSON())
          .catch(error => console.error("ICE error:", error));
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
        setStatus("اتصال برقرار نشد. ممکن است به سرور TURN نیاز باشد.");
      }
    };

    return peerConnection;
  }

  async function sendSignal(signalType, signalData) {
    if (!currentCallId || !currentUserId) {
      throw new Error("اطلاعات تماس کامل نیست.");
    }

    return api("sendSignal", {
      call_id: currentCallId,
      sender_id: currentUserId,
      signal_type: signalType,
      signal_data: signalData
    });
  }

  async function pollSignals() {
    if (!currentCallId || !currentUserId || !peerConnection) return;

    try {
      const result = await api("getSignals", {
        call_id: currentCallId,
        user_id: currentUserId
      });

      const signals = result.signals || result.data || [];

      for (const signal of signals) {
        if (!signal.id || seenSignals.has(signal.id)) continue;
        seenSignals.add(signal.id);

        if (signal.sender_id === currentUserId) continue;

        if (signal.signal_type === "offer") {
          if (peerConnection.signalingState !== "stable") continue;

          await peerConnection.setRemoteDescription(
            new RTCSessionDescription(signal.signal_data)
          );

          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);

          await sendSignal("answer", peerConnection.localDescription.toJSON());

          setStatus("پاسخ تماس ارسال شد؛ در حال اتصال...");
        }

        else if (signal.signal_type === "answer") {
          if (peerConnection.signalingState === "have-local-offer") {
            await peerConnection.setRemoteDescription(
              new RTCSessionDescription(signal.signal_data)
            );

            setStatus("پاسخ دریافت شد؛ در حال اتصال...");
          }
        }

        else if (signal.signal_type === "ice-candidate") {
          try {
            await peerConnection.addIceCandidate(
              new RTCIceCandidate(signal.signal_data)
            );
          } catch (error) {
            console.warn("ICE candidate:", error);
          }
        }
      }
    } catch (error) {
      console.error("خطا در دریافت پیام‌های تماس:", error);
    }
  }

  function startPolling() {
    stopPolling();

    pollingTimer = setInterval(pollSignals, 1500);
    pollSignals();
  }

  function stopPolling() {
    if (pollingTimer) {
      clearInterval(pollingTimer);
      pollingTimer = null;
    }
  }

  async function call(receiverId, conversationId, type = "audio", userId) {
    try {
      if (!receiverId || !conversationId || !userId) {
        throw new Error("شناسه تماس‌گیرنده، گفت‌وگو و کاربر لازم است.");
      }

      if (type !== "audio" && type !== "video") {
        throw new Error("نوع تماس باید audio یا video باشد.");
      }

      currentUserId = userId;
      seenSignals.clear();

      showCall("در حال شروع تماس...");

      await startMedia(type);

      const result = await api("createCall", {
        caller_id: userId,
        receiver_id: receiverId,
        conversation_id: conversationId,
        call_type: type
      });

      const callData = result.call || result.data || result;

      currentCallId = callData.id || callData.call_id;

      if (!currentCallId) {
        throw new Error("سرویس تماس شناسه تماس را برنگرداند.");
      }

      createPeerConnection();

      makingOffer = true;

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      await sendSignal("offer", peerConnection.localDescription.toJSON());

      makingOffer = false;

      setStatus("در انتظار پاسخ طرف مقابل...");

      startPolling();

      return {
        ok: true,
        callId: currentCallId
      };

    } catch (error) {
      makingOffer = false;
      await cleanup();

      console.error(error);
      alert("شروع تماس ناموفق بود: " + error.message);

      return {
        ok: false,
        error: error.message
      };
    }
  }

  async function answer(callId, userId, type = "audio") {
    try {
      if (!callId || !userId) {
        throw new Error("شناسه تماس و کاربر لازم است.");
      }

      currentCallId = callId;
      currentUserId = userId;
      seenSignals.clear();

      showCall("در حال پاسخ به تماس...");

      await startMedia(type);

      await api("answerCall", {
        call_id: callId,
        user_id: userId
      });

      createPeerConnection();
      startPolling();

      return { ok: true };

    } catch (error) {
      await cleanup();

      console.error(error);
      alert("پاسخ به تماس ناموفق بود: " + error.message);

      return {
        ok: false,
        error: error.message
      };
    }
  }

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
    seenSignals.clear();
  }

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
