BATE-PAPO CORRIGIDO

Suba estes arquivos no GitHub dentro do repositório Arquivar-imagem:
- index.html
- style.css
- app.js

Depois abra:
https://dielzinho25.github.io/Arquivar-imagem/?v=300

Correções:
- Removido Service Worker/PWA cache.
- index.html força app.js?v=300.
- Firebase 8 correto.
- Tratamento de erro melhor.
- Mostra no login parte da API key carregada.

Se ainda aparecer API_KEY_INVALID:
copie a Browser key correta em Google Cloud > APIs e serviços > Credenciais > Browser key (auto created by Firebase)
e troque a linha apiKey no app.js.
