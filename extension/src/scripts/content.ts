import { getModelManifest } from "../services/aps";
import { useDerivativesStore } from "../stores/derivatives";
import { Platform } from "../types";

console.log("sPRINT is running!");
let platform: Platform;

chrome.runtime.onMessage.addListener(function (request) {
  if (request.message === Platform.ACC) {
    platform = Platform.ACC;
    console.log("sPRINT ACC");
  } else if (request.message === Platform.BIM360) {
    platform = Platform.BIM360;
    console.log("sPRINT BIM360");
  } else {
    return;
  }

  // observeElementLoad();
});

let button: HTMLButtonElement;

// function executeWhenElementLoaded() {
//   const element = document.querySelector(
//     '[data-testid="BimViewerHeaderInfoSection"]'
//   );

//   if (element) {
//     button = document.createElement("button");

//     button.innerText = "Export All Pdfs!";
//     button.style.border = "1px solid white";
//     button.style.backgroundColor = "transparent";
//     button.style.color = "white";
//     button.style.padding = "4px 8px";
//     button.style.fontSize = "13px";
//     button.style.cursor = "pointer";

//     element.appendChild(button);
//     button.addEventListener("click", onButtonClick);
//   }
// }

// function observeElementLoad() {
//   console.log("Observing element load");

//   const observer = new MutationObserver(async (mutationsList) => {
//     for (const mutation of mutationsList) {
//       if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
//         for (const addedNode of mutation.addedNodes) {
//           if (
//             addedNode instanceof Element &&
//             addedNode.hasAttribute("data-testid")
//           ) {
//             const attributeValue = addedNode.getAttribute("data-testid");

//             if (attributeValue != "BimViewer") return;

//             // Element is added to the DOM, execute the function
//             executeWhenElementLoaded();
//             // Stop observing once the element is loaded
//             observer.disconnect();
//             return;
//           }
//         }
//       }
//     }
//   });

//   observer.observe(document.body, { childList: true, subtree: true });
// }

// async function onButtonClick() {
//   disableButton();
//   let token = "";
//   let urn = "";

//   chrome.storage.local.get(["token"], function (result) {
//     token = result.token;
//     if (!token) return alert("Please login to your account first!");
//     console.log("Token currently is " + result.token);
//   });

//   chrome.storage.local.get(["urn"], async (result) => {
//     urn = result.urn;

//     //cant use store here
//     const store = useDerivativesStore();
//     console.log("Urn currently is " + result.urn);

//     if (!urn || !token) return;

//     const manifest = await getModelManifest(urn, token);
//     // store.setDerivativesFromManifest(manifest);

//     //TODO: send it to background
//     // exportDerivatives(store.derivatives);
//     enableButton();
//   });
// }

// function disableButton() {
//   button.disabled = true;
//   button.style.borderColor = "rgb(129, 144, 153)";
//   button.style.color = "rgb(129, 144, 153)";
// }

// function enableButton() {
//   button.disabled = false;
//   button.style.borderColor = "rgb(255,255,255)";
//   button.style.color = "rgb(255,255,255)";
// }

// observeElementLoad();
