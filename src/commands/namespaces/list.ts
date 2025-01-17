import { Arguments, CommandBuilder } from "yargs";
import spinner from "../../services/spinner";
import { authenticate, baseOptions, BaseOptions, printError } from "../../shared";
import handlers from "./handlers/handlers";

export interface Options extends BaseOptions {
  application?: string;
  from: string;
  to: string;
}

export const command = "list";
export const desc = "List all the ingested namespaces";

export const builder: CommandBuilder<Options, Options> = (yargs) => {
  return yargs
    .options({
      ...baseOptions,
      application: { type: "string", desc: "The application" },
      from: { type: "string", desc: "UTC start time - may also be relative eg: 1h, 20mins", default: "1hour" },
      to: { type: "string", desc: "UTC end time - may also be relative eg: 1h, 20mins, now", default: "now" },
    })
    .example([
      [`
      # List all the namespaces ingested across all datasets for the past hour:
      $0 namespaces list

      # List all the namespaces ingested for an application in the past 3 hours:
      $0 namespaces list --application <application> --from 3hours --to now
      `],
    ])
    .fail((message, err, yargs) => {
      printError(message, err, yargs);
    });
};

export async function handler(argv: Arguments<Options>) {
  const { profile, format, from, to, application } = argv;
  spinner.init(!!argv.quiet);
  await authenticate(profile);
  await handlers.list(format!, from, to, application);
}
