import { DownloaderHelper } from "node-downloader-helper";
import { Derivative, DownloadObject } from "../app";


export async function downloadDerivatives(outputPath: string, urn: string, derivatives: string[], token: string): Promise<string[]> {
  try {
    const downloadObjectPromises: Promise<DownloadObject>[] = [];
    for (const derivative of derivatives) {
      const promise = getSignedUrlFromDerivative(urn, derivative, token);
      
      downloadObjectPromises.push(promise);
    }

    const downloadObjects = await Promise.all(downloadObjectPromises);
    

    const fileNamePromises: Promise<string>[] = [];
    for (const downloadObject of downloadObjects) {
      const fileNamePromise = downloadFile(downloadObject, outputPath);
      fileNamePromises.push(fileNamePromise);
    }
    
    const fileNames = await Promise.all(fileNamePromises);
    return fileNames
  } catch (error) {
    throw error;
  }
}


 async function getSignedUrlFromDerivative(urn: string, derivative: string, token: string) {
    try {
        const url = `https://developer.api.autodesk.com/modelderivative/v2/designdata/${urn.replaceAll(
            '=',
            '',
        )}/manifest/${derivative}/signedcookies?useCdn=true`;

        const options = {
            method: 'GET',
            headers: {
                Authorization: token,
            },
        };

        const res = await fetch(url, options);
        const resJSON = await res.json();
        if(!resJSON.url) throw new Error('No signed url');
        
        
        const cookieHeader = res.headers.get('set-cookie');
        if (!cookieHeader) throw new Error('No cookie header');

        const cookies = cookieHeader.split(', ');

        const policy = cookies[0].split('=')[1].split(';')[0];
        const keypair = cookies[1].split('=')[1].split(';')[0];
        const signature = cookies[2].split('=')[1].split(';')[0];

        const data = {
            name: derivative.split('/').slice(-1)[0],
            url: resJSON.url,
            'CloudFront-Policy': policy,
            'CloudFront-Key-Pair-Id': keypair,
            'CloudFront-Signature': signature,
        };

        return data;
    } catch (error) {
        throw error;
    }
}

 async function downloadFile(
    downloadObject: DownloadObject,
    outputPath: string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const url = `${downloadObject.url}?Policy=${downloadObject["CloudFront-Policy"]}&Key-Pair-Id=${downloadObject["CloudFront-Key-Pair-Id"]}&Signature=${downloadObject["CloudFront-Signature"]}`;
      const dl = new DownloaderHelper(url, outputPath, {
        fileName: downloadObject.name,
      });
  
      dl.on("end", () => {
        console.log("Resolved: ", downloadObject.name);
        
        resolve(downloadObject.name);
      });
      dl.start().catch((err) => reject(err));
    });
  }

  