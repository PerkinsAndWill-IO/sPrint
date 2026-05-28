# sPrint User Guide

sPrint is a web app that lets you batch-export vector PDFs (and other derivatives) from published Revit models in Autodesk Construction Cloud (ACC) or BIM 360 — in seconds, without leaving your browser.

---

## Getting Started

1. Open sPrint in your browser and click **Sign in with Autodesk**.
2. Authorize sPrint to access your ACC / BIM 360 account.
3. You land on the dashboard, ready to browse your projects.

---

## Exporting PDFs

### 1. Find Your Model

The project tree on the left shows your ACC / BIM 360 hubs and projects. Click through:

**Hub → Project → Folder → .RVT file**

Use the search bar to filter Revit files by name.

### 2. Select Sheets or View Sets

Click a `.RVT` file to open its published sheets and derivatives. From here you can:

- Search sheets by name or number
- Filter by format (PDF, DWG, IFC, etc.)
- Select individual sheets or entire view sets
- Preview a sheet before selecting it

The **Selected Files** panel on the right shows everything queued for export.

### 3. Configure Export Options

Before downloading, choose how to package your export:

| Option | Description |
|--------|-------------|
| **Merge** | Combine sheets into a single PDF, one per model, or keep separate |
| **Zip output** | Bundle all files into a single `.zip` download |
| **Model folders** | Organize downloaded files into per-model subfolders |

### 4. Export

Click **Export** to download your selected files. Large exports are packaged automatically.

---

## Tips

- **Multi-model exports:** Select sheets from multiple `.RVT` files before exporting — they all queue in the Selected Files panel.
- **View sets:** Selecting a view set selects all sheets within it. Deselect individual sheets to exclude them.
- **Preview:** Click any sheet thumbnail to open a full preview before adding it to your export queue.

---

## FAQ

**What file formats can I export?**
PDFs are the primary format. sPrint also supports DWG, IFC, and other published derivatives depending on what your model has been published with.

**My project isn't showing up. What do I do?**
Make sure you have at least Viewer access to the project in ACC / BIM 360. If your hub is not listed, use the **Add Hub** option in the project tree.

**Sheets are missing or outdated.**
sPrint shows derivatives from the most recently published version of your model. If sheets are missing, check that the model has been published in ACC / BIM 360 and that the publish job completed successfully.

**The export is taking a long time.**
Large exports with many sheets can take a minute to package. Keep the browser tab open until the download starts. If it stalls, try exporting in smaller batches.

**Can I export from multiple projects at once?**
Yes. Navigate between projects and add sheets to your queue. The Selected Files panel tracks everything across projects until you export.

**I don't see the PDF option for my model.**
PDFs are only available if your Revit model was published with 2D views. If only 3D is published, you will see IFC and other 3D derivative options instead.
