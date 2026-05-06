/* eslint-disable @n8n/community-nodes/no-restricted-imports */
/* eslint-disable @n8n/community-nodes/no-http-request-with-manual-auth */

import { IExecuteFunctions, INodeExecutionData, NodeApiError, NodeConnectionTypes, NodeOperationError, NodeOutput, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import { dateFormat, Endpoint, Sitio } from '../types';
import { DateTime } from "luxon";
import { parseAnuncio, getUmTokens, getAVInfo } from '../umUtils';
import { UmCreds } from '../../credentials/UmApi.credentials';
import he from "he";

export class AulaVirtual implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AulaVirtual API',
		name: 'aulaVirtual',
		icon: "file:../av.svg",
		group: ["input", "output"],
		version: 1,
		credentials: [{ name: "umApi" }],
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
				displayName: "Endpoint",
				name: "endpoint",
				type: "options",
				default: undefined,
				options: [
					{ name: "Anuncio Por Url", value: "anuncio_url" },
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
				displayName: "URL Del Anuncio",
				name: "url_anuncio",
				type: "string",
				default: "",
				displayOptions: { show: { endpoint: ["anuncio_url"] } },
				required: true,
			},
			// opciones
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
		const results: INodeExecutionData[][] = [];
		const credentials = await this.getCredentials("umApi") as UmCreds;
		const items = this.getInputData();
		const tokens = await getUmTokens(this, credentials);

		try {
			for (let i = 0; i < items.length; i++) {
				const endpoint = this.getNodeParameter("endpoint", i) as Endpoint;

				const headers = {
					"Cookie": `JSESSIONID=${tokens.JSESSIONID}; ORA_OTD_JROUTE=${tokens.ORA_OTD_JROUTE}`
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

						results.push(herramientas?.map(h => ({ json: h, pairedItem: items[i].pairedItem })) ?? []);
						break;
					}
					case 'notificaciones': {
						const notificaciones = await this.helpers.httpRequest({
							url: "https://aulavirtual.um.es/api/users/me/notifications",
							headers,
						});

						results.push(notificaciones.map((n: object) => ({ json: n, pairedItem: items[i].pairedItem })));
						break;
					}
					case 'sitios': {
						const sitios: { sites: Sitio[] } = await this.helpers.httpRequest({
							url: "https://aulavirtual.um.es/api/users/me/sites",
							headers,
						});

						results.push(sitios.sites.map(s => ({ json: s, pairedItem: items[i].pairedItem })));
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

						results.push(tareas.map(t => ({ json: t, pairedItem: items[i].pairedItem })));
						break;
					}
					case 'tarea_url': {
						const url_tarea = this.getNodeParameter("url_tarea", i) as string;
						const tarea = await getAVInfo(this, credentials, "tarea", url_tarea);

						if (!results[0]) results[0] = [];
						results[0].push({ json: tarea, pairedItem: items[i].pairedItem });
						
						break;
					}
					case 'anuncio_url': {
						const url_anuncio = this.getNodeParameter("url_anuncio", i) as string;

						const anuncio_res = await this.helpers.httpRequest({
							url: url_anuncio,
							headers
						});

						const clean_res = he.decode(anuncio_res.replace(/<script.*?<\/script>/gsi, "").replace(/\n|\t/g, "")).trim();

						// results.push([{ json: { clean_res } }])
						const anuncio = parseAnuncio(clean_res);

						if (!results[0]) results[0] = [];
						results[0].push({ json: anuncio, pairedItem: items[i].pairedItem });
						break;
					}
				}
			}
		} catch (e) {
			if (!this.continueOnFail()) throw e;
		}

		return results;
	}
}