import { defineStore } from "pinia";
import { computed, ref } from "vue";
import {
  APSDerivativeWrapper,
  Derivative,
  APSDerivative,
  APSManifest,
  PdfSet,
} from "../types";

export const useDerivativesStore = defineStore("derivatives", () => {
  //model
  const urn = ref("");
  const version = ref();
  const modelName = ref("");

  //derivatvies
  const derivatives = ref<Derivative[]>([]);
  const pdfSets = ref<PdfSet[]>([]);

  //error
  const error = ref("");

  //only active derivatives
  const filteredDerivatives = computed<Derivative[]>(() =>
    derivatives.value.filter((d) => d.active)
  );

  function setModelInfoFromManifest(manifest: APSManifest) {
    modelName.value = manifest.derivatives[0].name;
    derivatives.value = mapModelPdfDerivatives(
      manifest.derivatives[0].children
    );
    pdfSets.value = [
      ...new Set(derivatives.value.map((d) => d.sets).flat()),
    ].map((s) => ({ name: s, active: true }));

    const isValid = checkRevitVersion(manifest.derivatives[0]);

    if (!isValid) {
      error.value = "Model's Revit version is not supported";
    }
  }

  function mapModelPdfDerivatives(derivatives: APSDerivative[]): Derivative[] {
    const mappedDerivatives = derivatives.map(({ ViewSets, children }) => {
      const pdfFileDerivative = children?.find((d) => d.role == "pdf-page");
      if (!pdfFileDerivative) return null;
      return {
        active: true,
        sets: ViewSets,
        guid: pdfFileDerivative.guid,
        role: pdfFileDerivative.role,
        urn: pdfFileDerivative.urn,
        name: pdfFileDerivative.urn
          ? pdfFileDerivative.urn.split("/").pop()
          : pdfFileDerivative.name,
        children: pdfFileDerivative.children
          ? mapModelPdfDerivatives(pdfFileDerivative.children)
          : [],
      } as Derivative;
    });

    return mappedDerivatives.filter((d) => d != null) as Derivative[];
  }

  function checkRevitVersion(derivativeWrapper: APSDerivativeWrapper) {
    const revitVersion =
      derivativeWrapper.properties["Document Information"]?.RVTVersion;
    version.value = parseInt(revitVersion);
    return parseInt(revitVersion) >= 2022;
  }

  return {
    derivatives,
    modelName,
    version,
    pdfSets,
    error,
    urn,
    filteredDerivatives,
    setModelInfoFromManifest,
  };
});
