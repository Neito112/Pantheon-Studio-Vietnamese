/**
 * The Vietnamese catalogues, one file per domain — the mirror of `../en`.
 *
 * A key missing here falls back to English, so a domain can be translated in stages
 * without the UI ever showing a blank.
 */
import type { Catalog } from "../../types";

import agents from "./agents";
import bench from "./bench";
import common from "./common";
import files from "./files";
import meta from "./meta";
import office from "./office";
import org from "./org";
import sessions from "./sessions";
import settings from "./settings";
import shell from "./shell";
import stage from "./stage";
import team from "./team";
import work from "./work";

export const vi: Catalog = {
  ...common,
  ...shell,
  ...org,
  ...team,
  ...settings,
  ...sessions,
  ...bench,
  ...meta,
  ...stage,
  ...files,
  ...work,
  ...office,
  ...agents,
};

export default vi;
