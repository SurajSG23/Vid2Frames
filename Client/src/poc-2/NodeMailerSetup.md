## 1️⃣ High-level flow (what actually happens)

**Frontend**

- Collect:
  - `to[]`
  - `cc[]`
  - `subject`
  - `body`
  - `file`

- Send all of this to backend as **multipart/form-data**

**Backend**

- Receive data + file
- Configure **Nodemailer with Outlook SMTP**
- Attach file
- Send mail → Outlook delivers it

📌 Important:

> Outlook is NOT opened on the client.
> The mail is sent _from backend_ using Outlook SMTP.

---

## 2️⃣ Frontend (React + TypeScript)

### 📦 Install helper

```bash
npm install axios
```

### 🧩 React form submit example

```ts
import axios from "axios";

const sendMail = async () => {
  const formData = new FormData();

  formData.append("to", "user1@outlook.com,user2@gmail.com");
  formData.append("cc", "manager@outlook.com");
  formData.append("subject", "Project Documents");
  formData.append("body", "Please find the attached document.");
  formData.append("file", selectedFile); // File object

  await axios.post("http://localhost:5000/send-mail", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};
```

📌 Notes:

- `selectedFile` comes from `<input type="file" />`
- Multiple file types supported automatically

---

## 3️⃣ Backend setup (Node + TypeScript)

### 📦 Install dependencies

```bash
npm install nodemailer multer
npm install -D @types/nodemailer @types/multer
```

---

## 4️⃣ File upload handling (Multer)

### 📁 `middleware/upload.ts`

```ts
import multer from "multer";

export const upload = multer({
  storage: multer.memoryStorage(), // keeps file in memory
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});
```

---

## 5️⃣ Nodemailer configuration (Outlook SMTP)

### 📁 `utils/mailer.ts`

```ts
import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  host: "smtp.office365.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.OUTLOOK_EMAIL,
    pass: process.env.OUTLOOK_PASSWORD,
  },
});
```

📌 Use **App Password** if MFA is enabled.

---

## 6️⃣ API route (sending mail with attachment)

### 📁 `routes/mail.ts`

```ts
import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";

import { upload } from "./middleware/upload";
import { transporter } from "./utils/mailer";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

/* -------------------- MIDDLEWARE -------------------- */

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* -------------------- ROUTES -------------------- */

app.post(
  "/send-mail",
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      const { to, cc, subject, body } = req.body;

      if (!to || !subject) {
        return res.status(400).json({
          error: "Recipient and subject are required",
        });
      }

      const mailOptions = {
        from: process.env.OUTLOOK_EMAIL,
        to: to.split(","), // multiple recipients
        cc: cc ? cc.split(",") : undefined,
        subject,
        text: body,
        attachments: req.file
          ? [
              {
                filename: req.file.originalname,
                content: req.file.buffer,
                contentType: req.file.mimetype,
              },
            ]
          : [],
      };

      await transporter.sendMail(mailOptions);

      res.status(200).json({
        message: "Mail sent successfully",
      });
    } catch (error) {
      console.error("Mail send error:", error);
      res.status(500).json({
        error: "Failed to send mail",
      });
    }
  },
);

/* -------------------- HEALTH CHECK -------------------- */

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "OK" });
});

/* -------------------- SERVER START -------------------- */

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
```

---

## 7️⃣ Supported file types (automatic)

No extra config needed for:

- ✅ PDF
- ✅ PPT / PPTX
- ✅ DOC / DOCX
- ✅ Images

Multer + Nodemailer handle MIME types automatically.

---

## 8️⃣ Environment variables (.env)

```env
OUTLOOK_EMAIL=yourmail@outlook.com
OUTLOOK_PASSWORD=your_app_password
```

---

## 9️⃣ Very important clarifications (common confusion)

### ❌ This does NOT open Outlook UI

- Outlook UI cannot be opened from backend
- This **sends mail via Outlook servers**

### ✅ Email WILL appear in:

- Sent Items of that Outlook account
- Recipient inboxes (Gmail, Outlook, etc.)

---

Code:

```ts
const [selectedFile, setSelectedFile] = useState<File | null>(null);
```

```ts
const generateWord = async () => {
  try {
    dispatch({ type: SHOWSCREENBLOCKMSG, payload: "Loading..." });

    // 🔥 Always fully await document creation
    const doc = await VariantWordDoc([
      variantDataFromReducer,
      variantData,
      hashedTargetValue,
      dataElastic,
    ]);

    if (!doc) {
      throw new Error("Document generation failed");
    }

    // 🔥 Properly generate buffer
    const buffer = await Packer.toBuffer(doc);

    // 🔥 Convert to Blob
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    // 🔥 Convert to File (for email)
    const wordFile = new File([blob], `${variantDataFromReducer.name}.docx`, {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    // 🔥 Store for attachment
    setSelectedFile(wordFile);

    // OPTIONAL — enable download if needed
    // const url = window.URL.createObjectURL(blob);
    // const link = document.createElement("a");
    // link.href = url;
    // link.download = `${variantDataFromReducer.name}.docx`;
    // document.body.appendChild(link);
    // link.click();
    // window.URL.revokeObjectURL(url);

    dispatch({
      type: CALL_NOTIFY,
      payload: {
        type: "SUCCESS",
        msg: "Word document generated successfully!",
        timeout: 3000,
      },
    });

    dispatch({ type: SHOWSCREENBLOCKMSG, payload: "" });
  } catch (error: any) {
    console.error("Word generation error:", error);

    dispatch({
      type: CALL_NOTIFY,
      payload: {
        type: "ERROR",
        msg: "Unable to generate Word document",
        timeout: 3000,
      },
    });

    dispatch({ type: SHOWSCREENBLOCKMSG, payload: "" });
  }
};
```

```ts
const generateSharePPT = async () => {
  try {
    const pptx = new PptxGenJS();

    let options: any = {
      day: "2-digit",
      month: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      weekday: "long",
      hour12: true,
      timeZone: "Asia/Kolkata",
    };

    const date_created = new Date(variantData.count.created_on);
    const date_last_run_on = new Date(variantData.count.last_run_on);
    let formatter = new Intl.DateTimeFormat([], options);

    const processDataOfVariant: any = await ProcessService.get(
      variantData.processId,
    );

    const data = {
      processDetails: {
        name: processDataOfVariant.data.data.name,
        description: processDataOfVariant.data.data.description,
      },
      variantDetails: {
        name: variantDataFromReducer.name,
        createdOn: formatting_datetime(formatter.format(date_created)),
        lastRunOn: formatting_datetime(formatter.format(date_last_run_on)),
        maxTime: epochToHHMMSS(variantData.count.max_time),
        minTime: epochToHHMMSS(variantData.count.min_time),
        avgTime: epochToHHMMSS(variantData.count.avg_time),
        noOfRuns: epochSingleToDouble(variantData.count.no_of_runs),
        appsInvolved: variantData.apps,
        coverage: variantData.coverage,
        steps: variantData.stepData,
        exported_by: "Process Analyst",
      },
    };

    const elasticData = dataElastic.current;
    const stepScreenshots: any = [];

    elasticData.data.elasticsearchFieldsData.forEach((item: any) => {
      stepScreenshots.push(item._source.screenshot);
    });

    /* --------------------------------------------------
       ALL YOUR EXISTING SLIDE CREATION CODE STAYS SAME
       (Title Slide, Summary Slide, Step Details, etc.)
       -------------------------------------------------- */

    // ⚠️ Your entire existing slide generation logic goes here
    // (I am not rewriting it to keep it clean and unchanged)

    /* --------------------------------------------------
       🔥 IMPORTANT CHANGE STARTS HERE
       -------------------------------------------------- */

    // Generate PPT as Blob instead of downloading
    const pptBlob = await pptx.write("blob");

    // Convert Blob to File
    const file = new File(
      [pptBlob],
      `${variantDataFromReducer.name}.pptx`,
      {
        type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      }
    );

    // Store in state
    setSelectedFile(file);

    // Optional: return file if you want to use immediately
    return file;

  } catch (err: any) {
    console.log(err);

    dispatch({
      type: CALL_NOTIFY,
      payload: {
        type: "ERROR",
        msg: "Unable to generate PPT! Please check your internet",
        timeout: 3000,
      },
    });

    dispatch({ type: SHOWSCREENBLOCKMSG, payload: "" });
  }
};

```
```ts
const generateExcel = async () => {
  try {
    dispatch({ type: SHOWSCREENBLOCKMSG, payload: "Loading..." });

    const parsedData =
      variantViewerSource === "processes"
        ? variantDataFromReducer
        : JSON.parse(variantDataFromReducer.data);

    const elasticData = dataElastic.current;
    const timeStampMap: any = {};

    elasticData.data.elasticsearchFieldsData.forEach((item: any) => {
      timeStampMap[item._source.timestamp] = {
        description: item._source.description,
        screenshot: item._source.screenshot,
      };
    });

    const processDataOfVariant: any = await ProcessService.get(
      variantData.processId,
    );

    const workbook = new Excel.Workbook();

    /* ============================================================
       1️⃣ METADATA SHEET
    ============================================================ */

    const metaSheet = workbook.addWorksheet("Variant Metadata");

    const epochToHHMMSS = (timems: number): string => {
      const sec = Math.floor(timems / 1000);
      const h = String(Math.floor(sec / 3600)).padStart(2, "0");
      const m = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
      const s = String(sec % 60).padStart(2, "0");
      return `${h}:${m}:${s}`;
    };

    const singleToDouble = (runs: number): string =>
      String(runs).padStart(2, "0");

    const apptypes: string[] = [];

    Object.entries(parsedData.stepData).forEach(([_, nodeData]: any) => {
      const app1 =
        hashedTargetValue.current[nodeData.screenshot]?._source?.appType;
      const app2 =
        hashedTargetValue.current[nodeData.screenshot]?._source?.apptype;

      if (app1 && !apptypes.includes(app1)) apptypes.push(app1);
      if (app2 && !apptypes.includes(app2)) apptypes.push(app2);
    });

    const arrData = [
      ["Process name", processDataOfVariant.data.data.name],
      ["Process description", processDataOfVariant.data.data.description],
      ["Variant Name", variantDataFromReducer.name],
      ["Apps involved", apptypes.join()],
      [
        "Variant Created On",
        new Date(parsedData.count.created_on).toString().slice(0, -34),
      ],
      ["Variant Max time", epochToHHMMSS(parsedData.count.max_time)],
      ["Variant Average Time", epochToHHMMSS(parsedData.count.avg_time)],
      ["Variant Coverage", parsedData.count.coverage],
      [
        "Variant Last run on",
        new Date(parsedData.count.last_run_on).toString().slice(0, -34),
      ],
      ["Variant Number of runs", singleToDouble(parsedData.count.no_of_runs)],
      ["Variant Min time", epochToHHMMSS(parsedData.count.min_time)],
    ];

    arrData.forEach((row, index) => {
      metaSheet.addRow(row);
      metaSheet.getCell(`A${index + 1}`).font = { bold: true };
    });

    metaSheet.columns = [{ width: 40 }, { width: 50 }];

    /* ============================================================
       2️⃣ STEPS SHEET
    ============================================================ */

    const stepSheet = workbook.addWorksheet("Steps", {
      views: [{ state: "frozen", ySplit: 1 }],
    });

    if (variantDataFromReducer.type === "variant") {
      stepSheet.columns = [
        { header: "Step no", width: 10 },
        { header: "Description", width: 30 },
        { header: "Image", width: 65 },
        { header: "Xpath", width: 30 },
        { header: "Timestamp", width: 50 },
        { header: "URL", width: 50 },
      ];
    } else {
      stepSheet.columns = [
        { header: "Step no", width: 10 },
        { header: "Detailed description", width: 30 },
        { header: "Translated description", width: 30 },
        { header: "Image", width: 65 },
        { header: "Xpath", width: 30 },
        { header: "Timestamp", width: 50 },
        { header: "URL", width: 50 },
      ];
    }

    stepSheet.getRow(1).font = { bold: true };

    Object.entries(parsedData.stepData).forEach(
      ([_, nodeData]: any, idx: number) => {
        const rawUrl = parsedData.nodes[nodeData.screenshot]?.url;
        const parsedUrl =
          typeof rawUrl === "string" ? JSON.parse(rawUrl) : rawUrl;

        const url =
          parsedUrl?.[0] &&
          !["SAP", "EXCEL", "OUTLOOK"].includes(
            parsedData.nodes[nodeData.screenshot]?.apptype,
          )
            ? parsedUrl[0]
            : "";

        if (variantDataFromReducer.type === "variant") {
          stepSheet.addRow([
            singleToDouble(idx + 1),
            nodeData["description"],
            "",
            parsedData.nodes[nodeData.screenshot].apptype === "SAP"
              ? parsedData.nodes[nodeData.screenshot].xpath
              : "",
            new Date(
              parsedData.nodes[nodeData.screenshot].timestamp,
            ).toString(),
            url,
          ]);
        } else {
          stepSheet.addRow([
            singleToDouble(idx + 1),
            nodeData["description"],
            nodeData["translatedDescription"],
            "",
            parsedData.nodes[nodeData.screenshot].apptype === "SAP"
              ? parsedData.nodes[nodeData.screenshot].xpath
              : "",
            new Date(
              parsedData.nodes[nodeData.screenshot].timestamp,
            ).toString(),
            url,
          ]);
        }

        const imageId = workbook.addImage({
          base64: timeStampMap[nodeData.timestamp].screenshot,
          extension: "png",
        });

        stepSheet.getRow(idx + 2).height = 200;

        stepSheet.addImage(imageId, {
          tl: {
            col: variantDataFromReducer.type === "variant" ? 2.2 : 3.2,
            row: idx + 1.04,
          },
          ext: { width: 450, height: 250 },
        });
      },
    );

    /* ============================================================
       3️⃣ FINALIZE FILE (NO DOWNLOAD)
    ============================================================ */

    const buffer = await workbook.xlsx.writeBuffer();

    const excelFile = new File(
      [buffer],
      `${variantDataFromReducer.name}.xlsx`,
      {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    );

    setSelectedFile(excelFile);

    dispatch({
      type: CALL_NOTIFY,
      payload: {
        type: "SUCCESS",
        msg: "Excel generated and ready for email!",
        timeout: 3000,
      },
    });

    dispatch({ type: SHOWSCREENBLOCKMSG, payload: "" });
  } catch (ex: any) {
    console.error(ex);
    dispatch({
      type: CALL_NOTIFY,
      payload: {
        type: "ERROR",
        msg: "Excel generation failed",
        timeout: 3000,
      },
    });
    dispatch({ type: SHOWSCREENBLOCKMSG, payload: "" });
  }
};
```

```ts
const generateDocument = async (type: string = "pdf") => {
  try {
    dispatch({ type: SHOWSCREENBLOCKMSG, payload: "Loading..." });

    const response: any = await ProcessService.get(
      variantData.processId,
      {
        generateDocument: true,
        documentType: type,
        repositoryId: variantDataFromReducer.id,
      },
      { responseType: "blob" },
    );

    // Backend already returns a Blob
    const pdfBlob = response.data;

    // Convert Blob → File (NO DOWNLOAD)
    const pdfFile = new File([pdfBlob], `${variantDataFromReducer.name}.pdf`, {
      type: "application/pdf",
    });

    // Store for email attachment
    setSelectedFile(pdfFile);

    dispatch({
      type: CALL_NOTIFY,
      payload: {
        type: "SUCCESS",
        msg: "PDF generated and ready to send via email!",
        timeout: 3000,
      },
    });

    dispatch({ type: SHOWSCREENBLOCKMSG, payload: "" });
  } catch (ex: any) {
    console.error(ex);
    dispatch({
      type: CALL_NOTIFY,
      payload: {
        type: "ERROR",
        msg: "Unable to generate PDF",
        timeout: 3000,
      },
    });
    dispatch({ type: SHOWSCREENBLOCKMSG, payload: "" });
  }
};
```

```jsx

 const addSubject = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && subjectInput.trim()) {
      e.preventDefault();
      setSubjects([...subjects, subjectInput.trim()]);
      setSubjectInput("");
    }
  };

  const removeSubject = (index: number) => {
    setSubjects(subjects.filter((_, i) => i !== index));
  };

<div className="pl-12 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 focus-within:border-purple-500/50 focus-within:bg-white/10 transition-all duration-300">
  {subjects.length > 0 && (
    <div className="flex flex-wrap gap-2 mb-2">
      {subjects.map((subj, index) => (
        <span
          key={index}
          className="flex items-center gap-2 px-3 py-1 text-sm bg-purple-600/30 rounded-full text-white"
        >
          {subj}
          <button
            type="button"
            onClick={() => removeSubject(index)}
            className="text-white/60 hover:text-white cursor-pointer hover:scale-120 duration-110"
          >
            ×
          </button>
        </span>
      ))}
    </div>
  )}

  <input
    type="text"
    placeholder="Type subject you handle and press Enter"
    value={subjectInput}
    onChange={(e) => setSubjectInput(e.target.value)}
    onKeyDown={addSubject}
    className="w-full bg-transparent outline-none text-white placeholder:text-white/40"
  />
</div>
```
