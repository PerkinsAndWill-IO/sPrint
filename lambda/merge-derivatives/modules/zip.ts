import AdmZip from 'adm-zip';
import { readFile } from 'fs/promises';

export async function zipFiles(filesNames: string[], path: string, outputName: string): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      const zip = new AdmZip();
      
      let counter = 0;      
      console.log('LENGTH: ', filesNames.length);
      
      for (const fileName of filesNames) {
        const filePath = path + fileName;

        counter++;
        console.log(`Adding ${filePath} to zip`);

        const fileBuffer = await readFile(filePath);

        if(fileBuffer)
        zip.addFile(fileName, fileBuffer);
      }

      zip.writeZip(path + outputName, (err) => {
        if (err) {
          reject(err);
        } else {
        console.log(`Zipped ${counter} files successfully at ${path}`);
          resolve('done');
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}
