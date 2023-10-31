import { defineStore } from "pinia";
import { ref } from "vue";
import { getAccessToken, refreshToken } from "../services/auth";

export const useUserStore = defineStore("user", () => {
  //auth
  const token = ref("");

  async function signin() {
    try {
      const res = await getAccessToken();

      if (!res) return;
      setTokens(res);

      setInterval(async () => {
        const res = await refreshToken();
        setTokens(res);
      }, 10 * 60 * 1000);
    } catch (error) {
      console.log(error);
    }
  }

  async function refresh() {
    const res = await refreshToken();
    setTokens(res);
  }

  function signout() {
    chrome.storage.local.remove(["token"]);
    setTokens({ access_token: "", refresh_token: "" });
  }

  async function setTokens(input: {
    access_token: string;
    refresh_token: string;
  }) {
    const fullToken = input.access_token ? "Bearer " + input.access_token : "";
    token.value = fullToken;

    await chrome.storage.local.set({
      token: fullToken,
      refresh_token: input.refresh_token,
    });
  }

  return {
    token,
    signout,
    signin,
    refresh,
  };
});
