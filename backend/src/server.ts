import { app } from './app';
import { env } from './config/env';

app.listen(env.PORT, '0.0.0.0', () => {
  console.log(`An Tâm Hospital Backend API listening on http://0.0.0.0:${env.PORT}`);
});
