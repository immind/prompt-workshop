import { defineEveryApp } from "@every-app/sdk";

// defineEveryApp types the manifest. The Gateway keeps it; the Worker gets
// the bindings it lists (env.DB, env.files), never the file.
export default defineEveryApp({
  id: "prompt-workshop",
  name: "Prompt Workshop",
  description:
    "Write, check and refine AI prompts for text and images, and share the good ones with your team.",
  resources: {
    d1: ["DB"],
    r2: ["files"],
  },
  ai: {
    chat: {
      why: "Writes, checks and refines prompts, and describes uploaded images.",
    },
  },
});
