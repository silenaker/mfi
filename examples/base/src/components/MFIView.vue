<template>
  <div ref="container" v-loading="loading" class="mfi-container"></div>
</template>

<script>
import { ServiceLoader } from "mfi";

export default {
  name: "MFIView",

  data() {
    return {
      loading: false
    };
  },

  mounted() {
    if (this.$route.meta.url) {
      this.load(this.$route.meta.url);
    }
  },

  methods: {
    load(url) {
      this.loader = new ServiceLoader(url, this.$refs.container);
      this.loader.on("loading", () => {
        this.loading = true;
      });
      this.loader.on("load", () => {
        this.loading = false;
      });
    }
  },

  watch: {
    $route(to) {
      this.loader && this.loader.close({ immediate: true });
      this.load(to.meta.url);
    }
  }
};
</script>
<style>
.mfi-container {
  flex: 1;
}
</style>
