<template>
  <div ref="container" v-loading="loading" class="mfei-container"></div>
</template>

<script>
import { ServiceLoader } from "mfei";

export default {
  name: "MFEIView",
  data() {
    return {
      loading: false,
    };
  },
  mounted() {
    if (this.$route.meta.url) {
      this.load(this.$route.meta.url);
    }
  },
  methods: {
    load(url) {
      // init service loader
      this.loader = new ServiceLoader(url, {
        container: this.$refs.container,
        // register custom response handlers
        responseHandlers: {
          customize: () => {
            return 'hello, you received "customize" type response';
          },
        },
      });

      this.loader.on("error", (err) => this.$message.error(err.toString()));
      this.loader.on("loading", () => (this.loading = true));
      this.loader.on("load", () => {
        this.loading = false;

        // send request messages
        this.loader
          .postMessage("hello")
          .then((data) => this.$message.info(data.msg));
        this.loader
          .postMessage("getSecretInfo", { token: "secret-token-from-host" })
          .then((data) => this.$message.info(data.secret))
          .catch((err) => this.$message.error(err.toString()));
        this.loader
          .postMessage("getToken")
          .then((data) => this.$message.info(data.token))
          .catch((err) => this.$message.error(err.toString()));
        this.loader
          .postMessage("customizedTypeRequestHandler")
          .then((data) => this.$message.info(data))
          .catch((err) => this.$message.error(err.toString()));
      });
    },
  },
  watch: {
    $route(to) {
      this.loader && this.loader.close({ immediate: true });
      this.load(to.meta.url);
    },
  },
};
</script>

<style>
.mfei-container {
  flex: 1;
}
</style>
