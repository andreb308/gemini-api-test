import "dotenv/config"; // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
import fastify from "fastify";

import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";

import z from "zod";
import { getGeminiResponse } from "./model";

const app = fastify().withTypeProvider<ZodTypeProvider>();
app.setSerializerCompiler(serializerCompiler);
app.setValidatorCompiler(validatorCompiler);


const createSearchQuerySchema = z
  .strictObject({
    title: z.string(),
    artist: z.string(),
    lyric: z.string(),
  })
  
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

  const prompt = `User: ${JSON.stringify({ title, artist, lyric })}`;

  try {
    const response = await getGeminiResponse(prompt)

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
