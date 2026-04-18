import { IDataObject, IExecuteFunctions, IPollFunctions } from "n8n-workflow";
import { IStaticDataHeaders } from "./types";
import { UmCreds } from "../credentials/UmApi.credentials";
export declare const inactiveStaticData: IDataObject;
export declare const notiEventType: {
    nueva_tarea: string[];
    nota_tarea: string[];
    cambio_acceso_tarea: string[];
    nuevo_examen: string[];
    examen_modificado: string[];
    nuevo_anuncio: string[];
    anuncio_modificado: string[];
};
export declare function getUmTokens(node: IPollFunctions | IExecuteFunctions, credentials: UmCreds): Promise<IStaticDataHeaders>;
export declare function getAVEndpoint(node: IPollFunctions, endpoint: string, credentials: UmCreds): Promise<IDataObject | IDataObject[]>;
type ItemTipo = "tarea" | "anuncio" | "examen";
export declare function getAVInfo(node: IPollFunctions | IExecuteFunctions, credentials: UmCreds, item: ItemTipo, url: string): Promise<IDataObject | {
    titulo: string | undefined;
    cabecera: {
        [key: string]: string;
    };
    instrucciones: string;
    recursosTarea: (string | undefined)[][] | null;
    adjuntosEnviados: (string | undefined)[][];
    estado: string;
    error?: undefined;
} | {
    titulo: string | undefined;
    cabecera: {
        [key: string]: string;
    };
    instrucciones: string | null;
    recursosTarea: (string | undefined)[][] | null;
    estado: string;
    adjuntosEnviados?: undefined;
    error?: undefined;
} | {
    titulo: string | undefined;
    cabecera: {
        [key: string]: string;
    };
    instrucciones: string | null;
    recursosTarea: (string | undefined)[][] | undefined;
    estado: string;
    adjuntosEnviados?: undefined;
    error?: undefined;
} | {
    error: string;
    titulo?: undefined;
    cabecera?: undefined;
    instrucciones?: undefined;
    recursosTarea?: undefined;
    adjuntosEnviados?: undefined;
    estado?: undefined;
}>;
export {};
