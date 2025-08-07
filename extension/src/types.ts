export type Derivative = {
  name: string;
  guid: string;
  role: string;
  urn: string;
  sets: string | string[];
  children: Derivative[];
  active: boolean;
};

export type PdfSet = {
  name: string;
  active: boolean;
};

export type DownloadObject = {
  urn: string;
  derivatives: string[];
  token: string;
  options: {
    includeMarkups: boolean;
  };
};

export type APSDerivative = {
  guid: string;
  name: string;
  role: string;
  urn: string;
  ViewSets: string[];
  properties?: {
    "Print Setting": string;
  };
  children: APSDerivative[];
};

export interface APSDocumentInformation {
  Author: string;
  "Building Name": string;
  "Client Name": string;
  "Organization Description": string;
  "Organization Name": string;
  "Project Address": string;
  "Project Issue Date": string;
  "Project Name": string;
  "Project Number": string;
  "Project Status": string;
  RVTVersion: string;
}

export type APSDerivativeWrapper = {
  name: string;
  children: APSDerivative[];
  extractorVersion?: string;
  messages?: object[];
  properties: {
    "Document Information": APSDocumentInformation;
    status: string;
  };
};

export type APSManifest = {
  derivatives: APSDerivativeWrapper[];
  urn: string;
};

export enum Platform {
  BIM360,
  ACC,
}
