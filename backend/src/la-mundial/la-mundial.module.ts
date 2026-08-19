import { Module } from '@nestjs/common';
import { LaMundialMockService } from './la-mundial-mock.service';

@Module({
  providers: [LaMundialMockService],
  exports: [LaMundialMockService],
})
export class LaMundialModule {}
