// Firebase uses XMLHttpRequest instead of `fetch()`, so we need to provide a
// polyfill for it.
import "https://deno.land/x/xhr@0.1.1/mod.ts";

// Firebase for the web by default stores authenticated sessions in
// localStorage.  This polyfill will allow us to "extract" the localStorage and
// send it to the client as cookies.
import { installGlobals } from "https://deno.land/x/virtualstorage@0.1.0/mod.ts";

// Since Deploy is browser-like, we will use the Firebase web client libraries
// importing in just what we need for this tutorial. We are using the Skypack
// CDN which also provides modules as ES Modules.
// @deno-types=https://cdn.skypack.dev/-/firebase@v8.7.0-MrU9zUCxcEMCl2U7Tuz6/dist=es2020,mode=types/index.d.ts
import firebase from "https://cdn.skypack.dev/firebase@8.7.0/app";
import "https://cdn.skypack.dev/firebase@8.7.0/auth";
import "https://cdn.skypack.dev/firebase@8.7.0/firestore";

// For this tutorial, we are going to use the oak middleware framework to create
// our APIs and integrate to Firebase.
import {
  Application,
  Router,
  Status,
} from "https://deno.land/x/oak@v7.7.0/mod.ts";

// There is also middleware for oak that will help use with the setting the
// localStorage cookies for the client
import { virtualStorage } from "https://deno.land/x/virtualstorage@0.1.0/middleware.ts";

// This will install the polyfill for localStorage
installGlobals();

const firebaseConfig = JSON.parse(Deno.env.get("FIREBASE_CONFIG"));

const firebaseApp = firebase.initializeApp(firebaseConfig, "forum");

const db = firebase.firestore(firebaseApp);

const router = new Router();

/**
 * @typedef {Object} Song
 * @property {string} title
 * @property {string} album
 * @property {string} artist
 * @property {string} released
 * @property {string} genres
 */

/**
 * @param {unknown} value
 * @returns {value is Song}
 */
function isSong(value) {
  return typeof value === "object" && value !== null && "title" in value;
}

// Returns any documents in the collection
router.get("/songs", async (ctx) => {
  const querySnapshot = await db.collection("songs").get();
  ctx.response.body = querySnapshot.docs.map((doc) => doc.data());
  ctx.response.type = "json";
});

// Returns the first document that matches the title
router.get("/songs/:title", async (ctx) => {
  const { title } = ctx.params;
  const querySnapshot = await db.collection("songs").where("title", "==", title)
    .get();
  const song = querySnapshot.docs.map((doc) => doc.data())[0];
  if (!song) {
    ctx.response.status = 404;
    ctx.response.body = `The song titled "${ctx.params.title}" was not found.`;
    ctx.response.type = "text";
  } else {
    ctx.response.body = querySnapshot.docs.map((doc) => doc.data())[0];
    ctx.response.type = "json";
  }
});

// Adds a document posted (removing any other documents with the same title)
router.post("/songs", async (ctx) => {
  const body = ctx.request.body();
  if (body.type !== "json") {
    ctx.throw(Status.BadRequest, "Must be a JSON document");
  }
  const song = await body.value;
  if (!isSong(song)) {
    ctx.throw(Status.BadRequest, "Payload was not well formed");
  }
  const querySnapshot = await db
    .collection("songs")
    .where("title", "==", song.title)
    .get();
  await Promise.all(querySnapshot.docs.map((doc) => doc.ref.delete()));
  const songsRef = db.collection("songs");
  await songsRef.add(song);
  ctx.response.status = Status.NoContent;
});

const app = new Application();

// This will take the localStorage values and send them to the client as cookies
// and restore their values on subsequent requests.
app.use(virtualStorage());
app.use(router.routes());
app.use(router.allowedMethods());

app.addEventListener(
  "listen",
  () => console.log("Listening on http://localhost:8000"),
);
await app.listen({ port: 8000 });