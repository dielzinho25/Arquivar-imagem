BATE-PAPO v516

Atualizado para PWA:
- Corrigido conflito da chave FCM_VAPID_KEY_V512 duplicada.
- Cache/Service Worker limpos para não voltar para versão antiga.
- manifest.json agora abre em index.html?v=516.
- Push de ligação preparado com Firebase Cloud Messaging.
- Notificação de ligação com requireInteraction e vibração quando o app estiver fechado.

IMPORTANTE:
Para ligação chegar com app fechado, o app salva a notificação em pushQueue.
Você precisa ter uma Cloud Function ou servidor enviando o FCM para o token do usuário.
No PWA puro, sem servidor, o navegador não envia push sozinho com app fechado.

Para subir no GitHub Pages:
1. Apague os arquivos antigos do repositório.
2. Envie todos os arquivos desta pasta.
3. Abra o app com: index.html?v=516
4. No celular, feche e abra novamente; se precisar, limpe os dados do site uma vez.
