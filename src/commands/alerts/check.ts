import { Arguments, CommandBuilder } from "yargs";
import spinner from "../../services/spinner";
import { authenticate, BaseOptions, printError } from "../../shared";
import handlers from "./handlers/handlers";

export interface Options extends BaseOptions {
  application: string;
  id?: string;
  trigger?: boolean;
}

export const command = "check";
export const desc = "Run the query of a set of alerts to check their status";

export const builder: CommandBuilder<Options, Options> = (yargs) => {
  return yargs
    .options({
      application: { type: "string", desc: "Name of the application", alias: "app", required: true },
      id: { type: "string", desc: "Id of the alert" },
      trigger: { type: "boolean", desc: "Flag to trigger the alert as part of the check" },
    })
    .example([
      [`
      # Check all the alerts in an application:
      $0 alerts check --application <application_name>

      # Check a specific alert:
      $0 alerts check --application <application_name> --id <alert_id>

      # Check and trigger all the alerts in an application:
      $0 alerts check --application <application_name> --trigger
      `],
    ])
    .fail((message, err, yargs) => {
      printError(message, err, yargs);
    });
};

export async function handler(argv: Arguments<Options>) {
  const { profile, format, application, id, trigger } = argv;
  spinner.init(!!argv.quiet);
  await authenticate(profile);
  await handlers.check(format!, { application, id, trigger });
}