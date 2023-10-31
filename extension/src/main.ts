import { createApp } from "vue";
import { createRouter, createWebHashHistory } from "vue-router";
import "./style.css";
import App from "./App.vue";
import { createPinia } from "pinia";
import home from "./pages/home.vue";

const routes = [
  { path: "/", component: home },
  { path: "/settings", component: () => import("./pages/settings.vue") },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

const app = createApp(App);
const pinia = createPinia();

app.use(router);
app.use(pinia);

app.mount("#app");
