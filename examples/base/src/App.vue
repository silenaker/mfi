<template>
  <div id="app">
    <el-container style="height: 500px; border: 1px solid #eee">
      <el-aside width="200px" style="background-color: rgb(238, 241, 246)">
        <el-menu default-active="1">
          <el-menu-item index="1" @click="navigate('/apple')">
            Apple
          </el-menu-item>
          <el-menu-item index="2" @click="navigate('/mango')">
            Mango
          </el-menu-item>
        </el-menu>
      </el-aside>
      <el-container>
        <MFEIView />
      </el-container>
    </el-container>
  </div>
</template>

<script>
import MFEIView from "./components/MFEIView";

export default {
  name: "App",
  components: {
    MFEIView,
  },

  methods: {
    navigate(path) {
      if (path !== this.$route.path) {
        this.$router.push(path);
      }
    },
  },
};
</script>

<style>
html,
body,
#app {
  width: 100%;
  height: 100%;
}

#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  display: flex;
  flex-flow: column nowrap;
}
</style>
