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
      res.send({ status: 422, message: "Please provide a prompt." });
      return;
    }

    console.log(prompt);

    const response = await model
      .generateContent(prompt)
      .then((result) => result.response);
    if (response.candidates[0].finishReason !== "STOP") {
      res.send({
        status: 502,
        error:
          "A trava de segurança do Google foi acionada. Tente outra letra.",
        finishReason: response.candidates[0].finishReason,
      });
      return;
    }
    res.send({ status: 200, response });
  } catch (e) {
    res.send({ status: 500, error: e });
  }
});
app.listen(1313, () => console.log("Server ready on port 1313."));

module.exports = app;
