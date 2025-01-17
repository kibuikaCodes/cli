import { writeFileSync } from "fs";
import { outputFileSync } from "fs-extra";
import { readFile } from "fs/promises";
import { statusType } from "../../services/api/paths/diffs";
import { parse, stringify, stringifyResources } from "../../services/parser/parser";
import spinner from "../../services/spinner";
import { getVersion } from "../../shared";
import checks, { DeploymentAlert, DeploymentChannel, DeploymentQuery } from "../apply/handlers/checks";
import { verifyPlan } from "../plan/handlers";
import { promptRefresh } from "./prompts";


async function refresh(config: string, skip: boolean = false) {
  const s = spinner.get();
  const { metadata, resources, filenames } = await checks.validate(config);
  s.start("Checking resources to import...");
  const diff = await verifyPlan(metadata, resources, true);

  const res = skip ? true : await promptRefresh();

  if (!res) {
    process.exit(0);
  }

  const { resources: { queries, alerts, channels }, application: appDiff } = diff;
  const allResources = [
    ...queries,
    ...alerts,
    ...channels,
  ];
  const toDelete = allResources.filter(r => r.status === statusType.VALUE_DELETED);
  const toUpdate = allResources.filter(r => r.status === statusType.VALUE_UPDATED);

  const toDeleteIds = toDelete.map(resource => resource.resource.id);
  const toUpdateIds = toUpdate.map(resource => resource.resource.id);

  const deleteAndUpdatePromises = filenames.map(async filename => {
    const s = (await readFile(filename)).toString();
    const data = parse(s) || {};
    const updatedQueries: DeploymentQuery[] = [];
    const updatedAlerts: DeploymentAlert[] = [];
    const updatedChannels: DeploymentChannel[] = [];
    Object.keys(data).forEach(key => {
      data[key].id = key;
      if (toDeleteIds.includes(key)) {
        console.log("Deleting " + key);
        delete data[key];
      }
      if (toUpdateIds.includes(key)) {
        console.log("Updating " + key);
        const { resource } = toUpdate.find(resource => resource.resource.id === key)!;
        data[key] = { ...resource, type: data[key].type };
      }

      if (!data[key]) return;

      switch (data[key]?.type) {
        case "query":
          updatedQueries.push(data[key] as DeploymentQuery);
          break;
        case "alert":
          updatedAlerts.push(data[key] as DeploymentAlert);
          break;
        case "channel":
          updatedChannels.push(data[key] as DeploymentChannel);
          break;
        default:
          break;
      }
    });

    const dd = stringifyResources({ queries: updatedQueries, alerts: updatedAlerts, channels: updatedChannels, });
    writeFileSync(`${filename}`, dd);
  });

  const createPromise = (async () => {
    const newQueries = queries.filter(q => q.status === statusType.VALUE_CREATED).map(q => q.resource);
    const newAlerts = alerts.filter(a => a.status === statusType.VALUE_CREATED).map(q => q.resource);
    const newChannels = channels.filter(c => c.status === statusType.VALUE_CREATED).map(q => q.resource);
    // @ts-ignore
    const dd = stringifyResources({ queries: newQueries, alerts: newAlerts, channels: newChannels });
    if (!dd) return;
    const now = (new Date()).toISOString();
    const path =`${config}/imported/${now}.yml`;
    outputFileSync(path, dd);
    console.log(`Imported resources stored in ${path}. Please do not delete this file.`);
  })();

  const applicationPromise = (async () => {
    const { status, application } = appDiff;
    if (status === statusType.VALUE_UNCHANGED || status === statusType.VALUE_DELETED) return;
    const dd = stringify({ version: getVersion(), ...application });
    writeFileSync(`${config}/index.yml`, dd);
  })();

  await Promise.all([...deleteAndUpdatePromises, createPromise, applicationPromise]);
}



export default {
  refresh,
};
