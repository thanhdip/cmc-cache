<template>
  <v-card>
    <v-container>
      <v-row align="start">
        <v-col align="center" cols="12">
          <v-autocomplete
            v-model="coins"
            :items="allCoins"
            outlined
            chips
            small-chips
            label="Enter Coins"
            multiple
          ></v-autocomplete>
        </v-col>

        <v-col align="center" cols="12">
          <v-menu
            ref="startDatePicker"
            v-model="startDatePickerOpen"
            :close-on-content-click="false"
            :return-value.sync="startDate"
            transition="scale-transition"
            offset-y
            min-width="auto"
          >
            <template v-slot:activator="{ on, attrs }">
              <v-text-field
                v-model="startDate"
                label="Start Date"
                prepend-icon="mdi-calendar"
                readonly
                v-bind="attrs"
                v-on="on"
              ></v-text-field>
            </template>
            <v-date-picker
              v-model="startDate"
              :max="maxDate"
              no-title
              scrollable
            >
              <v-spacer></v-spacer>
              <v-btn text color="primary" @click="startDatePickerOpen = false">
                Cancel
              </v-btn>
              <v-btn
                text
                color="primary"
                @click="$refs.startDatePicker.save(startDate)"
              >
                OK
              </v-btn>
            </v-date-picker>
          </v-menu>
        </v-col>

        <v-col align="center" cols="12">
          <v-menu
            ref="endDatePicker"
            v-model="endDatePickerOpen"
            :close-on-content-click="false"
            :return-value.sync="endDate"
            transition="scale-transition"
            offset-y
            min-width="auto"
          >
            <template v-slot:activator="{ on, attrs }">
              <v-text-field
                v-model="endDate"
                label="End Date"
                prepend-icon="mdi-calendar"
                readonly
                v-bind="attrs"
                v-on="on"
              ></v-text-field>
            </template>
            <v-date-picker v-model="endDate" :max="maxDate" no-title scrollable>
              <v-spacer></v-spacer>
              <v-btn text color="primary" @click="endDatePickerOpen = false">
                Cancel
              </v-btn>
              <v-btn
                text
                color="primary"
                @click="$refs.endDatePicker.save(endDate)"
              >
                OK
              </v-btn>
            </v-date-picker>
          </v-menu>
        </v-col>
        <v-col align="center" cols="12">
          <v-btn elevation="2" @click="updateCache">Update Cache</v-btn>
          <v-btn elevation="2" @click="generateExcel">Generate Excel</v-btn>
        </v-col>
      </v-row>
    </v-container>
  </v-card>
</template>

<script lang="ts">
import Vue from "vue";

export default Vue.extend({
  name: "UpdatePage",
  data: () => ({
    allCoins: [
      "[BTC] Bitcoin",
      "[LTC] Litecoin",
      "[ETH] Ethereum",
      "[LINK] Chainlink",
    ],
    coins: [],
    maxDate: new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
      .toISOString()
      .substr(0, 10),
    startDate: new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
      .toISOString()
      .substr(0, 10),
    endDate: new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
      .toISOString()
      .substr(0, 10),
    startDatePickerOpen: false,
    endDatePickerOpen: false,
  }),
  methods: {
    print: function () {
      console.log("Test print:");
      console.log(this.coins);
      console.log(this.startDate);
      console.log(this.endDate);
    },
    updateCache: function () {
      console.log("Sending update cache signal.");
      const payload = {
        coins: this.coins,
        startDate: this.startDate,
        endDate: this.endDate,
      };
      (window as any).ipc.send("update-cache", payload);
    },
    generateExcel: function () {
      console.log("Send generate excel signal.");
      const payload = {
        coins: this.coins,
        startDate: this.startDate,
        endDate: this.endDate,
      };
      (window as any).ipc.send("generate-excel", payload);
    },
  },
  mounted() {
    this.$nextTick(function () {
      (window as any).ipc.send("all-coin-data");
      (window as any).ipc.send("get-saved-data");
      window.addEventListener("beforeunload", () => {
        (window as any).ipc.send("save-data", [this.coins, this.startDate]);
      });
    });
    (window as any).ipc.on("all-coin-data", (payload: any) => {
      this.allCoins = payload;
    });
    (window as any).ipc.on("get-saved-data", (payload: any) => {
      console.log("SAVED DATA");
      console.log(payload);
      this.coins = payload["coins"];
      this.startDate = payload["startDate"];
    });
  },
  updated() {},
  beforeDestroy() {
    (window as any).ipc.removeAllListeners("all-coin-data");
  },
});
</script>

<style>
.v-btn {
  margin: 5px;
}
</style>
