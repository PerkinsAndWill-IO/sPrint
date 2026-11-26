declare namespace Autodesk {
  namespace Viewing {
    interface InitializerOptions {
      env?: string
      api?: string
      getAccessToken?: (onTokenReady: (token: string, expires: number) => void) => void
    }

    function Initializer(options: InitializerOptions, callback: () => void): void

    // Viewer 7.109.1+; absent on older builds
    const FeatureFlags: { set(name: string, value: boolean): void } | undefined

    class Document {
      static load(
        documentId: string,
        onSuccess: (doc: Document) => void,
        onError: (errorCode: number, errorMsg: string) => void
      ): void
      getRoot(): BubbleNode
    }

    class BubbleNode {
      getDefaultGeometry(): BubbleNode | null
    }

    class GuiViewer3D {
      constructor(container: HTMLElement, config?: object)
      start(): number
      finish(): void
      loadDocumentNode(doc: Document, node: BubbleNode): Promise<void>
    }
  }
}
