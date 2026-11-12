const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;
const AUTH_TOKEN = process.env.AUTH_TOKEN || "secret-token";

app.use((req, res, next) => {
  const startedAt = Date.now();

  res.on("finish", () => {
    const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, "");
    const duration = Date.now() - startedAt;
    console.log(
      `[${timestamp}] ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`
    );
  });

  next();
});

app.use(express.json());

function authorize(req, res, next) {
  const authorization = req.get("Authorization");
  const expectedAuthorization = `Bearer ${AUTH_TOKEN}`;

  if (authorization !== expectedAuthorization) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  next();
}

function validateUser(req, res, next) {
  const { name, age, email } = req.body || {};
  const errors = [];

  if (typeof name !== "string" || name.trim().length < 2) {
    errors.push("name must be a string with at least 2 characters");
  }

  if (typeof age !== "number" || !Number.isFinite(age) || age < 0 || age > 120) {
    errors.push("age must be a number between 0 and 120");
  }

  if (
    typeof email !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    errors.push("email must be a valid email address");
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: "Invalid request body", details: errors });
  }

  next();
}

app.get("/api/data", authorize, (req, res) => {
  res.json({ data: "Protected data" });
});

app.post("/api/users", authorize, validateUser, (req, res) => {
  res.status(201).json({
    message: "User created",
    user: {
      name: req.body.name.trim(),
      age: req.body.age,
      email: req.body.email,
    },
  });
});

app.get("/public/info", (req, res) => {
  res.json({ info: "This endpoint is public" });
});

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
