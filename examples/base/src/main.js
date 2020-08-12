import Vue from "vue";
import Router from "vue-router";
import ElementUI from "element-ui";
import App from "./App.vue";
import routes from "./routes";
import "normalize.css/normalize.css";
import "element-ui/lib/theme-chalk/index.css";

Vue.config.productionTip = false;

Vue.use(Router);
Vue.use(ElementUI);

const router = new Router({ routes });

new Vue({
  render: h => h(App),
  router
}).$mount("#app");
