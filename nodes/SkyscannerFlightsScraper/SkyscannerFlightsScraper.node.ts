import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import type { OptionField } from './GenericFunctions';
import { applyOptions, requireString, runActorAndGetItems } from './GenericFunctions';

// ScrapeUnblocker's public "Skyscanner Flights Scraper" Actor: https://apify.com/scrapeunblocker/skyscanner-flights-scraper
const ACTOR_ID = 'qDzA72AYW2kcRhWul';
const INTEGRATION_APP_ID = 'scrapeunblocker-skyscanner-flights-scraper';

// Node option name -> Actor input key.
const OPTION_FIELDS: Record<string, OptionField> = {
	departDate: {
		key: 'departDate',
	},
	returnDate: {
		key: 'returnDate',
	},
	adults: {
		key: 'adults',
	},
	cabin: {
		key: 'cabin',
	},
	currency: {
		key: 'currency',
		kind: 'upper',
	},
	market: {
		key: 'market',
		kind: 'upper',
	},
	locale: {
		key: 'locale',
	},
};

function buildActorInput(
	this: IExecuteFunctions,
	resource: string,
	operation: string,
	options: IDataObject,
	itemIndex: number,
): IDataObject {
	const input: IDataObject = {};

	switch (`${resource}:${operation}`) {
		case 'flight:search': {
			input.origin = requireString.call(this, 'origin', 'Origin', itemIndex);
			input.destination = requireString.call(this, 'destination', 'Destination', itemIndex);
			input.maxResults = this.getNodeParameter('maxResults', itemIndex);
			break;
		}
		default:
			throw new NodeOperationError(
				this.getNode(),
				`The operation "${operation}" is not supported for resource "${resource}"`,
				{ itemIndex },
			);
	}

	applyOptions(input, options, OPTION_FIELDS);
	return input;
}

export class SkyscannerFlightsScraper implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Skyscanner Flights Scraper',
		name: 'skyscannerFlightsScraper',
		icon: {
			light: 'file:skyscannerFlightsScraper.png',
			dark: 'file:skyscannerFlightsScraper.dark.png',
		},
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description:
			'Search live flight prices across airlines on Skyscanner with the ScrapeUnblocker Actor on Apify',
		defaults: {
			name: 'Skyscanner Flights Scraper',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'apifyApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Flight',
						value: 'flight',
					},
				],
				default: 'flight',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['flight'],
					},
				},
				options: [
					{
						name: 'Search',
						value: 'search',
						description: 'Search flight itineraries between two places',
						action: 'Search flights',
					},
				],
				default: 'search',
			},
			{
				displayName: 'Origin',
				name: 'origin',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'London',
				description:
					"Departure airport or city: an IATA code (e.g. 'LON' or 'VNO') or a name (e.g. 'London').",
				displayOptions: {
					show: {
						resource: ['flight'],
						operation: ['search'],
					},
				},
			},
			{
				displayName: 'Destination',
				name: 'destination',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'Madrid',
				description:
					"Arrival airport or city: an IATA code (e.g. 'MAD' or 'JFK') or a name (e.g. 'Madrid').",
				displayOptions: {
					show: {
						resource: ['flight'],
						operation: ['search'],
					},
				},
			},
			{
				displayName: 'Max Results',
				name: 'maxResults',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				default: 50,
				description:
					'Maximum number of itineraries to return, cheapest first. 0 returns every itinerary found.',
				displayOptions: {
					show: {
						resource: ['flight'],
						operation: ['search'],
					},
				},
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Adults',
						name: 'adults',
						type: 'number',
						typeOptions: {
							minValue: 1,
							maxValue: 9,
						},
						default: 1,
						description: 'Number of adult passengers (1-9)',
					},
					{
						displayName: 'Cabin Class',
						name: 'cabin',
						type: 'options',
						options: [
							{
								name: 'Business',
								value: 'business',
							},
							{
								name: 'Economy',
								value: 'economy',
							},
							{
								name: 'First',
								value: 'first',
							},
							{
								name: 'Premium Economy',
								value: 'premium_economy',
							},
						],
						default: 'economy',
						description: 'Cabin class to price',
					},
					{
						displayName: 'Currency',
						name: 'currency',
						type: 'string',
						default: 'EUR',
						placeholder: 'EUR',
						description:
							'Currency of the prices (ISO code, e.g. EUR, USD or GBP). Defaults to EUR.',
					},
					{
						displayName: 'Departure Date',
						name: 'departDate',
						type: 'string',
						default: '',
						placeholder: '2026-11-12',
						description: 'Outbound date as YYYY-MM-DD. Leave blank for about 60 days from today.',
					},
					{
						displayName: 'Locale',
						name: 'locale',
						type: 'string',
						default: 'en-GB',
						placeholder: 'en-GB',
						description: 'Language of the results (e.g. en-GB, en-US or de-DE). Defaults to en-GB.',
					},
					{
						displayName: 'Market',
						name: 'market',
						type: 'string',
						default: 'UK',
						placeholder: 'UK',
						description:
							'Country you are booking from (e.g. UK, US, DE or LT). It affects prices and providers. Defaults to UK.',
					},
					{
						displayName: 'Return Date',
						name: 'returnDate',
						type: 'string',
						default: '',
						placeholder: '2026-11-19',
						description:
							'Return date as YYYY-MM-DD for a round trip. Leave blank for a one-way search.',
					},
					{
						displayName: 'Timeout (Seconds)',
						name: 'timeout',
						type: 'number',
						typeOptions: {
							minValue: 0,
						},
						default: 0,
						description:
							'Maximum run time of the Apify Actor run. 0 keeps the Actor default. A run that times out fails the node.',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;
				const options = this.getNodeParameter('options', i, {}) as IDataObject;
				const { timeout, ...actorOptions } = options;

				const input = buildActorInput.call(this, resource, operation, actorOptions, i);
				const { items: results } = await runActorAndGetItems.call(this, {
					actorId: ACTOR_ID,
					integrationAppId: INTEGRATION_APP_ID,
					input,
					itemIndex: i,
					timeoutSecs: (timeout as number) || undefined,
				});

				for (const result of results) {
					returnData.push({ json: result, pairedItem: { item: i } });
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				// Both constructors return an error of their own class unchanged.
				if (error instanceof NodeApiError) {
					throw new NodeApiError(this.getNode(), error as unknown as JsonObject, { itemIndex: i });
				}
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
			}
		}

		return [returnData];
	}
}
