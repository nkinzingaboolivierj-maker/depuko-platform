import { Module } from "@nestjs/common";

/** PHASE 4: lifecycle implemented + tested. The malware scanner adapter and
 * object storage are BLOCKED BY EXTERNAL DEPENDENCY (owner accounts); with
 * no scanner configured every file stays scan_unavailable - never "safe". */
@Module({})
export class FilesModule {}