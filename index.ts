import { SkyscannerFlightsScraper } from './nodes/SkyscannerFlightsScraper/SkyscannerFlightsScraper.node';
import { ApifyApi } from './credentials/ApifyApi.credentials';

export const nodeTypes = [SkyscannerFlightsScraper];

export const credentialTypes = [ApifyApi];
