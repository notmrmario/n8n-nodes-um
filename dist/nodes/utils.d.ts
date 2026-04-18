import TurnDown from "turndown";
import { HTMLElement } from "node-html-parser";
import { type IDataObject } from "n8n-workflow";
export declare const td: TurnDown;
export declare const regex_adjuntos: RegExp;
export declare function extraerCampo(html: string, nombreCampo: string): string | null;
export declare function keys<T extends object>(o: T): (keyof T)[];
export declare function parseTarea(html: string): IDataObject;
export declare function parseTarea2(document: HTMLElement): {
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
};
export declare function parseAnuncio(html: string): IDataObject;
