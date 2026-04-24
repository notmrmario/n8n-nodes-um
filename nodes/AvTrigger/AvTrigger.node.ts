/* eslint-disable n8n-nodes-base/node-param-description-boolean-without-whether */

import { IDataObject, INodeExecutionData, INodeType, INodeTypeDescription, IPollFunctions } from "n8n-workflow";
import { getAVEndpoint, getAVInfo, notiEventType } from "../umUtils";
import { UmCreds } from "../../credentials/UmApi.credentials";
import { Notificacion } from "../types";

const inactiveNodeStaticData: IDataObject = {};

export class AvTrigger implements INodeType {
    description: INodeTypeDescription = {
        displayName: "AulaVirtual Trigger",
        description: "Trigger para eventos de AulaVirtual",
        name: "avTrigger",
        version: 1,
        icon: "file:../av.svg",
        usableAsTool: true,
        polling: true,
        credentials: [{ name: "umApi", displayName: "Credencial AulaVirtual" }],
        defaults: {
            name: "Trigger AulaVirtual",
        },
        group: ["trigger"],
        inputs: [],
        subtitle: `={{(() => {
            switch ($parameter["evento"]) {
                case "anuncio":
                    return "Anuncios";
                case "examen":
                    return "Exámenes";
                case "notificacion":
                    return "Notificaciones";
                case "tarea":
                    return "Tareas";
                case "llamamiento":
                    return "Llamamientos";
            }    
        })()}}`,
        outputs: `={{(() => {
            switch ($parameter["evento"]) {
                case "anuncio":
                    return [
                        { type: "main", displayName: "Nuevos" },
                        { type: "main", displayName: "Modificados" },
                    ];
                case "examen":
                    return [
                        { type: "main", displayName: "Nuevos/Notas" },
                        { type: "main", displayName: "Modificados" },
                    ];
                case "notificacion":
                    return [
                        { type: "main", displayName: "Notificaciones" },
                    ];
                case "tarea":
                    return [
                        { type: "main", displayName: "Nuevas" },
                        { type: "main", displayName: "Calificaciones" },
                        { type: "main", displayName: "Acceso modificado" },
                        ];
                case "llamamiento":
                    return [
                        { type: "main", displayName: "Nuevos" },
                        { type: "main", displayName: "Anulados" },
                    ];
            }    
        })()}}`,
        properties: [
            {
                displayName: "Evento",
                name: "evento",
                default: "notificacion",
                type: "options",
                placeholder: "Selecciona un evento",
                options: [
                    { name: "Anuncios", value: "anuncio" },
                    { name: "Examenes", value: "examen" },
                    { name: "Llamamientos", value: "llamamiento" },
                    { name: "Notificaciones (Todo)", value: "notificacion" },
                    { name: "Tareas", value: "tarea" },
                ]
            },
            {
                displayName: "IDs De Sitio",
                name: "sitios_ids_filtro",
                type: "string",
                typeOptions: {
                    multipleValues: true,
                    multipleValueButtonText: "Añadir ID de Sitio",
                },
                default: [],
                description: "Solo pasarán los eventos que vengan de estos sitios. Deja vacío para recibir todos.",
                placeholder: "ID"
            },
            {
                displayName: "Entrada Aleatoria",
                name: "noti_random",
                type: "boolean",
                default: false,
                description: "Mostrar una entrada aleatoria en lugar de la más reciente (solo en modo de prueba)",
            }
        ]
    };

    async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
        const credentials = await this.getCredentials("umApi") as UmCreds;
        const evento = this.getNodeParameter("evento") as Eventos;
        const ids_filtro = this.getNodeParameter("sitios_ids_filtro") as string[];
        const staticData = this.getWorkflow().active ? this.getWorkflowStaticData("node") : inactiveNodeStaticData;
        const active = this.getWorkflow().active;
        const random = this.getNodeParameter("noti_random");

        let notificaciones = await getAVEndpoint(this, "/users/me/notifications", credentials) as Notificacion[];
        if (ids_filtro.length) notificaciones = notificaciones.filter(n => ids_filtro.includes(n.siteId));

        if (!staticData.seenIds) { // primera ejecucion
            staticData.seenIds = [];
            if (active) return [];
        } else if (active) notificaciones = notificaciones.filter(n => !(staticData.seenIds as number[])!.includes(n.id));

        let result: INodeExecutionData[][];

        switch (evento) {
            case "notificacion": {
                result = [notificaciones.map(n => ({ json: n }))];
                break;
            }
            case "anuncio": {
                result = [
                    notificaciones.filter(n =>
                        notiEventType["nuevo_anuncio"].includes(n.event) &&
                        !n.title.toLowerCase().startsWith("llamamiento de examen") &&
                        !n.title.toLowerCase().startsWith("anulación de llamamiento de examen")).map(n =>
                            ({ json: n })),
                    notificaciones.filter(n =>
                        notiEventType["anuncio_modificado"].some(id => n.event.startsWith(id)) &&
                        !n.title.toLowerCase().startsWith("llamamiento de examen") &&
                        !n.title.toLowerCase().startsWith("anulación de llamamiento de examen")).map(n =>
                            ({ json: n })),
                ];
                break;
            }
            case "examen": {
                result = [
                    notificaciones.filter(n =>
                        notiEventType["nuevo_examen"].includes(n.event)).map(n =>
                            ({ json: n })),
                    notificaciones.filter(n =>
                        notiEventType["examen_modificado"].some(id =>
                            n.event.startsWith(id))).map(n => ({ json: n })),
                ];
                break;
            }
            case "tarea": {
                result = [
                    notificaciones.filter(n =>
                        notiEventType["nueva_tarea"].includes(n.event)).map(n =>
                            ({ json: n })),
                    notificaciones.filter(n =>
                        notiEventType["nota_tarea"].includes(n.event)).map(n =>
                            ({ json: n })),
                    notificaciones.filter(n =>
                        notiEventType["cambio_acceso_tarea"].includes(n.event)).map(n =>
                            ({ json: n }))
                ];
                break;
            }
            case "llamamiento": {
                result = [
                    notificaciones.filter(n =>
                        notiEventType["nuevo_anuncio"].includes(n.event) && n.title.toLowerCase().startsWith("llamamiento de examen")).map(n =>
                            ({ json: n })),
                    notificaciones.filter(n =>
                        notiEventType["nuevo_anuncio"].includes(n.event) && n.title.toLowerCase().startsWith("anulación de llamamiento de examen")).map(n =>
                            ({ json: n })),
                ]
                break;
            }
        }

        staticData.seenIds = notificaciones.map(n => n.id);

        if (!active) result = result.map(r => r ? [r[random ? Math.floor(Math.random() * r.length) : 0]] : []);
        if (evento != "notificacion") for (let i = 0; i < result.length; i++)
            for (let j = 0; j < result[i].length; j++) {
                const n = result[i][j];
                result[i][j] = {
                    ...n,
                    json: { ...n.json, extra: await getAVInfo(this, credentials, evento, n.json.url as string) },
                    pairedItem: { item: 0 },
                }
            }

        return result;
    }
}

type Eventos =
    | "anuncio"
    | "examen"
    | "notificacion"
    | "tarea"
    | "llamamiento";