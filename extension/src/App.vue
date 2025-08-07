<template>
  <main class="bg-slate-900 text-white max-w-sm w-96">
    <div>
      <div class="flex items-center justify-between space-x-4 p-4 sticky">
        <span class="flex items-center">
          <TheLogo />
        </span>
        <div class="flex space-x-2">
          <button
            class="border-2 px-2 py-1 w-14 h-8 flex items-center justify-center rounded-full hover:bg-indigo-800 transition-all duration-300 ease-in-out"
            @click="exportPdfs"
            v-if="token"
            :disabled="isProcessing"
          >
            <ArrowPathIcon class="w-5 h-5 animate-spin" v-if="isProcessing" />
            <h2 v-else>Export</h2>
          </button>
        </div>
      </div>
    </div>

    <div class="h-[30rem] overflow-y-scroll p-2">
      <div class="bg-slate-800 rounded-t-2xl h-full">
        <div
          v-if="!token && !isLoading"
          class="w-full h-full flex items-center justify-center"
        >
          <button
            @click="userStore.signin"
            class="rounded-full border-2 bg-white group text-slate-800 h-8 flex items-center px-2 space-x-2"
          >
            <p class="group-hover:scale-105 transition w-44">
              Sign-in with Speckle account
            </p>
            <img
              class="w-4 h-4"
              :src="'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAAAAABWESUoAAAAnElEQVR4AWP4TwAMUgUrxRkQQAtDwWM3BlSAJt/Jw4BPwUktoAhuBZ+yGLAAJMdJM+BT8NibATtAOA6fgksmDDgBFsdJ28MBWMEWNMeVfEM4PJSBAd1xJpeQggVkM6rjeKYipN+kYDoo9BlCfqoghrT0FvyBXvINr+lmSI5bCXYYhuMQ+nE4DmE/dschwFFMx6EpwAg5fAqGRNYDALpzWU8T8jGAAAAAAElFTkSuQmCC'"
            />
          </button>
        </div>
        <div
          class="w-full h-full flex items-center justify-center"
          v-else-if="isLoading"
        >
          <TheSpiner />
        </div>

        <template v-else>
          <router-view v-slot="{ Component }">
            <Transition
              mode="out-in"
              enterActiveClass="transition ease-out duration-200"
              enterFromClass=" opacity-0"
              enterToClass="opacity-100"
              leaveActiveClass="transition ease-in duration-200"
              leaveFromClass="opacity-100"
              leaveToClass=" opacity-0"
            >
              <component class="bg-slate-800 rounded-t-2xl" :is="Component" />
            </Transition>
          </router-view>
        </template>
      </div>
    </div>
  </main>
</template>
<script setup lang="ts">
import { computed, onBeforeMount, onMounted, ref, watch } from "vue";
import { ArrowPathIcon } from "@heroicons/vue/24/solid";
import { APSManifest } from "./types";
import TheLogo from "./components/TheLogo.vue";
import TheSpiner from "./components/TheSpiner.vue";
import { useDerivativesStore } from "./stores/derivatives";
import { getModelManifest } from "./services/aps";
import { PortName, PortResponse } from "./constants/port";
import { useUserStore } from "./stores/user";

const derivativesStore = useDerivativesStore();
const userStore = useUserStore();

const token = computed(() => userStore.token);
const error = ref("");
const isProcessing = ref(false);
const isLoading = ref(false);

let manifest: APSManifest;
let port: chrome.runtime.Port;

onBeforeMount(() => {
  isLoading.value = true;
});

onMounted(async () => {
  isLoading.value = true;
  connectToBackgroundScript();

  const { refresh_token } = await getItemFromLocalStorage("refresh_token");

  if (refresh_token) {
    userStore.refresh();
  }

  await setModelInfo();

  isLoading.value = false;
});

watch(token, async (token: string) => {
  if (!token) return;
  await setModelInfo();
});

async function exportPdfs() {
  isProcessing.value = true;

  await chrome.storage.local.set({
    derivatives: JSON.stringify(derivativesStore.filteredDerivatives),
  });

  port.postMessage({
    message: "export",
    modelName: derivativesStore.modelName,
  });
}

async function setModelInfo() {
  const { token } = await getItemFromLocalStorage("token");
  const { urn } = await getItemFromLocalStorage("urn");
  console.log("urn", urn);

  if (!urn || !token) return;
  const res = await getModelManifest(urn, token);

  if (!res) return;
  manifest = res.data;
  error.value = res.error ?? "";

  derivativesStore.setModelInfoFromManifest(manifest);
}

async function getItemFromLocalStorage(key: string) {
  return await chrome.storage.local.get([key]);
}

function connectToBackgroundScript() {
  port = chrome.runtime.connect({ name: PortName.SPRINT });
  port.onMessage.addListener(async function (msg) {
    if (msg.message === PortResponse.EXPORTED) {
      isProcessing.value = false;
    }
  });
}

chrome.storage.onChanged.addListener(function (data: any) {
  if (data.urn) {
    console.log("urn changed", data.urn.newValue);
    derivativesStore.urn = data.urn.newValue;
  }
});
</script>
<style scoped>
/* removes chrome autocomplete bg */
input:-webkit-autofill,
input:-webkit-autofill:hover,
input:-webkit-autofill:focus,
input:-webkit-autofill:active {
  -webkit-box-shadow: 0 0 0 30px white inset !important;
}

/* Hide scrollbar for Chrome, Safari and Opera */
.no-scrollbar::-webkit-scrollbar {
  display: none;
}

.no-scrollbar {
  -ms-overflow-style: none; /* IE and Edge */
  scrollbar-width: none; /* Firefox */
}

/* scrollbar */
* {
  scrollbar-width: auto;
  scrollbar-color: #c7c7c7 #ffffff;
}

/* Chrome, Edge, and Safari */
*::-webkit-scrollbar {
  width: 6px;
}

*::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.261);
  border-radius: 10px;
}
</style>
