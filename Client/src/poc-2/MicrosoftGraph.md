## 🧠 What you are setting up (mental model)

You are enabling your backend to:

* Authenticate users with Microsoft
* Get an **access token**
* Call **Microsoft Graph**
* Send files to **Outlook** and **Teams**

---

# 1️⃣ Azure AD App Registration (Mandatory)

This is where Microsoft trusts your app.

### Steps

1. Go to **Azure Portal**
2. Azure Active Directory → **App registrations**
3. Click **New registration**

### Fill like this

* **Name:** Variant Share App
* **Supported account types:**
  ✔️ Single tenant (recommended for enterprise)
* **Redirect URI:**

  ```
  http://localhost:3000/auth/callback
  ```

### Save:

* **Application (client) ID**
* **Directory (tenant) ID**

---

# 2️⃣ Create Client Secret

1. App → **Certificates & secrets**
2. New client secret
3. Copy **secret value** (only shown once)

📌 Store it securely (env file)

---

# 3️⃣ Configure API Permissions (Very Important)

### Add Microsoft Graph permissions

#### Outlook (Email)

* `Mail.Send`
* `User.Read`

#### Teams

* `Chat.ReadWrite`
* `ChannelMessage.Send`
* `Files.ReadWrite`
* `Team.ReadBasic.All`

⚠️ Choose **Delegated permissions**

### Then:

👉 Click **Grant admin consent**

(No consent = Graph calls fail)

---

# 4️⃣ Backend Project Setup (Node + TS)

### Install dependencies

```bash
npm init -y
npm install express dotenv axios
npm install @azure/msal-node
npm install -D typescript ts-node @types/express
```

---

# 5️⃣ Environment Variables (`.env`)

```env
CLIENT_ID=xxxxxxxx
CLIENT_SECRET=xxxxxxxx
TENANT_ID=xxxxxxxx
REDIRECT_URI=http://localhost:3000/auth/callback
```

---

# 6️⃣ MSAL Configuration (Auth Core)

### `authConfig.ts`

```ts
import { ConfidentialClientApplication } from "@azure/msal-node";

export const msalClient = new ConfidentialClientApplication({
  auth: {
    clientId: process.env.CLIENT_ID!,
    authority: `https://login.microsoftonline.com/${process.env.TENANT_ID}`,
    clientSecret: process.env.CLIENT_SECRET!,
  },
});
```

---

# 7️⃣ Login Route (OAuth start)

```ts
app.get("/auth/login", async (req, res) => {
  const authUrl = await msalClient.getAuthCodeUrl({
    scopes: ["User.Read", "Mail.Send", "Chat.ReadWrite", "Files.ReadWrite"],
    redirectUri: process.env.REDIRECT_URI!,
  });

  res.redirect(authUrl);
});
```

---

# 8️⃣ Callback Route (Get Access Token)

```ts
app.get("/auth/callback", async (req, res) => {
  const tokenResponse = await msalClient.acquireTokenByCode({
    code: req.query.code as string,
    scopes: ["User.Read", "Mail.Send", "Chat.ReadWrite", "Files.ReadWrite"],
    redirectUri: process.env.REDIRECT_URI!,
  });

  // Store token securely (session / DB)
  req.session.accessToken = tokenResponse.accessToken;

  res.send("Login successful");
});
```

---

# 9️⃣ Call Microsoft Graph (Example: Send Outlook Email)

```ts
import axios from "axios";

const sendMail = async (token: string) => {
  await axios.post(
    "https://graph.microsoft.com/v1.0/me/sendMail",
    {
      message: {
        subject: "File shared from Variant",
        body: {
          contentType: "Text",
          content: "Please find the attached file.",
        },
        toRecipients: [
          {
            emailAddress: { address: "user@company.com" },
          },
        ],
      },
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
};
```

---

# 🔟 Teams Message Flow (Conceptual)

Teams requires:

1. Upload file → OneDrive
2. Get shareable link
3. Post message to chat/channel with link

Graph endpoints:

* `/me/drive/root:/file.pdf:/content`
* `/chats/{id}/messages`
* `/teams/{id}/channels/{id}/messages`

(This is normal — Teams never accepts raw file upload directly.)

---

## 🧩 Folder Structure (Recommended)

```
backend/
 ├─ src/
 │  ├─ auth/
 │  │   └─ msal.ts
 │  ├─ graph/
 │  │   ├─ outlook.ts
 │  │   └─ teams.ts
 │  ├─ routes.ts
 │  └─ server.ts
 ├─ .env
 └─ tsconfig.json
```

---

## 🏁 Final Reality Check

✔️ This setup is **exactly how enterprise apps do it**
✔️ Secure, auditable, Microsoft-approved
✔️ Works for Outlook + Teams
❌ Cannot open compose UI (by design)

---
