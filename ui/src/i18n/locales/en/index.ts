/**
 * The English catalogues, one file per domain.
 *
 * English is the source of truth: every key the app can ask for is declared here. The
 * Vietnamese catalogues mirror these keys; a key missing from Vietnamese falls back
 * to English at runtime, so a domain can be translated in stages.
 *
 * A domain is a folder of the app (a set of related components), so one person can
 * own a domain end to end without touching anyone else's files.
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

export const en: Catalog = {
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

export default en;
