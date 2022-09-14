const express = require("express");
const app = express();
require("dotenv").config();
require("./db");
const userRouter = require("./routes/user");

const PORT = process.env.PORT || 8000;

app.use(express.json());
app.use("/api/user", userRouter);

app.listen(PORT, () => {
  console.log(`app is running on ${PORT}`);
});
