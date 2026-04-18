import { IExecuteFunctions, NodeConnectionTypes, NodeOutput, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import { getUmTokens } from '../umUtils';
import { UmCreds } from '../../credentials/UmApi.credentials';

export class UmTokens implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Tokens AV',
		name: 'umTokens',
		icon: "file:../av.svg",
		group: ["trigger", "schedule"],
		credentials: [{ name: "umApi", required: true }],
		version: 1,
		description: 'Interactuar con la API del AulaVirtual',
		defaults: {
			name: 'Tokens AV',
		},
		usableAsTool: true,
		polling: true,
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		properties: [],
		builderHint: {
			relatedNodes: [
				{ nodeType: "n8n-nodes-um.avTrigger", relationHint: "Usa este nodo para recibir actualizaciones de eventos." },
			],
		}
	};

	async execute(this: IExecuteFunctions): Promise<NodeOutput> {
		try {
			const creds = await this.getCredentials("umApi") as UmCreds;
			const tokens = await getUmTokens(this, creds);

			return [[{ json: { tokens }, pairedItem: { item: 0 } }]]
		} catch (e) {
			if (!this.continueOnFail()) throw e;
			return [];
		}
	}
}