import { IExecuteFunctions, NodeConnectionTypes, NodeOutput, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import { EventoFiltro, Notificacion, Tarea } from '../types';

export class FiltroNovedades implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Filtro Novedades',
		name: 'filtroNovedades',
		icon: "file:../av.svg",
		group: ["input", "output"],
		version: 1,
		subtitle: '={{$parameter["endpoint"]}}',
		description: 'Interact with the Um API',
		defaults: {
			name: 'Filtro Novedades',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: "Tipo De Evento",
				name: "tipo_evento",
				default: undefined,
				type: "options",
				required: true,
				hint: "Un campo que sea único para cada objeto",
				options: [
					// { name: "Elige Uno", value: "ninguno" },
					{ name: "Notificaciones", value: "notificaciones" },
					{ name: "Tareas", value: "tareas" },
				]
			}
		],
	};

	async execute(this: IExecuteFunctions): Promise<NodeOutput> {
		const evento = this.getNodeParameter("tipo_evento", 0) as EventoFiltro;
		const staticData = this.getWorkflowStaticData("node");

		switch (evento) {
			case 'notificaciones': {
				const items = this.getInputData() as { json: Notificacion }[];

				const lastSeenId = staticData.lastSeenId as number ?? null;

				const notisNuevas = lastSeenId === null
					? []
					: items.filter(i => i.json.id > lastSeenId);

				if (notisNuevas.length > 0) staticData.lastSeenId = Math.max(...items.map(i => i.json.id));

				return [notisNuevas.map(n => ({ json: n }))];
			}
			case 'tareas': {
				const items = this.getInputData() as unknown as { json: Tarea }[];

				const seenIds = new Set<string>(staticData.seenIds as string[] ?? []);

				if (seenIds.size == 0) {
					staticData.seenIds = new Set<string>([...items.map(i => i.json.url)]);
					return [[]];
				} else {
					const tareasNuevas: typeof items = [];
					for (const item of items) {
						if (!seenIds.has(item.json.url)) {
							seenIds.add(item.json.url);
							tareasNuevas.push(item);
						}
					}
					return [tareasNuevas];
				}
			}
		}
	}
}