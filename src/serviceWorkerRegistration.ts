// Service worker registration helper for PWA

export function registerServiceWorker() {
  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('Manas Coop ServiceWorker registered successfully: ', registration.scope);
        })
        .catch((error) => {
          console.log('Manas Coop ServiceWorker registration failed: ', error);
        });
    });
  }
}
