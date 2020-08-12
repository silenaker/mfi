import Vue from "vue";
import App from "./App.vue";
import { Service } from "mfi";

new Service();

Vue.config.productionTip = false;

new Vue({
  render: h => h(App)
}).$mount("#app");
