import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey:            "AIzaSyD84wWbq19Oad-v-0khwHw8rsz557_vhTU",
  authDomain:        "nenq-connect.firebaseapp.com",
  databaseURL:       "https://nenq-connect-default-rtdb.firebaseio.com",
  projectId:         "nenq-connect",
  storageBucket:     "nenq-connect.firebasestorage.app",
  messagingSenderId: "94957767711",
  appId:             "1:94957767711:web:72e10dd94e18332fa2592a",
};

export const VAPID_KEY = "BFRoNCc4_neU4iu9lTyb6jLnpjwEzsRa8epwQN_AWEGthdFK0na6da692PZk0K1lJzQjsfOY1pZ-fFd-MKfvq9k";

const app        = initializeApp(firebaseConfig);
export const db  = getFirestore(app);
export const auth = getAuth(app);

let messaging = null;
try { messaging = getMessaging(app); } catch (e) {}
export { messaging };

export async function registrarTokenFCM() {
  if (!messaging) return null;
  try {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return null;
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    console.log('FCM token:', token);
    return token;
  } catch (e) {
    console.log('Erro FCM:', e);
    return null;
  }
}

export function ouvirNotificacoes(callback) {
  if (!messaging) return () => {};
  return onMessage(messaging, callback);
}
