<template>
  <div class="overflow-x-hidden">
    <SettingsSectionWrapper title="General"> TODO </SettingsSectionWrapper>
    <SettingsSectionWrapper title="Naming"> TODO </SettingsSectionWrapper>
    <SettingsSectionWrapper title="Export"> TODO </SettingsSectionWrapper>

    <div class="w-full flex justify-between pt-2">
      <button
        class="border-2 px-2 py-1 h-8 flex items-center justify-center rounded-full hover:bg-indigo-800 transition-all duration-300 ease-in-out"
        @click="router.push('/')"
      >
        Go back
      </button>
      <button
        class="border-2 px-2 py-1 h-8 flex items-center justify-center rounded-full hover:bg-indigo-800 transition-all duration-300 ease-in-out"
        @click="signout"
      >
        Sign out
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import SettingsSectionWrapper from "../components/SettingsSectionWrapper.vue";
import { useUserStore } from "../stores/user";

const userStore = useUserStore();
const router = useRouter();

function signout() {
  userStore.signout();
  router.push("/");
}
</script>

<style scoped></style>
