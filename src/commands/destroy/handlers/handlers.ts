import api from "../../../services/api/api";
import spinner from "../../../services/spinner";
import { verifyPlan } from "../../plan/handlers";
import * as prompts from "./prompts";
import checks from "../../apply/handlers/checks";

async function destroy(config: string) {
  const s = spinner.get();
  const { metadata } = await checks.validate(config);
  const resources = { queries: [], channels: [], alerts: [] };
  s.start("Checking resources to destroy...");
  // Remove the provider to signal to the API that we're deleting the application
  metadata.provider = "";
  await verifyPlan(metadata, resources, false);
  const res = await prompts.promptApply();

  if (!res) {
    process.exit(0);
  }

  s.start("Destroying your application...");
  await api.applicationDelete(metadata.application);
  s.succeed("Application deleted");
}


export default {
  destroy,
};
