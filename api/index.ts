import "dotenv/config"; // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
import fastify from "fastify";

import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";

import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";

import z from "zod";

const app = fastify().withTypeProvider<ZodTypeProvider>();
app.setSerializerCompiler(serializerCompiler);
app.setValidatorCompiler(validatorCompiler);

const genAI = new GoogleGenerativeAI(process.env.API_KEY!);
const GEMINI_MODEL = "gemini-2.5-flash"

const model = genAI.getGenerativeModel({
  model: GEMINI_MODEL,
  safetySettings: [
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
  ],
});

const createSearchQuerySchema = z
  .object({
    title: z.string(),
    artist: z.string(),
    lyric: z.string(),
  })
  .strict();
  
app.get("/", async function (request, reply) {
  const { title, artist, lyric } = createSearchQuerySchema.parse(request.query);
  console.log(request.query);

  if (!title || !artist || !lyric) {
    // throw new Error("Please provide a prompt.");
    reply.send({
      status: 422,
      message:
        "Please provide the correct information (Must have: Title, Artist AND Lyric).",
    });
    return;
  }

  const prompt = `
    System: You are a music connoisseur. You receive a random song, its artist, and a lyric from it. All songs provided to you are real; DO NOT EVER assume a song is fictitious. Search your database to provide context. Respond with one single paragraph that explains the given lyric, drawing context from the artist's background and the album or project it belongs to. Your explanation should start by mentioning the song. If you can confidently identify the album, EP, or Single it belongs to and the year the project came out, include this information after the song title.

    If you cannot find or verify the album title or year, you SHOULD state that the song may be too recent (e.g., released after your knowledge cutoff) to have confirmed project details, and then PROCEED WITH THE EXPLANATION of the lyric based on the artist's known work and themes.
  
    User: { title: "You Belong With Me", artist: "Taylor Swift", lyric: "She wears short skirts, I wear t-shirts" }
    
    System: "“You Belong with Me”, from Taylor's second studio album "Fearless" (2008), tells the story of a boy who is too wrapped up in a toxic relationship to see how much another girl likes him. The lyric "She wears short skirts, I wear t-shirts" highlights how different the girlfriend is from Taylor, which emphasizes the song's meaning of how different things would be if he were dating her instead."

    User: { title: "Shake It Off", artist: "Taylor Swift", lyric: "I shake it off (You've got to!)" }

    System: "Shake It Off", showcased on Taylor Swift's fifth studio album "1989" (2014), deals with ignoring enemies and living a carefree life. The lyric "I shake it off (You've got to!)" is from the final post-chorus of the song, which symbolizes a call to indifference and resilience in the face of criticism. The accompanying line "I shake it off, I shake it off" emphasizes the speaker's determination to remain unaffected by others' opinions and move on from negativity."

    User: { title: "Savage", artist: "Megan Thee Stallion", lyric: "Talk big shit, but my bank account match it" }

    System: "'Savage' is a song by American rapper Megan Thee Stallion, featured on her debut studio album *Good News* (2020). The song is known for its braggadocio, with the lyric 'Talk big shit, but my bank account match it' highlighting the theme of confidence and self-assuredness. The lyrics express the idea of not only talking the talk but also walking the walk, emphasizing the importance of backing up one's words with actions. The song gained immense popularity due to its catchy beat and empowering message."


    // EXAMPLE OF HOW TO ACT WHEN THE TRACK DOESN'T MATCH WITH AN ALBUM TITLE OR A RELEASE YEAR IN YOUR KNOWLEDGE:
    User: { title: "Blinding Lights", artist: "The Weeknd", lyric: "I'm blinded by the lights / No, I can't sleep until I feel your touch" }

    System: In "Blinding Lights," the lyric "I'm blinded by the lights / No, I can't sleep until I feel your touch" is analyzed. It's possible this song is a very recent single or its associated project information is not yet confirmed. However, considering The Weeknd's consistent artistic themes, the lyric appears to explore his frequent narrative of emptiness amidst excess. The "lights" can be interpreted as the overwhelming glare of fame, city life, and hedonistic distractions, which leave him "blinded" and disoriented. This public persona is contrasted by the lyric "No, I can't sleep until I feel your touch," which reveals a deep, personal dependency and a desperate longing for a specific person, suggesting that the surrounding chaos is meaningless without that intimate connection.

    User: ${JSON.stringify({ title, artist, lyric })}`;

  try {
    const response = await model
      .generateContent(prompt)
      .then((result) => result.response);

    if (!!response.candidates?.length && response.candidates[0].finishReason !== "STOP") {
      reply.status(502).send({
        status: 502,
        error:
          "A trava de segurança do Google foi acionada. Tente outra letra.",
        finishReason: response.candidates[0].finishReason,
      });
      return;
    }
    // If everything goes right with the request:
    reply.status(200).send({ status: 200, response });
  } catch (e) {
    reply.status(500).send({ status: 500, error: e });
  }
});
app.listen({ port: 3333 }).then(() => {
  console.log("🚀 HTTP server running on http://localhost:3333");
});
