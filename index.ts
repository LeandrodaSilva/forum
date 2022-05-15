import { Application, Router } from "https://deno.land/x/oak@v10.5.1/mod.ts";

export interface Message {
  id: string;
  text: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  parentId?: string;
  childrens?: Message[];
}

const router = new Router();

router
  .get("/messages", (context) => {
    const storageMessages = localStorage.getItem("messages");

    if (storageMessages) {
      const parsedMessages = JSON.parse(storageMessages);
      context.response.type = "application/json";
      context.response.body = parsedMessages;
    } else {
      context.response.type = "application/json";
      context.response.body = [];
    }
  })
  .post("/message", async (context) => {
    const data = await context.request.body().value;

    const message: Message = {
      id: crypto.randomUUID(),
      text: data.text,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: data.author || "Anonymous",
      parentId: data.parentId || undefined,
    };

    const storageMessages = localStorage.getItem("messages");

    if (storageMessages) {
      const parsedMessages = JSON.parse(storageMessages);
      parsedMessages.push(message);
      localStorage.setItem("messages", JSON.stringify(parsedMessages));
      context.response.type = "application/json";
      context.response.body = parsedMessages;
    } else {
      localStorage.setItem("messages", JSON.stringify([message]));
      context.response.type = "application/json";
      context.response.body = [message];
    }
  });

const app = new Application();
app.use(router.routes());
app.use(router.allowedMethods());

app.addEventListener("listen", ({port }) => {
  console.log(`Listening on port ${port}`);
});

await app.listen({ port: 8080 });