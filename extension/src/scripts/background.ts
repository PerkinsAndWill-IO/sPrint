import { PortMessage, PortName, PortResponse } from "../constants/port";
import { exportDerivatives } from "../services/aws";
import { Derivative, DownloadObject, Platform } from "../types";

interface APSTabInfo {
  tabId: number;
  urn: string;
}

const tabsInfo: APSTabInfo[] = [];

//listen => find a URN
chrome.webRequest.onBeforeSendHeaders.addListener(
  function onBeforeSendHeaders(
    details: chrome.webRequest.WebRequestHeadersDetails
  ) {
    const urn = details.url.split("manifest/")[1]?.split("?")[0];
    updateAPSTabsInfo(details.tabId, urn);

    //set urn from the active tab
    chrome.storage.local.set({ urn: urn }, function () {
      console.log("Urn saved: " + urn);
    });

    //set tab ui - add button
    let tab: chrome.tabs.Tab;
    chrome.tabs.get(details.tabId, function (t) {
      tab = t;
      udpateTabUI(tab, details.tabId);
    });
  },
  { urls: ["https://cdn.derivative.autodesk.com/modeldata/manifest/*"] },
  ["requestHeaders"]
);

//cet URN on tab change
chrome.tabs.onActivated.addListener(function (activeInfo) {
  const tabInfo = tabsInfo.find((t) => t.tabId === activeInfo.tabId);

  if (tabInfo?.urn) {
    chrome.storage.local.set({ urn: tabInfo?.urn }, function () {
      console.log("Urn set: " + tabInfo?.urn);
    });
  }
});

//inject a button
function udpateTabUI(
  tab: chrome.tabs.Tab | chrome.tabs.TabChangeInfo,
  tabId: number
) {
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

//open a new port to communicate with the popup
chrome.runtime.onConnect.addListener(async function (port) {
  if (port.name != PortName.SPRINT) return;

  port.onMessage.addListener(async function (msg) {
    if (msg.message === PortMessage.EXPORT) {
      const modelName = msg.modelName;

      console.log("modelname", modelName, msg);

      await exportInBackground(port, modelName);
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
    tabsInfo.push({
      tabId,
      urn,
    });
  }
}

async function exportInBackground(
  port: chrome.runtime.Port,
  modelName: string
) {
  try {
    let derivatives: Derivative[];

    const obj = await chrome.storage.local.get(["derivatives"]);
    const filename = modelName + ".zip";

    derivatives = JSON.parse(obj.derivatives) as Derivative[];

    const { token } = await chrome.storage.local.get(["token"]);
    const { urn } = await chrome.storage.local.get(["urn"]);

    if (!token) return;
    const res = await exportDerivatives(derivatives, urn, token);

    if (!res) return;
    const { url } = res;

    await chrome.downloads.download({
      url,
      filename,
      conflictAction: "uniquify",
    });

    alert("Downloading of your PDF has started: " + filename);

    port.postMessage({ message: PortResponse.EXPORTED, error: false });
  } catch (error) {
    port.postMessage({ message: error, error: true });
  }
}
