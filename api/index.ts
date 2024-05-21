require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const express = require("express");
const app = express();

// Access your API key as an environment variable (see "Set up your API key" above)
const genAI = new GoogleGenerativeAI(process.env.API_KEY);
// For text-only input, use the gemini-pro model
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

app.use(express.static("public"));

app.get("/", async function (req, res) {
  try {
    // Take the parameters from the request
    const { prompt } = req.query;

    if (!prompt) {
      // throw new Error("Please provide a prompt.");
      res.send("Please provide a prompt.");
      return;
    }

    console.log(prompt);

    const text = await model
      .generateContent(prompt)
      .then((result) => result.response.text());
    res.send(text);
  } catch (e) {
    res.send(e);
  }
});
app.listen(1313, () => console.log("Server ready on port 1313."));

module.exports = app;
