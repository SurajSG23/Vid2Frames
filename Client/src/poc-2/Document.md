## Step 1: Generate + preview (no auto-download)

```ts
const generateDocument = async (type: string = "pdf") => {
  try {
    dispatch({ type: SHOWSCREENBLOCKMSG, payload: "Generating preview..." });

    const response: any = await ProcessService.get(
      variantData.processId,
      {
        generateDocument: true,
        documentType: type,
        repositoryId: variantDataFromReducer.id,
      },
      { responseType: "blob" }
    );

    const blob = new Blob([response.data], { type: "application/pdf" });
    const previewUrl = URL.createObjectURL(blob);

    // store these in state
    setPdfPreviewUrl(previewUrl);
    setPdfBlob(blob);

    dispatch({
      type: CALL_NOTIFY,
      payload: {
        type: "SUCCESS",
        msg: "PDF generated. Preview before sending.",
        timeout: 3000,
      },
    });
  } catch (ex) {
    console.error(ex);
    dispatch({
      type: CALL_NOTIFY,
      payload: {
        type: "ERROR",
        msg: "Unable to generate document",
        timeout: 3000,
      },
    });
  } finally {
    dispatch({ type: SHOWSCREENBLOCKMSG, payload: "" });
  }
};
```

---

## Step 2: Show the PDF in the frontend

### Option A: Inline preview (recommended)

```tsx
{pdfPreviewUrl && (
  <iframe
    src={pdfPreviewUrl}
    width="100%"
    height="600px"
    style={{ border: "none" }}
  />
)}
```

### Option B: Modal preview

Use the same iframe inside your modal component.

---

## Step 3: Download ONLY when user clicks “Send”

```ts
const downloadPdf = () => {
  if (!pdfBlob) return;

  const fileLink = document.createElement("a");
  fileLink.href = URL.createObjectURL(pdfBlob);
  fileLink.download =
    variantDataFromReducer.name
      ? `${variantDataFromReducer.name}.pdf`
      : "process-document.pdf";

  document.body.appendChild(fileLink);
  fileLink.click();
  fileLink.remove();
};
```

Hook this to your **Send** button.

---

## Step 4: Cleanup (important!)

When the user closes the preview or navigates away:

```ts
useEffect(() => {
  return () => {
    if (pdfPreviewUrl) {
      URL.revokeObjectURL(pdfPreviewUrl);
    }
  };
}, [pdfPreviewUrl]);
```

---

## UX flow you now have 💡

1. User clicks **Generate**
2. PDF is generated server-side
3. PDF **renders in frontend**
4. User reviews it
5. User clicks **Send**
6. PDF downloads (or uploads / emails / whatever “Send” means)

---

## Small improvement you should make

This line in your original code:

```ts
variantDataFromReducer.name + ".pdf" || "process-document.pdf";
```

Will **never** hit the fallback. Safer:

```ts
const fileName = variantDataFromReducer?.name
  ? `${variantDataFromReducer.name}.pdf`
  : "process-document.pdf";
```

---

# ✅ Recommended Architecture (what actually works)

**Frontend**

* Generate & preview PDF (you already have this)
* Send the PDF `Blob` to backend when user clicks **Send**

**Backend**

* Use **Microsoft Graph API**
* Send email via Outlook with PDF attached

---

# STEP 1: Frontend — Send PDF Blob to Backend

### 1️⃣ Add a “Send via Outlook” button

```tsx
<button onClick={sendPdfToOutlook}>
  Send via Outlook
</button>
```

---

### 2️⃣ Frontend function to send PDF to backend

```ts
const sendPdfToOutlook = async () => {
  if (!pdfBlob) return;

  const formData = new FormData();
  formData.append("file", pdfBlob, "process-document.pdf");
  formData.append("to", "recipient@company.com");
  formData.append("subject", "Process Document");
  formData.append("body", "Please find the attached document.");

  try {
    dispatch({ type: SHOWSCREENBLOCKMSG, payload: "Sending email..." });

    await fetch("/api/send-outlook-mail", {
      method: "POST",
      body: formData,
    });

    dispatch({
      type: CALL_NOTIFY,
      payload: {
        type: "SUCCESS",
        msg: "Email sent successfully!",
        timeout: 3000,
      },
    });
  } catch (err) {
    dispatch({
      type: CALL_NOTIFY,
      payload: {
        type: "ERROR",
        msg: "Failed to send email",
        timeout: 3000,
      },
    });
  } finally {
    dispatch({ type: SHOWSCREENBLOCKMSG, payload: "" });
  }
};
```

✅ At this point, frontend is DONE.

---

# STEP 2: Backend — Microsoft Graph Setup (one-time)

### 1️⃣ Azure App Registration

* Azure Portal → App Registrations → New App
* Add permissions:

  * `Mail.Send`
* Grant **Admin Consent**
* Generate:

  * `CLIENT_ID`
  * `CLIENT_SECRET`
  * `TENANT_ID`

---

# STEP 3: Backend — Send Email with Attachment (Node.js)

### Install dependencies

```bash
npm install @microsoft/microsoft-graph-client axios multer
```

---

### 1️⃣ Outlook auth helper

```ts
import axios from "axios";

export const getAccessToken = async () => {
  const res = await axios.post(
    `https://login.microsoftonline.com/${process.env.TENANT_ID}/oauth2/v2.0/token`,
    new URLSearchParams({
      client_id: process.env.CLIENT_ID!,
      client_secret: process.env.CLIENT_SECRET!,
      grant_type: "client_credentials",
      scope: "https://graph.microsoft.com/.default",
    })
  );

  return res.data.access_token;
};
```

---

### 2️⃣ API endpoint to send email

```ts
import express from "express";
import multer from "multer";
import { getAccessToken } from "./auth";
import { Client } from "@microsoft/microsoft-graph-client";

const router = express.Router();
const upload = multer();

router.post(
  "/send-outlook-mail",
  upload.single("file"),
  async (req, res) => {
    try {
      const token = await getAccessToken();

      const client = Client.init({
        authProvider: (done) => done(null, token),
      });

      const file = req.file!;
      const { to, subject, body } = req.body;

      await client.api("/users/{sender@company.com}/sendMail").post({
        message: {
          subject,
          body: {
            contentType: "Text",
            content: body,
          },
          toRecipients: [
            {
              emailAddress: { address: to },
            },
          ],
          attachments: [
            {
              "@odata.type": "#microsoft.graph.fileAttachment",
              name: file.originalname,
              contentBytes: file.buffer.toString("base64"),
            },
          ],
        },
      });

      res.status(200).send("Mail sent");
    } catch (err) {
      console.error(err);
      res.status(500).send("Failed to send mail");
    }
  }
);

export default router;
```

---

# STEP 4: User Flow (what you’ll demo)

1. User clicks **Generate**
2. PDF shows in frontend preview
3. User reviews document
4. User clicks **Send via Outlook**
5. Email is sent **with attachment**
6. No forced download 🎯

---
## 1️⃣ React Component (UI + logic hooks)

### `DocumentPreview.tsx`

```tsx
import React from "react";
import "./DocumentPreview.scss";

interface Props {
  pdfPreviewUrl?: string | null;
  isLoading?: boolean;
  onGenerate: () => void;
  onSend: () => void;
}

const DocumentPreview: React.FC<Props> = ({
  pdfPreviewUrl,
  isLoading,
  onGenerate,
  onSend,
}) => {
  return (
    <div className="document-preview">
      <header className="document-preview__header">
        <h2>Process Document</h2>

        <div className="document-preview__actions">
          <button
            className="btn btn--secondary"
            onClick={onGenerate}
            disabled={isLoading}
          >
            Generate
          </button>

          <button
            className="btn btn--primary"
            onClick={onSend}
            disabled={!pdfPreviewUrl || isLoading}
          >
            Send via Outlook
          </button>
        </div>
      </header>

      <div className="document-preview__content">
        {!pdfPreviewUrl && (
          <div className="document-preview__placeholder">
            <p>Generate the document to preview it here.</p>
          </div>
        )}

        {pdfPreviewUrl && (
          <iframe
            title="PDF Preview"
            src={pdfPreviewUrl}
            className="document-preview__iframe"
          />
        )}
      </div>
    </div>
  );
};

export default DocumentPreview;
```

---

## 2️⃣ SCSS Styling (Clean + Scalable)

### `DocumentPreview.scss`

```scss
.document-preview {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #f8f9fb;
  border-radius: 8px;
  overflow: hidden;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    background: #ffffff;
    border-bottom: 1px solid #e5e7eb;

    h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #1f2937;
    }
  }

  &__actions {
    display: flex;
    gap: 12px;
  }

  &__content {
    flex: 1;
    padding: 16px;
    background: #f8f9fb;
  }

  &__placeholder {
    height: 100%;
    border: 2px dashed #cbd5e1;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #64748b;
    font-size: 14px;
    background: #ffffff;
  }

  &__iframe {
    width: 100%;
    height: 100%;
    border: none;
    background: #ffffff;
    border-radius: 6px;
    box-shadow: 0 0 0 1px #e5e7eb;
  }
}

/* Shared button styles */
.btn {
  padding: 8px 16px;
  font-size: 14px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s ease, opacity 0.2s ease;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &--primary {
    background-color: #2563eb;
    color: #ffffff;

    &:hover:not(:disabled) {
      background-color: #1d4ed8;
    }
  }

  &--secondary {
    background-color: #e5e7eb;
    color: #1f2937;

    &:hover:not(:disabled) {
      background-color: #d1d5db;
    }
  }
}
```

---

## 3️⃣ How to Use This Component

### Parent container example

```tsx
<DocumentPreview
  pdfPreviewUrl={pdfPreviewUrl}
  isLoading={isLoading}
  onGenerate={generateDocument}
  onSend={sendPdfToOutlook}
/>
```

---
