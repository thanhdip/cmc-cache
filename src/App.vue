<template>
  <v-app>
    <v-app-bar dense max-height="60">
      <v-toolbar-title>CMC Historical Data</v-toolbar-title></v-app-bar
    >
    <v-divider />
    <v-main> <update-page /> </v-main>
  </v-app>
</template>

<script lang="ts">
import Vue from "vue";
import UpdatePage from "./components/UpdatePage.vue";

export default Vue.extend({
  name: "App",

  components: {
    UpdatePage,
  },

  data: () => ({
    //
  }),
});
</script>
