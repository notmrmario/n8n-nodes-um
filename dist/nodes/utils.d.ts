import TurnDown from "turndown";
import type { IDataObject } from "n8n-workflow";
export declare const td: TurnDown;
export declare const regex_adjuntos: RegExp;
export declare function extraerCampo(html: string, nombreCampo: string): string | null;
export declare function keys<T extends object>(o: T): (keyof T)[];
export declare function parseTarea(html: string): IDataObject;
export declare function parseAnuncio(html: string): IDataObject;
