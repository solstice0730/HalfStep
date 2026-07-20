import { env } from "@/config/env";

import { createRecordsClient } from "./recordsClient";

export const recordsApi = createRecordsClient(env.apiBaseUrl);
