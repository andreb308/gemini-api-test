require("dotenv").config();
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");
const express = require("express");
const app = express();

const genAI = new GoogleGenerativeAI(process.env.API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash", safetySettings: [
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
  ]
});

app.use(express.static("public"));

app.get("/", async function (req, res) {
  
  const { title, artist, lyric } = req.query;
  console.log(req.query)

  if (!title || !artist || !lyric) {
    // throw new Error("Please provide a prompt.");
    res.send({ status: 422, message: "Please provide the correct information (Must have: Title, Artist AND Lyric)." });
    return;
  }

  const prompt = `System: You are a music connoisseur. You receive a random song, its artist and a lyric from it, search your database and the internet, and respond with one single paragraph that explains the given song. It should always start mentioning the song, the album, EP or Single it belongs to (which you will correctly research and only omit if the information is not found), and the year the project came out. Every word you say must be fact-checked. It is crucial for the safety of the end user that you must not hallucinate or create information that is not true. Here are some examples:
  
  User: { title: "You Belong With Me", artist: "Taylor Swift", lyric: "She wears short skirts, I wear t-shirts" }
  
  System: "“You Belong with Me”, from Taylor's second studio album "Fearless" (2008), tells the story of a boy who is too wrapped up in a toxic relationship to see how much another girl likes him. The lyric "She wears short skirts, I wear t-shirts" highlights how different the girlfriend is from Taylor, which emphasizes the song's meaning of how different things would be if he were dating her instead."

  User: { title: "Shake It Off", artist: "Taylor Swift", lyric: "I shake it off (You've got to!)" }

  System: "Shake It Off", showcased on Taylor Swift's fifth studio album "1989" (2014), deals with ignoring enemies and living a carefree life. The lyric "I shake it off (You've got to!)" is from the final post-chorus of the song, which symbolizes a call to indifference and resilience in the face of criticism. The accompanying line "I shake it off, I shake it off" emphasizes the speaker's determination to remain unaffected by others' opinions and move on from negativity.

  User: { title: "Savage", artist: "Megan Thee Stallion", lyric: "Talk big shit, but my bank account match it" }

  System: "'Savage' is a song by American rapper Megan Thee Stallion, featured on her debut studio album *Good News* (2020). The song is known for its braggadocio, with the lyric 'Talk big shit, but my bank account match it' highlighting the theme of confidence and self-assuredness. The lyrics express the idea of not only talking the talk but also walking the walk, emphasizing the importance of backing up one's words with actions. The song gained immense popularity due to its catchy beat and empowering message."

  User: ${JSON.stringify({ title, artist, lyric })}`

  try {

    const response = await model
      .generateContent(prompt)
      .then((result) => result.response);

    if (response.candidates[0].finishReason !== "STOP") {
      res.status(502).send({
        status: 502,
        error:
          "A trava de segurança do Google foi acionada. Tente outra letra.",
        finishReason: response.candidates[0].finishReason,
      });
      return;
    }
    // If everything goes right with the request:
    res.status(200).send({ status: 200, response });

  } catch (e) {
    res.status(500).send({ status: 500, error: e });
  }
});
app.listen(1313, () => console.log("Server ready on port 1313."));

module.exports = app;
