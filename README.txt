BATE-PAPO v511

Atualizações:
- Cache local das conversas, mensagens, contatos, chamadas e status para carregar mais rápido.
- Mensagens, áudios, documentos e URLs ficam salvos no Firebase e também em cache local do aparelho.
- Chamada de áudio/vídeo toca quando o app estiver aberto ou em segundo plano/minimizado.
- Se o usuário estiver offline, a chamada não inicia, mas fica registrada como chamada perdida/offline.
- Quando o usuário reconectar e abrir o app, verá o registro da chamada.
- Service Worker v511 com cache atualizado e notificação local.

IMPORTANTE:
Para receber chamada com o aplicativo TOTALMENTE FECHADO no navegador/PWA, precisa configurar Push real com Firebase Cloud Messaging + VAPID key + servidor/Cloud Functions. Sem isso, site hospedado no GitHub não consegue acordar o WebRTC sozinho com o app fechado.
