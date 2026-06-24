require("dotenv").config({ path: "./config/.env" });
const express = require("express");
const intakeRouter = require("./webhooks/intake");

const app = express();
app.use(express.json());
app.use("/api", intakeRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`LeadFlow Agent running on port ${PORT}`);
});
