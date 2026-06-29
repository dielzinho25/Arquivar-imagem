BATE-PAPO v513 - FCM COM CHAVE VAPID

Coloquei a chave VAPID enviada no app.js.

IMPORTANTE:
A chave enviada parece curta. Se as notificações não ativarem, copie a chave pública VAPID inteira em Firebase > Configurações do projeto > Cloud Messaging > Certificados push da Web.

Para push funcionar com app fechado:
1. Suba todos os arquivos no GitHub.
2. Abra com ?v=513.
3. Permita notificações no navegador.
4. Implante a pasta functions no Firebase Functions.

Com PWA/GitHub, chamadas com app fechado chegam como notificação. Ao tocar, abre o app na chamada.
