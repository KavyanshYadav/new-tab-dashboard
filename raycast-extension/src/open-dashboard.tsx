import { open } from '@raycast/api';
import { getBaseUrl } from './api';

export default async function OpenDashboard() {
  const url = getBaseUrl();
  await open(url);
}
