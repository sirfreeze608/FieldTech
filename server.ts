import express from "express";
import { createServer as createViteServer } from "vite";
import { Resend } from "resend";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize Resend lazily
  let resend: Resend | null = null;
  const getResend = () => {
    if (!resend) {
      const apiKey = process.env.RESEND_API_KEY;
      if (!apiKey) {
        throw new Error("RESEND_API_KEY environment variable is required");
      }
      resend = new Resend(apiKey);
    }
    return resend;
  };

  // API Routes
  app.post("/api/send-invite", async (req, res) => {
    const { email, role, orgCode, inviterName } = req.body;

    try {
      const mailer = getResend();
      const { data, error } = await mailer.emails.send({
        from: "Field Tech <onboarding@resend.dev>",
        to: [email],
        subject: `Invitation to join ${orgCode} on Field Tech`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #171717;">
            <h1 style="font-size: 24px; font-weight: bold;">You're Invited!</h1>
            <p>${inviterName} has invited you to join their organization <strong>${orgCode}</strong> as a <strong>${role}</strong>.</p>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; font-size: 14px; color: #737373;">Organization Code:</p>
              <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; letter-spacing: 2px;">${orgCode}</p>
            </div>
            <p>To get started, log in to Field Tech and enter the code above when prompted.</p>
            <hr style="border: 0; border-top: 1px solid #e5e5e5; margin: 20px 0;" />
            <p style="font-size: 12px; color: #a3a3a3;">This is an automated invitation from Field Tech.</p>
          </div>
        `,
      });

      if (error) {
        console.error("Resend Error:", error);
        // If it's a validation error, provide a friendlier message
        if (error.name === "validation_error") {
          return res.status(400).json({ 
            error: "Resend validation error. Note: In development mode (free tier), you can only send invites to your Resend account email unless a domain is verified." 
          });
        }
        return res.status(400).json({ error: error.message || error });
      }

      res.json({ success: true, data });
    } catch (error: any) {
      console.error("Server Error:", error.message);
      res.status(500).json({ error: error.message || "Failed to send email" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
