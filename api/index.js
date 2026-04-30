// Vercel Serverless Function entry point. Re-exports the Express app from
// the project root so the same code path serves both `npm start` (local)
// and the hosted deployment. The auto-listen block at the bottom of
// server.js is gated on `process.argv[1]` matching server.js itself, so
// importing the module here does not start a listener.
import app from "../server.js";

export default app;
