import { IExecuteFunctions, NodeConnectionTypes, NodeOutput, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import { Notificacion, SakaiToolType } from '../types';
import { keys } from '../utils';

export class FiltroTipo implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Filtro Tipo',
		name: 'filtroTipo',
		icon: "file:../av.svg",
		group: ["input", "output"],
		version: 1,
		subtitle: '={{$parameter["endpoint"]}}',
		description: 'Filtra notificaciones en base al tipo',
		defaults: {
			name: 'Filtro Tipo',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: "Tipo De Herramienta",
				name: "herramientas",
				type: "collection",
				default: {},
				placeholder: "Añadir Filtro",
				options: keys(SakaiToolType).map(t => ({
					displayName: SakaiToolType[t],
					name: t,
					type: "boolean",
					default: true,
				}))
			}
		]
	};

	async execute(this: IExecuteFunctions): Promise<NodeOutput> {
		return [
			(this.getInputData() as { json: Notificacion }[])
				.filter((i, idx) => this.getNodeParameter(i.json.event, idx))
		];
	}
}