/* eslint-disable no-undef */
// Firebase Messaging Service Worker
// - Recebe notificações FCM em background (mesmo com tela desligada)
// - Exibe notificação com vibração e som padrão do sistema
//
// IMPORTANTE:
// Este arquivo fica em /public para ser servido em /firebase-messaging-sw.js
// (root scope), como o Firebase Messaging exige.

importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

// ⚠️ Use o MESMO firebaseConfig do frontend
firebase.initializeApp({
  apiKey: 'AIzaSyBKcFgN1x8bcjCHxC7ZImIlSUP0k4AoF34',
  authDomain: 'jhans-burgers-admin.firebaseapp.com',
  projectId: 'jhans-burgers-admin',
  storageBucket: 'jhans-burgers-admin.firebasestorage.app',
  messagingSenderId: '578283100820',
  appId: '1:578283100820:web:af9b65acb149a39819f281',
  measurementId: 'G-ESBZPFWJ30',
});

const messaging = firebase.messaging();

// Mensagens em BACKGROUND
messaging.onBackgroundMessage((payload) => {
  try {
    const data = payload?.data || {};

    const title = data.title || 'Nova corrida disponível';
    const body = data.body || 'Abra o app do motoboy para aceitar.';

    // Deep-link para abrir o app na oferta/pedido
    const url = data.url || '/motoboy';

    const orderId = data.orderId || '';
    const tag = data.tag || (orderId ? `offer-${orderId}` : 'offer');

    const options = {
      body,
      icon: '/logo-motoboy.svg',
      badge: '/logo-motoboy.svg',
      // Mantém a notificação na tela até o motoboy interagir.
      // (em alguns Androids isso ajuda bastante no “estilo iFood”)
      requireInteraction: true,
      // Tenta vibrar (Android/Chrome normalmente respeita)
      vibrate: [250, 120, 250, 120, 450],
      // Reutiliza a mesma notificação por pedido (evita spam)
      tag,
      renotify: true,
      data: {
        url,
        orderId,
        tenantId: data.tenantId || '',
      },
      actions: [
        { action: 'open', title: 'Abrir' },
        { action: 'accept', title: 'Aceitar' },
      ],
    };

    self.registration.showNotification(title, options);
  } catch (e) {
    // Nunca deixa o SW quebrar
    console.error('[firebase-messaging-sw] onBackgroundMessage error', e);
  }
});

// Clique na notificação (ou em ações)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification?.data?.url || '/motoboy';

  // Se clicou em “Aceitar”, abrimos o app já destacando a oferta.
  // (A aceitação em si é feita dentro do app por segurança e auth.)
  const finalUrl = event.action === 'accept'
    ? (url.includes('?') ? `${url}&autoFocus=1` : `${url}?autoFocus=1`)
    : url;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        // Reaproveita uma janela aberta
        if ('focus' in client) {
          try {
            client.navigate(finalUrl);
          } catch (_) {}
          return client.focus();
        }
      }
      // Abre nova janela
      if (clients.openWindow) return clients.openWindow(finalUrl);
      return null;
    })
  );
});
