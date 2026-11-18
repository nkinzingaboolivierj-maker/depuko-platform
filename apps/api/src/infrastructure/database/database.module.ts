import { Global, Module } from '@nestjs/common';
import { DatabaseService } from './database.service';

/**
 * Global so any module's infrastructure layer can inject DatabaseService
 * without every module re-declaring it. Import this once in AppModule.
 */
@Global()
@Module({
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
