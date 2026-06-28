# Bate-papo Web App tipo WhatsApp

Projeto completo em Web/PWA com:

- Login e cadastro
- Lista de conversas
- Buscar contato por email
- Chat em tempo real
- Envio de texto
- Envio de imagem
- Envio de áudio
- Status de texto e imagem
- Online/offline
- Perfil com nome, foto e recado
- PWA instalável
- Pronto para WebView no Sketchware Pro

## Como configurar

1. Crie um projeto no Firebase.
2. Ative Authentication com Email/Senha.
3. Ative Realtime Database.
4. Ative Storage.
5. Copie as configurações do Firebase Web.
6. Cole dentro do arquivo `app.js`, no lugar de:

apiKey: "COLE_AQUI"

## Regras do Realtime Database

Cole estas regras:

{
  "rules": {
    "usuarios": {
      ".read": "auth != null",
      "$uid": {
        ".write": "auth != null && auth.uid == $uid"
      }
    },
    "mensagens": {
      "$chatId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    },
    "conversas": {
      "$uid": {
        ".read": "auth != null && auth.uid == $uid",
        ".write": "auth != null"
      }
    },
    "status": {
      ".read": "auth != null",
      "$uid": {
        ".write": "auth != null && auth.uid == $uid"
      }
    }
  }
}

## Regras do Storage

rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}

## Como virar app Android no Sketchware Pro

1. Crie um projeto novo.
2. Coloque um WebView na tela principal.
3. ID: webview1.
4. Ative JavaScript.
5. Hospede esse projeto na web ou Firebase Hosting.
6. No Sketchware, use:

webview1.getSettings().setJavaScriptEnabled(true);
webview1.getSettings().setDomStorageEnabled(true);
webview1.getSettings().setMediaPlaybackRequiresUserGesture(false);
webview1.loadUrl("https://SEU-LINK-AQUI.com");

## Permissões Android

Coloque no Manifest:

<uses-permission android:name="android.permission.INTERNET"/>
<uses-permission android:name="android.permission.RECORD_AUDIO"/>
<uses-permission android:name="android.permission.CAMERA"/>
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"/>
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"/>

