// OneSignal Push Notification Service
// App ID: cfbf5e2f-552f-4b4e-95b5-3e8d417536d2

const ONESIGNAL_APP_ID  = "cfbf5e2f-552f-4b4e-95b5-3e8d417536d2";
const ONESIGNAL_API_KEY = "os_v2_app_z67v4l2vf5fu5fnvh2guc5jw2lljw5nv3p7euw5spuqpykrdyopphxeji74prjbp4lsvun6c26g2juqdsvdb4rqtokhzeyxhmvw36jq";

// Inicializa OneSignal no Capacitor/Cordova
export function inicializarOneSignal() {
  try {
    if (window.plugins && window.plugins.OneSignal) {
      window.plugins.OneSignal.initialize(ONESIGNAL_APP_ID);
      window.plugins.OneSignal.Notifications.requestPermission(true);
      console.log("OneSignal inicializado");
    }
  } catch (e) {
    console.log("OneSignal não disponível:", e);
  }
}

// Salva o Player ID / External User ID do membro
export function identificarUsuario(userId) {
  try {
    if (window.plugins && window.plugins.OneSignal) {
      window.plugins.OneSignal.login(userId);
    }
  } catch (e) {
    console.log("OneSignal identify error:", e);
  }
}

// Envia notificação para TODOS os assinantes (chamado quando Marketing posta)
export async function enviarNotificacaoMarketing(titulo, mensagem, imagemUrl) {
  try {
    const body = {
      app_id: ONESIGNAL_APP_ID,
      included_segments: ["Total Subscriptions"],
      headings: { "pt": titulo, "en": titulo },
      contents: { "pt": mensagem, "en": mensagem },
      android_accent_color: "C9A44A",
      small_icon: "ic_stat_onesignal_default",
      large_icon: imagemUrl || "",
      big_picture: imagemUrl || "",
    };

    const res = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${ONESIGNAL_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    console.log("Notificação enviada:", data);
    return data;
  } catch (e) {
    console.log("Erro ao enviar notificação:", e);
  }
}
