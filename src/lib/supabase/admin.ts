/**
 * Re-export admin client entry — implementation lives in `src/lib/admin/`
 * so service_role never sits next to browser code.
 */
export { createAdminClient } from "../admin/client";
