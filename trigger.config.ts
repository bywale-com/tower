import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  project: "<TRIGGER_PROJECT_REF>",
  dirs: ["./src/trigger/tasks"],
  maxDuration: 3600,
});
