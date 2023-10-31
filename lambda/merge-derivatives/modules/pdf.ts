import PDFMerger from "pdf-merger-js";

export async function mergePdfs(fileNames: string[], path: string){
    const  merger = new PDFMerger();

    for (const name of fileNames) {
        if(!name.includes('.pdf')) continue;
        await merger.add(path + name);
    }

    await merger.save(path + 'output.pdf');
}