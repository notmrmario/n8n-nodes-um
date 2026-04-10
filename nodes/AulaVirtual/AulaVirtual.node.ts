/* eslint-disable @n8n/community-nodes/no-restricted-imports */

import { IExecuteFunctions, INodeExecutionData, NodeApiError, NodeConnectionTypes, NodeOperationError, NodeOutput, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import { dateFormat, Endpoint, Sitio } from '../types';
import { DateTime } from "luxon";
import he from "he";
import { parseTarea } from '../utils';

export class AulaVirtual implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AulaVirtual API',
		name: 'aulaVirtual',
		icon: "file:../av.svg",
		group: ["input", "output"],
		version: 1,
		subtitle: '={{$parameter["endpoint"]}}',
		description: 'Interact with the Um API',
		defaults: {
			name: 'AulaVirtual API',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			// globales
			{
				displayName: "Token JSESSIONID",
				name: "JSESSIONID",
				type: "string",
				default: "",
				required: true,
				hint: "Token JSESSIONID activo",
			},
			{
				displayName: "Token ORA_OTD_JROUTE",
				name: "ORA_OTD_JROUTE",
				type: "string",
				default: "",
				required: true,
				hint: "Token ORA_OTD_JROUTE activo",
			},
			{
				displayName: "Endpoint",
				name: "endpoint",
				type: "options",
				default: undefined,
				options: [
					{ name: "Herramientas Del Sitio", value: "herramientas" },
					{ name: "Notificaciones", value: "notificaciones" },
					{ name: "Sitios", value: "sitios" },
					{ name: "Tarea Por URL", value: "tarea_url" },
					{ name: "Tareas Del Sitio", value: "tareas" },
				]
			},
			// especificas
			{
				displayName: "ID Del Sitio",
				name: "site_id",
				type: "string",
				default: "",
				displayOptions: { show: { endpoint: ["herramientas"] } },
				required: true,
			},
			{
				displayName: "URL Herramienta Tareas",
				name: "tareas_url",
				type: "string",
				default: "",
				displayOptions: { show: { endpoint: ["tareas"] } },
				required: true,
			},
			{
				displayName: "URL De La Tarea",
				name: "url_tarea",
				type: "string",
				default: "",
				displayOptions: { show: { endpoint: ["tarea_url"] } },
				required: true,
			},
			{
				displayName: "URL Herramienta Exámenes",
				name: "examenes_url",
				type: "string",
				default: "",
				displayOptions: { show: { endpoint: ["examenes"] } },
				required: true,
			},
			{
				displayName: "Opciones",
				type: "collection",
				default: {},
				name: "opciones_extra_sitio",
				placeholder: "Añadir Opción",
				displayOptions: { show: { endpoint: ["sitios"] } },
				options: [
					{
						displayName: "Filtrar Por Nombre",
						name: "filter_site",
						type: "string",
						default: "",
						hint: "Devolver solo los sitios que contengan esto en el nombre",
					}
				]
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<NodeOutput> {
		const result: INodeExecutionData[][] = [];

		for (let i = 0; i < this.getInputData().length; i++) {
			const jsess = this.getNodeParameter("JSESSIONID", i) as Endpoint;
			const jroute = this.getNodeParameter("ORA_OTD_JROUTE", i) as Endpoint;
			const endpoint = this.getNodeParameter("endpoint", i) as Endpoint;

			const headers = {
				"Cookie": `JSESSIONID=${jsess}; ORA_OTD_JROUTE=${jroute}`
			};

			if (endpoint == "ninguno") throw new NodeOperationError(this.getNode(), {}, { message: "Selecciona un endpoint." });

			switch (endpoint) {
				case 'herramientas': {
					const sitio_id = this.getNodeParameter("site_id", i) as string;
					const sitios: { sites: Sitio[] } = await this.helpers.httpRequest({
						url: "https://aulavirtual.um.es/api/users/me/sites",
						headers,
					});

					const herramientas = sitios.sites.find(s => s.siteId === sitio_id)?.tools.map(t => ({
						titulo: t.title,
						url: t.url,
						id: /tool\/(?<tool>.*?)$/gm.exec(t.url)?.groups?.tool,
					}));

					result.push(herramientas?.map(h => ({ json: h })) ?? []);
					break;
				}
				case 'notificaciones': {
					const notificaciones = await this.helpers.httpRequest({
						url: "https://aulavirtual.um.es/api/users/me/notifications",
						headers,
					});

					result.push(notificaciones.map((n: object) => ({ json: n })));
					break;
				}
				case 'sitios': {
					const sitios: { sites: Sitio[] } = await this.helpers.httpRequest({
						url: "https://aulavirtual.um.es/api/users/me/sites",
						headers,
					});

					result.push(sitios.sites.map(s => ({ json: s })));
					break;
				}
				case 'tareas': {
					const tareas_url = this.getNodeParameter("tareas_url", i) as string;

					// resetear la herramienta para que muestre la lista de tareas
					// no se por que lo hacen asi
					await this.helpers.httpRequest({
						url: tareas_url.replace("tool", "tool-reset"),
						headers,
					})

					const tareas_res = await this.helpers.httpRequest({
						url: tareas_url,
						headers,
					}) as string;

					const tabla_tareas = /(?<tabla_tareas><table.*?summary=".*?tareas\.">.*?<\/table>)/si.exec(tareas_res)?.groups?.tabla_tareas
						.replace(/\n|\t/g, "");
					if (!tabla_tareas) throw new NodeApiError(this.getNode(), {}, { message: "No se ha podido obtener la lista de tareas." });
					const tabla_tareas_decoded = he.decode(tabla_tareas).replace(/\t|\n/g, "").replace(/"/g, "\"");

					const titulos = [...tabla_tareas_decoded.matchAll(
						/<td headers=.*?"title.*?".*?>.*?<strong>.*?<a.*?href=.*?"(?<url_tarea>.*?)\\?".*?title=.*?"(?<titulo_tarea>.*?)\\?"/gs)]
						.map(m => m.groups);
					const estados = [...tabla_tareas_decoded.matchAll(/<td headers="status">(?<estado>.*?)<\/td>/gs)].map(m => m.groups?.estado);
					const notas = [...tabla_tareas_decoded.matchAll(/<td headers="grade"><span>(?<nota>.*?)<\/span><\/td>/gs)].map(m => m.groups?.nota);
					const inicios = [...tabla_tareas_decoded.matchAll(/<td headers="openDate".*?>(?<fecha_inicio>.*?)<\/td>/gs)].map(m => m.groups?.fecha_inicio);
					const fines = [...tabla_tareas_decoded.matchAll(/<td headers="dueDate".*?>.*?>(?<fecha_fin>.*?)<\/span><\/td>/gs)].map(m => m.groups?.fecha_fin);

					const tareas = titulos.map((t, i) => ({
						titulo: t!.titulo_tarea,
						url: t!.url_tarea,
						estado: estados[i],
						nota: notas[i],
						inicio: DateTime.fromFormat(inicios[i]!, dateFormat, { locale: "es" }),
						fin: DateTime.fromFormat(fines[i]!, dateFormat, { locale: "es" }),
					}));

					result.push(tareas.map(t => ({ json: t })));
					break;
				}
				case 'tarea_url': {
					const url_tarea = this.getNodeParameter("url_tarea", i) as string;

					const tarea_res = await this.helpers.httpRequest({
						url: url_tarea,
						headers,
					});
					const clean_res = he.decode(tarea_res.replace(/<script.*?<\/script>/gsi, "").replace(/\n|\t/g, "")).trim();

					const tarea = parseTarea(clean_res);

					result.push([{ json: tarea }]);
					break;
				}
			}
		}

		return result;
	}
}