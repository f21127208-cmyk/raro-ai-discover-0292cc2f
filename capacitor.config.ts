// capacitor.config.ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.raroai.discover',
  appName: 'Raro AI Discover',

  // Vite padrão
  webDir: 'dist',

  // Se seu app precisar acessar HTTP (dev/LAN). Pode remover se não usar HTTP cleartext.
  server: {
    androidScheme: 'http',
    cleartext: true,
  },

  // Opcional (ajuda em alguns cenários de conteúdo misto durante dev)
  android: {
    allowMixedContent: true,
  },
};

export default config;

