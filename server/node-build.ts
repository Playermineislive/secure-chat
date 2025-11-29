import path from "path";
import express from "express";
import { createServer } from "./index";

const app = createServer();
const port = process.env.PORT || 3000;

const __dirname = import.meta.dirname;

// FIX: dist folder, not dist/spa
const distPath = path.resolve(__dirname, "..");

// Serve static files
app.use(express.static(distPath));

// React Router fallback
app.get("*", (req, res) => {
  if (req.path.startsWith("/api") || req.path.startsWith("/health")) {
    return res.status(404).json({ error: "API endpoint not found" });
  }

  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
