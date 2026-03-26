import { app } from './server';
import { config } from './config/index';
import { logger } from './libs/logger';

app.listen(config.port, () => {
  logger.info(`Server running on port ${config.port}`);
});