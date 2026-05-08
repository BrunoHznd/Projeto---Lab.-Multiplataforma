# Guia: Firebase Cloud Messaging (FCM) no tiResolve

Este guia configura o **Firebase Cloud Messaging** como provedor de push notifications
via **Expo Push API** (Opção A — sem trocar o código do app).

O Expo Push API é um *relay* que encaminha a notificação para o FCM (Android) e APNs (iOS).
O código atual já envia corretamente via `exp.host/--/api/v2/push/send`. Você só precisa
**autorizar o Expo a usar suas credenciais FCM V1**.

---

## Pré-requisitos

- Conta Google (qualquer uma)
- Conta Expo (EAS CLI)
- Node.js e `npm` instalados
- Package name do app: `br.edu.fatecpg.cisupport` (já em `app.json`)

---

## 1. Criar projeto Firebase

1. Acesse [https://console.firebase.google.com](https://console.firebase.google.com)
2. **Add project** → nome: `tiresolve` (ou o que preferir) → desativar Analytics (opcional) → **Create**
3. No dashboard, clique no ícone do **Android** para adicionar um app Android

### 1.1 Registrar app Android

| Campo | Valor |
|---|---|
| **Android package name** | `br.edu.fatecpg.cisupport` |
| **App nickname** | tiResolve |
| **Debug signing certificate SHA-1** | (opcional) |

Clique em **Register app**.

### 1.2 Baixar `google-services.json`

Na tela seguinte, baixe o arquivo **`google-services.json`**.

Coloque na raiz do projeto mobile:

```
frontend/mobile/google-services.json
```

**IMPORTANTE:** Adicione ao `.gitignore` para não comitar credenciais:

```gitignore
frontend/mobile/google-services.json
```

Pule os passos de SDK (o Expo cuida disso). Clique em **Next → Continue to console**.

---

## 2. Gerar Service Account para FCM V1

O Expo Push API precisa de uma **Service Account** para enviar via FCM HTTP v1.

1. No Firebase Console, clique na engrenagem ⚙️ → **Project settings**
2. Aba **Service accounts**
3. Clique em **Generate new private key** → **Generate key**
4. Salve o JSON em um local seguro (fora do repositório), ex:
   ```
   ~/.config/tiresolve/fcm-service-account.json
   ```

**Nunca comite este arquivo!**

---

## 3. Configurar `app.json` (já feito)

O campo `android.googleServicesFile` já aponta para o arquivo baixado:

```json
"android": {
  "googleServicesFile": "./google-services.json",
  ...
}
```

Se você estiver copiando este guia depois de remover, adicione essa linha.

---

## 4. Upload das credenciais no Expo (EAS)

Instale o EAS CLI (se ainda não tiver):

```bash
npm install -g eas-cli
eas login
```

No diretório `frontend/mobile`:

```bash
cd frontend/mobile
eas credentials
```

Selecione:

1. Platform: **Android**
2. Profile: **production** (ou o que você usa)
3. **Google Service Account** → **Manage your Google Service Account Key for Push Notifications (FCM V1)**
4. **Upload a new service account key** → forneça o caminho do JSON salvo no passo 2

Saída esperada: `Google Service Account Key for FCM V1 assigned successfully`.

---

## 5. Build do app

Builds locais via Expo Go **não** usam FCM próprio (usam o do Expo).
Para testar o FCM de verdade, faça **build standalone** com EAS:

### 5.1 Configurar `eas.json` (se não existir)

Arquivo `frontend/mobile/eas.json`:

```json
{
  "cli": { "version": ">= 3.0.0" },
  "build": {
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "production": {
      "android": { "buildType": "app-bundle" }
    }
  },
  "submit": { "production": {} }
}
```

### 5.2 Gerar APK de teste

```bash
eas build --platform android --profile preview
```

Ao final o EAS fornece um link para baixar o APK. Instale no celular.

---

## 6. Verificação

### 6.1 Token registrado no backend

No app logado, verifique no banco:

```bash
cd backend
sqlite3 tiresolve.db "SELECT id, email, push_token FROM users WHERE push_token IS NOT NULL;"
```

O `push_token` deve começar com `ExponentPushToken[...]`.

### 6.2 Enviar notificação de teste

Use o [Expo Push Tool](https://expo.dev/notifications):

1. Cole o `push_token`
2. Title: `Teste FCM`
3. Body: `Funcionou!`
4. Clique em **Send**

Se o celular receber, o FCM está funcionando via Expo.

### 6.3 Teste real no sistema

No painel web, atualize um chamado atribuindo a um técnico. Ele deve receber push
(o código em `backend/app/services/push_service.py` já dispara automaticamente).

---

## Troubleshooting

### "InvalidCredentials" no Expo
→ A Service Account do passo 2 está incorreta. Gere outra.

### Token retorna vazio no app
→ O usuário negou a permissão de notificações. Verifique em **Configurações → Apps → tiResolve → Notificações**.

### Notificação chega no foreground mas não em background
→ Em Android, verifique que o canal `tiresolve-tickets` tem `importance: HIGH` (já está em `PushNotificationService.js`).

### iOS não recebe
→ iOS exige **APNs Key** (.p8) da Apple Developer. Faça upload separado via `eas credentials → iOS`.

---

## Resumo do que mudou

- **Código:** nada (Expo Push API continua o canal de envio)
- **Novo:** `google-services.json` no mobile + Service Account no Expo
- **Resultado:** notificações em produção (builds standalone) passam a usar **seu** projeto Firebase ao invés do default do Expo

---

## Referências

- [Expo FCM V1 Setup](https://docs.expo.dev/push-notifications/fcm-credentials/)
- [Expo Push API](https://docs.expo.dev/push-notifications/sending-notifications/)
- [Firebase Console](https://console.firebase.google.com)
