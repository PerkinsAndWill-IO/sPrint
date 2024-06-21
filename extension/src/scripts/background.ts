import { PortMessage, PortName, PortResponse } from "../constants/port";
import { exportDerivatives } from "../services/aws";
import { Derivative, Platform } from "../types";

interface APSTabInfo {
  tabId: number;
  urn: string;
}

const tabsInfo: APSTabInfo[] = [];

let keepAliveInterval: number | undefined;

const keepAlive = (state: boolean) => {
  if (state && !keepAliveInterval) {
    keepAliveInterval = setInterval(() => {
      chrome.runtime.getPlatformInfo();
      console.log("Keep alive");
    }, 1000);
  } else if (!state && keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = undefined;
  }
};

// Listen for manifest URL requests to update tab info
chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    const urn = details.url.split("manifest/")[1]?.split("?")[0];
    updateAPSTabsInfo(details.tabId, urn);

    // Store the URN locally
    chrome.storage.local.set({ urn: urn }, () => {
      console.log("Urn saved: " + urn);
    });

    // Update tab UI
    chrome.tabs.get(details.tabId, (tab) => {
      udpateTabUI(tab, details.tabId);
    });
  },
  { urls: ["https://cdn.derivative.autodesk.com/modeldata/manifest/*"] },
  ["requestHeaders"]
);

// Update URN on tab activation
chrome.tabs.onActivated.addListener((activeInfo) => {
  const tabInfo = tabsInfo.find((t) => t.tabId === activeInfo.tabId);

  if (tabInfo?.urn) {
    chrome.storage.local.set({ urn: tabInfo.urn }, () => {
      console.log("Urn set: " + tabInfo.urn);
    });
  }
});

// Inject a button based on URL pattern
function udpateTabUI(tab: chrome.tabs.Tab, tabId: number) {
  const bim360regexp = new RegExp(
    "https://docs.b360.autodesk.com/projects/.*/folders/.*/detail/viewer/items/.*"
  );
  const accRegexp = new RegExp(
    "https://acc.autodesk.com/docs/files/projects/.*"
  );

  if (!tab.url) return;

  if (bim360regexp.test(tab.url)) {
    console.log(`URL BIM360 pattern`);
    chrome.tabs.sendMessage(tabId, {
      message: Platform.BIM360,
      url: tab.url,
    });
  } else if (accRegexp.test(tab.url) && tab.url.includes("viewableGuid")) {
    console.log(`URL ACC pattern`);
    chrome.tabs.sendMessage(tabId, {
      message: Platform.ACC,
      url: tab.url,
    });
  } else {
    console.log(`URL unknown pattern`);
  }
}

// Open a port for communication with the popup
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== PortName.SPRINT) return;

  port.onMessage.addListener(async (msg) => {
    if (msg.message === PortMessage.EXPORT) {
      const modelName = msg.modelName;

      try {
        keepAlive(true);
        await exportInBackground(port, modelName);
      } catch (error) {
        console.error(error);
      } finally {
        keepAlive(false);
      }
    }
  });
});

function alert(msg: string) {
  chrome.notifications.create({
    iconUrl: "icons/128.png",
    type: "basic",
    message: msg,
    title: "Let's go!",
  });
}

function updateAPSTabsInfo(tabId: number, urn: string) {
  const tabInfo = tabsInfo.find((t) => t.tabId === tabId);
  if (tabInfo) {
    tabInfo.urn = urn;
  } else {
    tabsInfo.push({ tabId, urn });
  }
}

async function exportInBackground(
  port: chrome.runtime.Port,
  modelName: string
) {
  try {
    const { derivatives } = await chrome.storage.local.get("derivatives");
    const filename = `${modelName}.zip`;

    const parsedDerivatives = JSON.parse(derivatives) as Derivative[];
    const { token, urn } = await chrome.storage.local.get(["token", "urn"]);

    if (!token || !urn) return;
    const res = await exportDerivatives(parsedDerivatives, urn, token);

    if (!res) return;
    const { url } = res;

    await chrome.downloads.download({
      url,
      filename,
      conflictAction: "uniquify",
    });

    alert(`Downloading of your PDF has started: ${filename}`);
    port.postMessage({ message: PortResponse.EXPORTED, error: false });
  } catch (error) {
    port.postMessage({ message: error, error: true });
  }
}
